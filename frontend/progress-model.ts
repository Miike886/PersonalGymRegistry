type SetRecord={reps:number;load_value:number|null;load_unit:'kg'|'lb';weight_type:string;set_type:string}
type ExerciseRecord={exercise_id:number|null;exercise_name_snapshot:string;sets:SetRecord[]}
export type ProgressWorkout={id:number;started_at:string;ended_at:string|null;routine:{name:string};exercises:ExerciseRecord[]}
export type ProgressPoint={id:number;date:string;value:number;reps:number;sets:number}
const dateOf=(value:string)=>new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?value:value+'Z')
export function dayOf(value:string){const d=dateOf(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function filterWorkouts(workouts:ProgressWorkout[],from:string,to:string,routine:string){
  if(from && to && from>to)return []
  return workouts.filter(workout=>workout.ended_at && (!from || dayOf(workout.started_at)>=from) && (!to || dayOf(workout.started_at)<=to) && (!routine || workout.routine.name===routine)).sort((a,b)=>dateOf(a.started_at).getTime()-dateOf(b.started_at).getTime())
}
export function workoutSummary(workouts:ProgressWorkout[]){
  const completed=workouts.filter(workout=>workout.ended_at)
  return {sessions:completed.length,days:new Set(completed.map(w=>dayOf(w.started_at))).size,sets:completed.reduce((n,w)=>n+w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.set_type==='WORKING').length,0),0),minutes:Math.round(completed.reduce((n,w)=>n+Math.max(0,(dateOf(w.ended_at!).getTime()-dateOf(w.started_at).getTime())/60000),0))}
}
export function exercisePoints(workouts:ProgressWorkout[],exerciseId:number,unit:string,weightType:string):ProgressPoint[]{
  return workouts.filter(w=>w.ended_at).map(workout=>{
    const sets=workout.exercises.filter(e=>e.exercise_id===exerciseId).flatMap(e=>e.sets).filter(s=>s.set_type==='WORKING' && s.weight_type===weightType && (weightType==='BODYWEIGHT' || s.load_unit===unit))
    const measurable=weightType==='BODYWEIGHT'?sets:sets.filter(s=>s.load_value!==null)
    if(!measurable.length)return null
    // For assisted sets, display the lowest recorded assistance; never call it external load or an estimated max.
    const value=weightType==='BODYWEIGHT'?Math.max(...measurable.map(s=>s.reps)):weightType==='BODYWEIGHT_ASSISTED'?Math.min(...measurable.map(s=>s.load_value!)):Math.max(...measurable.map(s=>s.load_value!))
    return {id:workout.id,date:workout.started_at,value,reps:Math.max(...sets.map(s=>s.reps)),sets:sets.length}
  }).filter((p):p is ProgressPoint=>p!==null).sort((a,b)=>dateOf(a.date).getTime()-dateOf(b.date).getTime())
}
export function monthlyFrequency(workouts:ProgressWorkout[]){
  const counts=new Map<string,number>();for(const workout of workouts){if(!workout.ended_at)continue;const month=dayOf(workout.started_at).slice(0,7);counts.set(month,(counts.get(month)||0)+1)}
  return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([label,value])=>({label,value}))
}
