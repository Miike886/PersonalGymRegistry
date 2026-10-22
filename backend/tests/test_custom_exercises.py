import pytest
from pydantic import ValidationError
from app.schemas import WorkoutExerciseCreate
from app.database import SessionLocal
from app.models import Exercise, Routine
from test_domain import owner_client

def test_custom_exercise_validation():
    for payload in [{"name":"  "},{"name":"x"*101},{"name":"New","exercise_id":1},{}]:
        with pytest.raises(ValidationError): WorkoutExerciseCreate(**payload)
    assert WorkoutExerciseCreate(name="  Curl   libre ").name=="Curl libre"

def test_free_exercise_is_catalogued_reused_and_snapshotted():
    with SessionLocal() as db:
        routine=Routine(name="FREE");db.add(routine);db.commit();routine_id=routine.id
    with owner_client() as client:
        workout=client.post("/workouts",json={"routine_id":routine_id}).json()
        first=client.post(f"/workouts/{workout['id']}/exercises",json={"name":"  Curl   especial ","load_convention":"PER_HAND"})
        assert first.status_code==201
        item=first.json()
        assert item["exercise_name_snapshot"]=="Curl especial"
        second=client.post(f"/workouts/{workout['id']}/exercises",json={"name":"curl especial"})
        assert second.json()["exercise_id"]==item["exercise_id"]
        with SessionLocal() as db:
            assert db.query(Exercise).count()==1
            assert db.get(Exercise,item["exercise_id"]).load_convention=="PER_HAND"
            db.get(Exercise,item["exercise_id"]).name="Renamed";db.commit()
        assert client.get(f"/workouts/{workout['id']}").json()["exercises"][0]["exercise_name_snapshot"]=="Curl especial"
        client.post(f"/workouts/{workout['id']}/finish")
        assert client.post(f"/workouts/{workout['id']}/exercises",json={"name":"Another"}).status_code==409

def test_named_creation_is_restricted_to_free():
    with SessionLocal() as db:
        routine=Routine(name="PUSH");db.add(routine);db.commit();routine_id=routine.id
    with owner_client() as client:
        workout=client.post("/workouts",json={"routine_id":routine_id}).json()
        assert client.post(f"/workouts/{workout['id']}/exercises",json={"name":"New"}).status_code==422
