from datetime import datetime
from test_domain import owner_client

def test_rest_deadline_is_server_owned_and_recovers_for_warmups():
    from app.database import SessionLocal
    from app.models import Routine, Exercise, RoutineExercise
    with SessionLocal() as db:
        routine=Routine(name='PUSH');exercise=Exercise(name='Timer press')
        db.add_all([routine,exercise]);db.flush()
        db.add(RoutineExercise(routine_id=routine.id,exercise_id=exercise.id,position=1));db.commit()
    with owner_client() as client:
        routine=client.get('/routines').json()[0]
        workout=client.post('/workouts',json={'routine_id':routine['id']}).json()
        assert workout['rest_until'] is None
        item=workout['exercises'][0]
        for kind in ['WORKING','WARMUP']:
            record=client.post(f"/workout-exercises/{item['id']}/sets",json={'reps':8,'set_type':kind}).json()
            recovered=client.get('/workouts/active').json()
            assert (datetime.fromisoformat(recovered['rest_until'])-datetime.fromisoformat(record['created_at'])).total_seconds()==165
            assert recovered['started_at']==workout['started_at']
        assert client.post(f"/workouts/{workout['id']}/rest/skip").json()['rest_until'] is None
        assert client.get('/workouts/active').json()['rest_until'] is None
        client.post(f"/workout-exercises/{item['id']}/sets",json={'reps':9})
        assert client.post(f"/workouts/{workout['id']}/finish").json()['rest_until'] is None
        assert client.post(f"/workouts/{workout['id']}/rest/skip").status_code==409

def test_rest_endpoint_requires_owner():
    from fastapi.testclient import TestClient
    from app.main import app
    from conftest import ORIGIN
    with TestClient(app,headers={'Origin':ORIGIN}) as client:
        assert client.post('/workouts/1/rest/skip').status_code==401
