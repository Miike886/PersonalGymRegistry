import os
os.environ["DATABASE_URL"]="sqlite:///./test_gym.db"
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.database import SessionLocal
from app.main import app
from app.models import Exercise, Routine, Workout, WorkoutExercise, WorkoutSet

def test_health():
    with TestClient(app) as client:
        assert client.get('/health').json() == {'status':'ok'}


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
