import pytest
from pydantic import ValidationError
from app.schemas import SetCreate,SetUpdate,WorkoutExerciseUpdate
from app.database import SessionLocal
from app.models import Routine,Exercise,RoutineExercise
from test_domain import owner_client

@pytest.mark.parametrize('field',['reps','load_unit','weight_type','set_type'])
def test_set_updates_reject_explicit_null(field):
    with pytest.raises(ValidationError):SetUpdate(**{field:None})

def test_set_validation_matches_create_and_edit():
    for model in [SetCreate,SetUpdate]:
        for payload in [{'reps':1000},{'reps':0},{'reps':8,'load_value':float('inf')},{'reps':8,'load_value':float('nan')}]:
            with pytest.raises(ValidationError):model(**payload)
    for field in ['position','skipped']:
        with pytest.raises(ValidationError):WorkoutExerciseUpdate(**{field:None})

def test_history_is_read_only_but_explicit_workout_deletion_remains_available():
    with SessionLocal() as db:
        routine=Routine(name='PUSH');exercise=Exercise(name='Safe press');db.add_all([routine,exercise]);db.flush()
        db.add(RoutineExercise(routine_id=routine.id,exercise_id=exercise.id,position=1));db.commit()
    with owner_client() as client:
        workout=client.post('/workouts',json={'routine_id':client.get('/routines').json()[0]['id']}).json()
        item=workout['exercises'][0];record=client.post(f"/workout-exercises/{item['id']}/sets",json={'reps':8,'load_value':50}).json()
        assert client.patch(f"/sets/{record['id']}",json={'reps':9}).status_code==200
        client.post(f"/workouts/{workout['id']}/finish")
        assert client.patch(f"/workout-exercises/{item['id']}",json={'skipped':True}).status_code==409
        assert client.patch(f"/sets/{record['id']}",json={'reps':10}).status_code==409
        assert client.delete(f"/sets/{record['id']}").status_code==409
        assert client.get(f"/workouts/{workout['id']}").json()['exercises'][0]['sets'][0]['reps']==9
        assert client.delete(f"/workouts/{workout['id']}").status_code==204
