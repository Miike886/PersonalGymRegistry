import os
os.environ["DATABASE_URL"]="sqlite:///./test_gym.db"
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi.testclient import TestClient
from app.database import SessionLocal
from app.config import settings
from app.main import app
from app.models import Exercise, Routine, Workout, WorkoutExercise, WorkoutSet

def test_health():
    with TestClient(app) as client:
        assert client.get('/health').json() == {'status':'ok'}


def test_production_cors_preflight_skips_token_guard(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "api_token", "quality-gate-token")

    with TestClient(app) as client:
        unauthorized = client.get('/routines', headers={'Origin': 'http://localhost:5173'})
        preflight = client.options('/routines', headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
        })

    assert unauthorized.status_code == 401
    assert unauthorized.headers['access-control-allow-origin'] == 'http://localhost:5173'
    assert preflight.status_code == 200
    assert preflight.headers['access-control-allow-origin'] == 'http://localhost:5173'


def test_completed_workout_detail_includes_sets_and_notes():
    with TestClient(app) as client:
        db = SessionLocal()
        db.query(WorkoutSet).delete()
        db.query(WorkoutExercise).delete()
        db.query(Workout).delete()
        db.query(Exercise).filter(Exercise.name == "Exercise history test").delete()
        db.query(Routine).filter(Routine.name == "HISTORY_TEST").delete()
        db.commit()
        routine = Routine(name="HISTORY_TEST")
        exercise = Exercise(name="Exercise history test")
        db.add_all([routine, exercise])
        db.flush()
        started = datetime.now(timezone.utc) - timedelta(minutes=72)
        workout = Workout(routine_id=routine.id, started_at=started, ended_at=started + timedelta(minutes=72), notes="Buen ritmo")
        db.add(workout)
        db.flush()
        workout_exercise = WorkoutExercise(workout_id=workout.id, exercise_id=exercise.id, exercise_name_snapshot=exercise.name, position=1)
        db.add(workout_exercise)
        db.flush()
        db.add(WorkoutSet(workout_exercise_id=workout_exercise.id, position=1, reps=10, load_value=40, set_type="WORKING"))
        db.commit()
        response = client.get(f'/workouts/{workout.id}')
        db.close()

    assert response.status_code == 200
    assert response.json()['notes'] == 'Buen ritmo'
    assert response.json()['exercises'][0]['sets'][0]['reps'] == 10


def test_last_workout_returns_latest_completed_workout_with_sets():
    with TestClient(app) as client:
        db = SessionLocal()
        db.query(WorkoutSet).delete(); db.query(WorkoutExercise).delete(); db.query(Workout).delete()
        db.query(Exercise).filter(Exercise.name == "Exercise last workout test").delete()
        db.query(Routine).filter(Routine.name == "LAST_WORKOUT_TEST").delete(); db.commit()
        routine = Routine(name="LAST_WORKOUT_TEST"); exercise = Exercise(name="Exercise last workout test")
        db.add_all([routine, exercise]); db.flush()
        started = datetime.now(timezone.utc) - timedelta(days=1)
        workout = Workout(routine_id=routine.id, started_at=started, ended_at=started + timedelta(minutes=45))
        db.add(workout); db.flush()
        item = WorkoutExercise(workout_id=workout.id, exercise_id=exercise.id, exercise_name_snapshot=exercise.name, position=1)
        db.add(item); db.flush()
        db.add(WorkoutSet(workout_exercise_id=item.id, position=1, reps=8, load_value=50, set_type="WORKING"))
        db.commit()
        workout_id = workout.id
        response = client.get(f'/routines/{routine.id}/last-workout')
        db.close()

    assert response.status_code == 200
    assert response.json()['id'] == workout_id
    assert response.json()['exercises'][0]['sets'][0]['load_value'] == 50


def test_active_and_completed_workouts_can_be_deleted_with_children():
    unique = uuid4().hex[:8]
    with TestClient(app) as client:
        db = SessionLocal()
        routine = Routine(name=f"DELETE_{unique}")
        exercise = Exercise(name=f"Exercise delete {unique}")
        db.add_all([routine, exercise]); db.flush()

        active = Workout(routine_id=routine.id)
        completed = Workout(
            routine_id=routine.id,
            ended_at=datetime.now(timezone.utc),
        )
        db.add_all([active, completed]); db.flush()
        item = WorkoutExercise(
            workout_id=active.id,
            exercise_id=exercise.id,
            exercise_name_snapshot=exercise.name,
            position=1,
        )
        db.add(item); db.flush()
        workout_set = WorkoutSet(
            workout_exercise_id=item.id,
            position=1,
            reps=8,
            load_value=40,
            set_type="WORKING",
        )
        db.add(workout_set); db.commit()
        active_id, completed_id = active.id, completed.id
        item_id, set_id = item.id, workout_set.id

        cancel_response = client.delete(f'/workouts/{active_id}')
        delete_response = client.delete(f'/workouts/{completed_id}')
        missing_response = client.delete(f'/workouts/{completed_id}')

        db.expire_all()
        assert cancel_response.status_code == 204
        assert delete_response.status_code == 204
        assert missing_response.status_code == 404
        assert db.get(Workout, active_id) is None
        assert db.get(Workout, completed_id) is None
        assert db.get(WorkoutExercise, item_id) is None
        assert db.get(WorkoutSet, set_id) is None

        db.delete(routine); db.delete(exercise); db.commit(); db.close()
