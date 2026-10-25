import pytest

from app.database import SessionLocal
from app.models import Exercise, Routine, RoutineExercise
from test_domain import owner_client


@pytest.mark.parametrize('positions,index,target', [((1, 2, 3), 1, 1), ((1, 2, 3), 0, 3), ((1, 1000, 1001), 2, 1)])
def test_reorder_preserves_exercise_ids_sets_and_routine(positions, index, target):
    with SessionLocal() as db:
        routine = Routine(name='PUSH')
        db.add(routine)
        db.flush()
        for number, position in enumerate(positions):
            exercise = Exercise(name=f'Exercise {number}')
            db.add(exercise)
            db.flush()
            db.add(RoutineExercise(routine_id=routine.id, exercise_id=exercise.id, position=position))
        db.commit()
        routine_id = routine.id
    with owner_client() as client:
        workout = client.post('/workouts', json={'routine_id': routine_id}).json()
        original = workout['exercises']
        moved = original[index]
        record = client.post(f"/workout-exercises/{moved['id']}/sets", json={'reps': 8, 'load_value': 30}).json()
        response = client.patch(f"/workout-exercises/{moved['id']}", json={'position': target})
        assert response.status_code == 200
        result = client.get(f"/workouts/{workout['id']}").json()['exercises']
        expected = [item for item in original if item['id'] != moved['id']]
        expected.insert(target - 1, moved)
        assert [item['id'] for item in result] == [item['id'] for item in expected]
        assert [item['position'] for item in result] == [1, 2, 3]
        assert result[target - 1]['sets'][0]['id'] == record['id']
        assert result[target - 1]['exercise_name_snapshot'] == moved['exercise_name_snapshot']
        assert [item['position'] for item in client.get('/routines').json()[0]['exercises']] == list(positions)
