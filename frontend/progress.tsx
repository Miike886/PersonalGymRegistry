import {useState} from 'react'
import {dayOf,exercisePoints,filterWorkouts,monthlyFrequency,workoutSummary,type ProgressWorkout,type ProgressPoint} from './progress-model'

const labels:Record<string,string>={EXTERNAL:'Carga externa',BODYWEIGHT:'Peso corporal',BODYWEIGHT_PLUS:'Lastre adicional',BODYWEIGHT_ASSISTED:'Asistencia'}
function LineChart({points,label,open}:{points:ProgressPoint[];label:string;open:(id:number)=>void}){
  const time=(date:string)=>Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(date)?date:date+'Z')
  const start=time(points[0].date),span=time(points[points.length-1].date)-start
  const max=Math.max(1,...points.map(p=>p.value)),x=(i:number)=>48+(span===0?270:(time(points[i].date)-start)/span*540),y=(v:number)=>190-v/max*160
  return <>
    <svg className="progress-chart" viewBox="0 0 640 240" role="img" aria-label={label+'. Datos exactos y enlaces a sesiones en la tabla inferior.'}>
      {[0,.5,1].map(r=><g key={r}><line x1="48" x2="590" y1={y(r*max)} y2={y(r*max)} stroke="#3c4535"/><text x="4" y={y(r*max)+5} fill="#acb5a5" fontSize="12">{Number((r*max).toFixed(1))}</text></g>)}
      <polyline points={points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke="#c4f135" strokeWidth="3"/>
      {points.map((p,i)=><circle key={p.id} cx={x(i)} cy={y(p.value)} r="5" fill="#c4f135"><title>{dayOf(p.date)}: {p.value}</title></circle>)}
      <text x="48" y="225" fill="#acb5a5" fontSize="12">{dayOf(points[0].date)}</text><text x="590" y="225" textAnchor="end" fill="#acb5a5" fontSize="12">{dayOf(points[points.length-1].date)}</text>
    </svg>
    <details className="chart-data"><summary>Datos y sesiones ({points.length})</summary><div className="chart-table"><table><caption>{label}</caption><thead><tr><th>Fecha</th><th>Valor</th><th>Reps máx.</th><th>Series</th><th>Sesión</th></tr></thead><tbody>{points.map(p=><tr key={p.id}><td>{dayOf(p.date)}</td><td>{p.value}</td><td>{p.reps}</td><td>{p.sets}</td><td><button onClick={()=>open(p.id)}>Ver ↗</button></td></tr>)}</tbody></table></div></details>
  </>
}
export function Progress({workouts,open}:{workouts:ProgressWorkout[];open:(id:number)=>void}){
  const [from,setFrom]=useState(''),[to,setTo]=useState(''),[routine,setRoutine]=useState(''),[exercise,setExercise]=useState(''),[unit,setUnit]=useState('lb'),[type,setType]=useState('EXTERNAL')
  const filtered=filterWorkouts(workouts,from,to,routine),summary=workoutSummary(filtered),frequency=monthlyFrequency(filtered)
  const exercises=[...new Map(workouts.filter(w=>w.ended_at).flatMap(w=>w.exercises).filter(e=>e.exercise_id!==null).map(e=>[e.exercise_id!,e.exercise_name_snapshot])).entries()].sort((a,b)=>a[1].localeCompare(b[1]))
  const selected=exercise || String(exercises[0]?.[0]||''),points=exercisePoints(filtered,Number(selected),unit,type),maxFrequency=Math.max(1,...frequency.map(p=>p.value))
  const metric=type==='BODYWEIGHT'?'Repeticiones máximas por sesión':type==='BODYWEIGHT_ASSISTED'?`Menor asistencia registrada (${unit})`:`Mayor ${type==='BODYWEIGHT_PLUS'?'lastre adicional':'carga registrada'} (${unit})`
  const range=(days:number)=>{const end=new Date(),start=new Date();start.setDate(start.getDate()-days+1);setFrom(dayOf(start.toISOString()));setTo(dayOf(end.toISOString()))}
  return <section className="progress" aria-label="Análisis del progreso">
    <div className="section-heading"><div><p className="eyebrow">MIRA LO QUE HAS CONSTRUIDO</p><h2>Tu progreso.</h2></div></div>
    <div className="progress-presets" role="group" aria-label="Periodo de análisis"><button onClick={()=>range(30)}>30 días</button><button onClick={()=>range(90)}>90 días</button><button onClick={()=>range(365)}>1 año</button><button onClick={()=>{setFrom('');setTo('')}}>Todo</button></div>
    <div className="progress-filters"><label className="field"><span>Desde</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="field"><span>Hasta</span><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label className="field"><span>Rutina</span><select aria-label="Rutina del análisis" value={routine} onChange={e=>setRoutine(e.target.value)}><option value="">Todas</option>{[...new Set(workouts.map(w=>w.routine.name))].map(name=><option key={name}>{name}</option>)}</select></label></div>
    {from && to && from>to && <p role="alert" className="error">La fecha inicial debe ser anterior o igual a la final.</p>}
    <div className="progress-stats">{[[summary.sessions,'sesiones'],[summary.days,'días entrenados'],[summary.sets,'series de trabajo'],[summary.minutes,'minutos registrados']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <article className="chart-card"><h3>Constancia por mes</h3>{frequency.length?<div className="frequency-bars" role="list" aria-label="Sesiones completadas por mes">{frequency.map(p=><div role="listitem" key={p.label}><span>{p.label}</span><div><i style={{width:p.value/maxFrequency*100+'%'}}/></div><strong>{p.value}</strong></div>)}</div>:<p className="muted">No hay sesiones finalizadas en este periodo.</p>}</article>
    <article className="chart-card"><h3>Evolución por ejercicio</h3><div className="progress-filters"><label className="field"><span>Ejercicio</span><select aria-label="Ejercicio del análisis" value={selected} onChange={e=>setExercise(e.target.value)}>{!exercises.length && <option value="">Sin ejercicios registrados</option>}{exercises.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="field"><span>Tipo de carga</span><select aria-label="Tipo de carga del análisis" value={type} onChange={e=>setType(e.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Unidad</span><select aria-label="Unidad del análisis" value={unit} onChange={e=>setUnit(e.target.value)} disabled={type==='BODYWEIGHT'}><option value="lb">Libras (lb)</option><option value="kg">Kilogramos (kg)</option></select></label></div>
      <p className="chart-metric">{metric}</p>{points.length?<LineChart points={points} label={metric} open={open}/>:<div className="reference-empty"><p>No hay series de trabajo compatibles con estos filtros.</p><small>Prueba otra unidad, tipo de carga, ejercicio o periodo.</small></div>}
      <p className="chart-note">Solo series de trabajo. No se mezclan kg/lb, ejercicios distintos ni tipos de carga. El peso por mano se muestra tal como se registró; no se duplica. La asistencia no es peso levantado. El historial original no se modifica ni se estima 1RM o peso corporal.</p>
    </article>
  </section>
}
