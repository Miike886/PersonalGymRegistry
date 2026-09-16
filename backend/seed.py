from app.database import Base, SessionLocal, engine
from app.models import Exercise, LoadConvention, Routine, RoutineExercise

Base.metadata.create_all(engine)
db=SessionLocal()
if not db.query(Routine).first():
    routines={name:Routine(name=name) for name in ("PUSH","PULL","LEGS","FREE")}; db.add_all(routines.values()); db.flush()
    exercises=[Exercise(name="Press de banca (ejemplo)"),Exercise(name="Press militar (ejemplo)"),Exercise(name="Remo con cable (ejemplo)"),Exercise(name="Jalón al pecho (ejemplo)"),Exercise(name="Sentadilla (ejemplo)"),Exercise(name="Peso muerto rumano (ejemplo)",load_convention=LoadConvention.PER_HAND)]
    db.add_all(exercises); db.flush()
    for name, picks in {"PUSH":[0,1],"PULL":[2,3],"LEGS":[4,5]}.items():
        for pos,index in enumerate(picks,1): db.add(RoutineExercise(routine_id=routines[name].id,exercise_id=exercises[index].id,position=pos))
    db.commit(); print("Datos iniciales creados")
else: print("Seed ya existe; no se hicieron cambios")
db.close()
