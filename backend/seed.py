from app.database import Base, SessionLocal, engine
from app.models import Exercise, LoadConvention, Routine, RoutineExercise
Base.metadata.create_all(engine); db = SessionLocal()
routines = {n: db.query(Routine).filter_by(name=n).first() or Routine(name=n) for n in ("PUSH", "PULL", "LEGS", "FREE")}; db.add_all(routines.values()); db.flush()
items = [("Press inclinado en Smith",LoadConvention.TOTAL),("Press inclinado en máquina (variante)",LoadConvention.TOTAL),("Press de hombro",LoadConvention.TOTAL),("Extensión de tríceps con cuerda",LoadConvention.TOTAL),("Pec fly",LoadConvention.TOTAL),("Elevaciones laterales",LoadConvention.TOTAL),("Fondos lastrados",LoadConvention.TOTAL),("Lat pulldown",LoadConvention.TOTAL),("Seated row",LoadConvention.TOTAL),("Curl hammer unilateral",LoadConvention.PER_HAND),("Curl bíceps banco inclinado unilateral",LoadConvention.PER_HAND),("Dominadas con peso corporal",LoadConvention.TOTAL),("Leg press",LoadConvention.TOTAL),("Extensión de cuádriceps",LoadConvention.TOTAL),("Curl femoral",LoadConvention.TOTAL),("Hip abductor",LoadConvention.TOTAL),("Hip adductor",LoadConvention.TOTAL),("Pantorrilla",LoadConvention.TOTAL)]
catalog = {}
for name, convention in items:
    catalog[name] = db.query(Exercise).filter_by(name=name).first() or Exercise(name=name,load_convention=convention); db.add(catalog[name])
db.flush()
templates = {"PUSH":["Press inclinado en Smith","Press de hombro","Extensión de tríceps con cuerda","Pec fly","Elevaciones laterales","Fondos lastrados"],"PULL":["Lat pulldown","Seated row","Curl hammer unilateral","Curl bíceps banco inclinado unilateral","Dominadas con peso corporal"],"LEGS":["Leg press","Extensión de cuádriceps","Curl femoral","Hip abductor","Hip adductor","Pantorrilla"]}
for name, names in templates.items():
    db.query(RoutineExercise).filter_by(routine_id=routines[name].id).delete()
    db.add_all(RoutineExercise(routine_id=routines[name].id,exercise_id=catalog[x].id,position=i) for i,x in enumerate(names,1))
db.commit(); db.close(); print("Rutinas y catálogo sincronizados")
