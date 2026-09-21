from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload
from .database import Base, engine, get_db
from .config import settings
from .models import Exercise, Routine, RoutineExercise, Workout, WorkoutExercise, WorkoutSet
from .schemas import (ExerciseOut, RoutineOut, SetCreate, SetOut, SetUpdate, WorkoutCreate, WorkoutExerciseCreate, WorkoutExerciseOut, WorkoutExerciseUpdate, WorkoutOut)

def detail_options():
    return (joinedload(Workout.routine).joinedload(Routine.exercises).joinedload(RoutineExercise.exercise), joinedload(Workout.exercises).joinedload(WorkoutExercise.sets))

def workout_or_404(db: Session, workout_id: int):
    result = db.execute(select(Workout).where(Workout.id == workout_id).options(*detail_options())).unique().scalar_one_or_none()
    if not result: raise HTTPException(404, "Workout no encontrado")
    return result

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_env != "production": Base.metadata.create_all(engine)
    yield

app = FastAPI(title="Gym Session Tracker", lifespan=lifespan, docs_url=None if settings.app_env == "production" else "/docs")
@app.middleware("http")
async def token_guard(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    if settings.app_env == "production" and request.url.path != "/health" and (not settings.api_token or request.headers.get("X-App-Token") != settings.api_token): return JSONResponse(status_code=401, content={"detail":"No autorizado"})
    return await call_next(request)

# Register CORS after the guard so it wraps all responses, including authorization failures.
app.add_middleware(CORSMiddleware, allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=[host.strip() for host in settings.allowed_hosts.split(",")])

@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1")); return {"status":"ok"}

@app.get("/routines", response_model=list[RoutineOut])
def routines(db: Session = Depends(get_db)):
    return db.execute(select(Routine).options(joinedload(Routine.exercises).joinedload(RoutineExercise.exercise)).order_by(Routine.id)).unique().scalars().all()

@app.get("/exercises", response_model=list[ExerciseOut])
def exercises(db: Session = Depends(get_db)):
    return db.scalars(select(Exercise).where(Exercise.is_active.is_(True)).order_by(Exercise.name)).all()

@app.get("/routines/{routine_id}/last-workout", response_model=WorkoutOut | None)
def last_workout(routine_id: int, db: Session = Depends(get_db)):
    return db.execute(select(Workout).where(Workout.routine_id == routine_id, Workout.ended_at.is_not(None)).options(*detail_options()).order_by(Workout.ended_at.desc())).unique().scalars().first()

@app.get("/routines/{routine_id}/recent-workouts", response_model=list[WorkoutOut])
def recent_workouts(routine_id: int, limit: int = Query(default=2, ge=1, le=10), db: Session = Depends(get_db)):
    return db.execute(
        select(Workout)
        .where(Workout.routine_id == routine_id, Workout.ended_at.is_not(None))
        .options(*detail_options())
        .order_by(Workout.ended_at.desc(), Workout.id.desc())
        .limit(limit)
    ).unique().scalars().all()

@app.get("/workouts/active", response_model=WorkoutOut | None)
def active_workout(db: Session = Depends(get_db)):
    return db.execute(select(Workout).where(Workout.ended_at.is_(None)).options(*detail_options())).unique().scalar_one_or_none()

@app.post("/workouts", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def create_workout(body: WorkoutCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Workout.id).where(Workout.ended_at.is_(None))): raise HTTPException(409, "Ya existe una sesión activa")
    routine = db.get(Routine, body.routine_id)
    if not routine: raise HTTPException(404, "Rutina no encontrada")
    workout = Workout(routine_id=body.routine_id, notes=body.notes)
    db.add(workout); db.flush()
    for item in sorted(routine.exercises, key=lambda x:x.position):
        db.add(WorkoutExercise(workout_id=workout.id, exercise_id=item.exercise_id, exercise_name_snapshot=item.exercise.name, position=item.position))
    db.commit()
    return workout_or_404(db, workout.id)

@app.get("/workouts", response_model=list[WorkoutOut])
def workouts(db: Session = Depends(get_db)):
    return db.execute(select(Workout).where(Workout.ended_at.is_not(None)).options(*detail_options()).order_by(Workout.ended_at.desc())).unique().scalars().all()

@app.get("/workouts/{workout_id}", response_model=WorkoutOut)
def get_workout(workout_id: int, db: Session = Depends(get_db)): return workout_or_404(db, workout_id)

@app.delete("/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.get(Workout, workout_id)
    if not workout: raise HTTPException(404, "Workout no encontrado")
    db.delete(workout); db.commit()

@app.post("/workouts/{workout_id}/exercises", response_model=WorkoutExerciseOut, status_code=201)
def add_exercise(workout_id:int, body:WorkoutExerciseCreate, db:Session=Depends(get_db)):
    workout_or_404(db, workout_id); exercise=db.get(Exercise, body.exercise_id)
    if not exercise: raise HTTPException(404,"Ejercicio no encontrado")
    position = body.position or (db.scalar(select(WorkoutExercise.position).where(WorkoutExercise.workout_id==workout_id).order_by(WorkoutExercise.position.desc())) or 0)+1
    item=WorkoutExercise(workout_id=workout_id,exercise_id=exercise.id,exercise_name_snapshot=exercise.name,position=position); db.add(item); db.commit(); db.refresh(item); return item

@app.patch("/workout-exercises/{item_id}", response_model=WorkoutExerciseOut)
def update_exercise(item_id:int, body:WorkoutExerciseUpdate, db:Session=Depends(get_db)):
    item=db.get(WorkoutExercise,item_id)
    if not item: raise HTTPException(404,"Ejercicio no encontrado")
    changes=body.model_dump(exclude_unset=True)
    if "position" in changes and changes["position"] != item.position:
        new_position=changes.pop("position")
        siblings=db.scalars(select(WorkoutExercise).where(WorkoutExercise.workout_id==item.workout_id,WorkoutExercise.id!=item.id).order_by(WorkoutExercise.position)).all()
        # Re-number all siblings, then insert the selected exercise at its desired position.
        for index, sibling in enumerate(siblings, 1000): sibling.position=index
        db.flush()
        ordered=siblings[:max(0,new_position-1)]+[item]+siblings[max(0,new_position-1):]
        for index, sibling in enumerate(ordered,1): sibling.position=index
    for key,value in changes.items(): setattr(item,key,value)
    db.commit(); db.refresh(item); return item

@app.post("/workout-exercises/{item_id}/sets", response_model=SetOut, status_code=201)
def add_set(item_id:int, body:SetCreate, db:Session=Depends(get_db)):
    item=db.get(WorkoutExercise,item_id)
    if not item: raise HTTPException(404,"Ejercicio no encontrado")
    if db.get(Workout,item.workout_id).ended_at: raise HTTPException(409,"La sesión ya terminó")
    position=(db.scalar(select(WorkoutSet.position).where(WorkoutSet.workout_exercise_id==item_id).order_by(WorkoutSet.position.desc())) or 0)+1
    record=WorkoutSet(workout_exercise_id=item_id,position=position,**body.model_dump()); db.add(record); db.commit(); db.refresh(record); return record

@app.patch("/sets/{set_id}", response_model=SetOut)
def update_set(set_id:int, body:SetUpdate, db:Session=Depends(get_db)):
    record=db.get(WorkoutSet,set_id)
    if not record: raise HTTPException(404,"Serie no encontrada")
    for key,value in body.model_dump(exclude_unset=True).items(): setattr(record,key,value)
    db.commit(); db.refresh(record); return record

@app.delete("/sets/{set_id}", status_code=204)
def delete_set(set_id:int, db:Session=Depends(get_db)):
    record=db.get(WorkoutSet,set_id)
    if not record: raise HTTPException(404,"Serie no encontrada")
    db.delete(record); db.commit()

@app.post("/workouts/{workout_id}/finish", response_model=WorkoutOut)
def finish(workout_id:int, db:Session=Depends(get_db)):
    from datetime import datetime, timezone
    workout=workout_or_404(db,workout_id)
    if workout.ended_at: raise HTTPException(409,"La sesión ya terminó")
    workout.ended_at=datetime.now(timezone.utc); db.commit(); return workout_or_404(db,workout_id)
