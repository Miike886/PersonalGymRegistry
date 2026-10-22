export type AttendanceWorkout={id:number;started_at:string;ended_at:string|null;routine:{name:string}}
export function utcTime(value:string){return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?value:value+'Z')}
export function localDay(value:Date){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`}
export function attendanceDays<T extends AttendanceWorkout>(workouts:T[]) {
  const days=new Map<string,T[]>()
  for(const workout of workouts){if(!workout.ended_at)continue;const key=localDay(utcTime(workout.started_at));days.set(key,[...(days.get(key)||[]),workout])}
  return days
}
