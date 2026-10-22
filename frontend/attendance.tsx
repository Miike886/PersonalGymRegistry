import {useState} from 'react'
import {attendanceDays,localDay,type AttendanceWorkout} from './attendance-model'
const dateLabel=(date:Date)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'full'}).format(date)
export function AttendanceCalendar({workouts,open}:{workouts:AttendanceWorkout[];open:(id:number)=>void}) {
  const today=new Date(),[month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1)),[selected,setSelected]=useState(localDay(today))
  const days=attendanceDays(workouts),count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(),offset=(month.getDay()+6)%7
  const dates=Array.from({length:count},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1))
  const entries=days.get(selected)||[],monthDays=dates.filter(date=>days.has(localDay(date))).length
  const move=(direction:number)=>{const next=new Date(month.getFullYear(),month.getMonth()+direction,1);setMonth(next);setSelected(localDay(next))}
  return <section className="attendance" aria-label="Calendario de asistencia">
    <div className="section-heading"><div><p className="eyebrow">PRESENTE, OTRA VEZ</p><h2>Tu constancia.</h2></div><span className="badge">{monthDays} {monthDays===1?'día':'días'} este mes</span></div>
    <div className="calendar-layout"><div className="calendar-card">
      <div className="calendar-heading"><button aria-label="Mes anterior" onClick={()=>move(-1)}>←</button><h3 aria-live="polite">{new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(month)}</h3><button aria-label="Mes siguiente" onClick={()=>move(1)}>→</button></div>
      <button className="calendar-today" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(localDay(today))}}>Ir a hoy</button>
      <div className="calendar-week" aria-hidden="true">{['L','M','X','J','V','S','D'].map(day=><span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{Array.from({length:offset},(_,i)=><span key={'empty'+i}/>)}{dates.map(date=>{
        const key=localDay(date),total=days.get(key)?.length||0
        return <button key={key} className={total?'attended':''} aria-pressed={selected===key} aria-current={key===localDay(today)?'date':undefined} aria-label={`${dateLabel(date)}: ${total} sesiones`} onClick={()=>setSelected(key)}><span>{date.getDate()}</span>{total>0 && <small>{total===1?'●':total}</small>}</button>
      })}</div>
      <p className="calendar-legend">● Entrenamiento completado · Fecha local de inicio</p>
    </div><div className="calendar-selection"><p className="eyebrow">EL DÍA ELEGIDO</p><h3>{dateLabel(new Date(selected+'T12:00:00'))}</h3>
      {entries.length?entries.map(workout=><button className="history-card" key={workout.id} onClick={()=>open(workout.id)}><span className="routine-tag" data-routine={workout.routine.name}>{workout.routine.name}</span><span>Ver sesión ↗</span></button>):<p className="muted">No hay entrenamientos finalizados este día.</p>}
      <small>Las sesiones en curso y canceladas no cuentan como asistencia.</small>
    </div></div>
  </section>
}
