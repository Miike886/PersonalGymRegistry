from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from .models import LoadConvention, SetType, WeightType

class ORMModel(BaseModel): model_config = ConfigDict(from_attributes=True)
class ExerciseOut(ORMModel): id:int; name:str; load_convention:LoadConvention; is_active:bool
class RoutineExerciseOut(ORMModel): id:int; position:int; exercise:ExerciseOut
class RoutineOut(ORMModel): id:int; name:str; exercises:list[RoutineExerciseOut]=[]
class SetCreate(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    reps:int=Field(gt=0,le=999)
    load_value:float|None=Field(default=None,ge=0)
    load_unit:Literal["kg","lb"]="lb"
    weight_type:WeightType=WeightType.EXTERNAL
    set_type:SetType=SetType.WORKING
class SetUpdate(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    reps:int|None=Field(default=None,gt=0,le=999)
    load_value:float|None=Field(default=None,ge=0)
    load_unit:Literal["kg","lb"]|None=None
    weight_type:WeightType|None=None
    set_type:SetType|None=None

    @field_validator("load_unit","reps","weight_type","set_type")
    @classmethod
    def non_null_unit(cls, value):
        if value is None: raise ValueError("Este campo no puede ser nulo")
        return value
class SetOut(SetCreate, ORMModel): id:int; position:int; created_at:datetime
class WorkoutExerciseCreate(BaseModel):
    exercise_id:int|None=Field(default=None,gt=0)
    name:str|None=Field(default=None,min_length=1,max_length=100)
    load_convention:LoadConvention=LoadConvention.TOTAL
    position:int|None=Field(default=None,ge=1)

    @field_validator("name",mode="before")
    @classmethod
    def normalize_name(cls,value):
        return " ".join(value.split()) if isinstance(value,str) else value

    @model_validator(mode="after")
    def exactly_one_exercise_source(self):
        if (self.exercise_id is None)==(self.name is None):
            raise ValueError("Indica un ejercicio del catálogo o un nombre nuevo")
        return self
class WorkoutExerciseUpdate(BaseModel):
    position:int|None=Field(default=None,ge=1)
    skipped:bool|None=None

    @field_validator("position","skipped")
    @classmethod
    def non_null_update(cls,value):
        if value is None: raise ValueError("Este campo no puede ser nulo")
        return value
class WorkoutExerciseOut(ORMModel): id:int; exercise_id:int|None; exercise_name_snapshot:str; position:int; skipped:bool; sets:list[SetOut]=[]
class WorkoutCreate(BaseModel): routine_id:int; notes:str|None=None
class WorkoutOut(ORMModel): id:int; routine_id:int; started_at:datetime; ended_at:datetime|None; rest_until:datetime|None; notes:str|None; routine:RoutineOut; exercises:list[WorkoutExerciseOut]=[]
