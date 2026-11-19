type WorkoutTime = {
  started_at:string
  ended_at?:string|null
  exercises:{sets:{created_at:string}[]}[]
}
const time=(value:string)=>Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?value:value+'Z')
export const sessionDeadline=(workout:WorkoutTime)=>time(workout.started_at)+5*60*60*1000
export function sessionSeconds(workout:WorkoutTime,now:number){
  const start=time(workout.started_at)
  const latest=Math.max(start,...workout.exercises.flatMap(item=>item.sets.map(set=>time(set.created_at))))
  const end=workout.ended_at?time(workout.ended_at):now>=sessionDeadline(workout)?Math.min(latest,now):now
  return Math.max(0,Math.floor((end-start)/1000))
}
