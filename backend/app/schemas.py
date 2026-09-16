from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from .models import LoadConvention, SetType, WeightType

class ORMModel(BaseModel): model_config = ConfigDict(from_attributes=True)
class ExerciseOut(ORMModel): id:int; name:str; load_convention:LoadConvention; is_active:bool
class RoutineExerciseOut(ORMModel): id:int; position:int; exercise:ExerciseOut
class RoutineOut(ORMModel): id:int; name:str; exercises:list[RoutineExerciseOut]=[]
class SetCreate(BaseModel): reps:int=Field(gt=0, le=999); load_value:float|None=Field(default=None, ge=0); weight_type:WeightType=WeightType.EXTERNAL; set_type:SetType=SetType.WORKING
class SetUpdate(BaseModel): reps:int|None=Field(default=None,gt=0); load_value:float|None=Field(default=None,ge=0); weight_type:WeightType|None=None; set_type:SetType|None=None
class SetOut(SetCreate, ORMModel): id:int; position:int; created_at:datetime
class WorkoutExerciseCreate(BaseModel): exercise_id:int; position:int|None=None
class WorkoutExerciseUpdate(BaseModel): position:int|None=Field(default=None,ge=1); skipped:bool|None=None
class WorkoutExerciseOut(ORMModel): id:int; exercise_id:int|None; exercise_name_snapshot:str; position:int; skipped:bool; sets:list[SetOut]=[]
class WorkoutCreate(BaseModel): routine_id:int; notes:str|None=None
class WorkoutOut(ORMModel): id:int; routine_id:int; started_at:datetime; ended_at:datetime|None; notes:str|None; routine:RoutineOut; exercises:list[WorkoutExerciseOut]=[]
