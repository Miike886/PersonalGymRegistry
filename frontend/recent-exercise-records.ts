type HistoricalSet={id:number;position:number;reps:number;load_value:number|null;load_unit:'kg'|'lb';weight_type:'EXTERNAL'|'BODYWEIGHT'|'BODYWEIGHT_PLUS'|'BODYWEIGHT_ASSISTED';set_type:string;created_at:string}
type HistoricalExercise={exercise_id:number|null;sets:HistoricalSet[]}
type HistoricalWorkout={id:number;started_at:string;ended_at:string|null;exercises:HistoricalExercise[]}
export type ExerciseRecordReference={workout_id:number;date:string;set:HistoricalSet}

const timestamp=(value:string)=>new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?value:value+'Z').getTime()

export function recentExerciseRecords(workouts:HistoricalWorkout[],exerciseId:number|null,limit=2):ExerciseRecordReference[]{
  if(exerciseId===null)return []
  return workouts.filter(workout=>workout.ended_at!==null).flatMap(workout=>workout.exercises
    .filter(exercise=>exercise.exercise_id===exerciseId)
    .flatMap(exercise=>exercise.sets.filter(set=>set.set_type==='WORKING').map(set=>({workout_id:workout.id,date:workout.started_at,set}))))
    .sort((a,b)=>timestamp(b.set.created_at)-timestamp(a.set.created_at)||timestamp(b.date)-timestamp(a.date)||b.workout_id-a.workout_id||b.set.position-a.set.position)
    .slice(0,Math.max(0,limit))
}
