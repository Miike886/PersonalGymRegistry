import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
type WorkoutSet = { id:number; position:number; reps:number; load_value:number|null; weight_type:string; set_type:string }
type WorkoutExercise = { id:number; exercise_id:number|null; exercise_name_snapshot:string; position:number; skipped:boolean; sets:WorkoutSet[] }
type Workout = { id:number; routine_id:number; started_at:string; ended_at:string|null; notes:string|null; routine:{name:string}; exercises:WorkoutExercise[] }

async function api(path:string, options:RequestInit = {}) {
  const response = await fetch(API + path, { headers:{ 'Content-Type':'application/json' }, ...options })
  if (!response.ok) throw Error((await response.json().catch(() => ({ detail:'Error de conexión' }))).detail)
  return response.status === 204 ? null : response.json()
}

function formatDate(date:string) { return new Intl.DateTimeFormat('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(date)) }
function duration(workout:Workout) {
  if (!workout.ended_at) return ''
  const minutes = Math.max(0, Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000))
  return minutes >= 60 ? [`${Math.floor(minutes / 60)} h`, minutes % 60 ? `${minutes % 60} min` : ''].filter(Boolean).join(' ') : `${minutes} min`
}

function App() {
  const [active, setActive] = useState<Workout|null>(null), [routines, setRoutines] = useState<any[]>([]), [history, setHistory] = useState<Workout[]>([]), [selected, setSelected] = useState<Workout|null>(null), [view, setView] = useState<'home'|'history'|'detail'>('home'), [error, setError] = useState(''), [loadingDetail, setLoadingDetail] = useState(false)
  const load = async () => { try { setError(''); setActive(await api('/workouts/active')); setRoutines(await api('/routines')); setHistory(await api('/workouts')) } catch (err:any) { setError(err.message) } }
  useEffect(() => { load() }, [])
  const start = async (routineId:number) => { try { setActive(await api('/workouts', { method:'POST', body:JSON.stringify({ routine_id:routineId }) })) } catch (err:any) { setError(err.message) } }
  const finish = async () => { if (active && confirm('¿Finalizar entrenamiento?')) { await api(`/workouts/${active.id}/finish`, { method:'POST' }); setActive(null); load() } }
  const openDetail = async (workoutId:number) => { try { setError(''); setLoadingDetail(true); setSelected(await api(`/workouts/${workoutId}`)); setView('detail') } catch (err:any) { setError(err.message) } finally { setLoadingDetail(false) } }
  if (active) return <Session workout={active} refresh={load} finish={finish} error={error} />
  if (view === 'detail' && selected) return <WorkoutDetail workout={selected} back={() => setView('history')} />
  return <main><header><h1>Gym Tracker</h1><button onClick={() => setView(view === 'home' ? 'history' : 'home')}>{view === 'home' ? 'Historial' : 'Inicio'}</button></header>{error && <p className="error">{error}</p>}{view === 'history' ? <><h2>Sesiones terminadas</h2>{loadingDetail && <p className="muted">Abriendo sesión…</p>}{history.length ? <div className="history">{history.map(workout => <button className="history-card" key={workout.id} onClick={() => openDetail(workout.id)}><b>{workout.routine.name}</b><span>{formatDate(workout.started_at)}</span><small>{duration(workout)} · {workout.exercises.reduce((total, item) => total + item.sets.length, 0)} series</small></button>)}</div> : <p className="muted">Aún no hay sesiones terminadas.</p>}</> : <><p className="muted">Elige tu entrenamiento de hoy</p><div className="routine-grid">{routines.map(routine => <button className="routine" key={routine.id} onClick={() => start(routine.id)}>{routine.name}<small>{routine.exercises.length ? `${routine.exercises.length} ejercicios` : 'Empieza vacío'}</small></button>)}</div></>}</main>
}

function WorkoutDetail({ workout, back }:{ workout:Workout; back:() => void }) {
  return <main><header><div><h1>{workout.routine.name}</h1><p className="muted">{formatDate(workout.started_at)} · {duration(workout)}</p></div><button onClick={back}>Volver</button></header>{workout.notes && <aside className="notes"><b>Notas</b><p>{workout.notes}</p></aside>}<div className="session history-detail">{workout.exercises.map(item => <section className={item.skipped ? 'skip' : ''} key={item.id}><div className="exercise-head"><h2>{item.exercise_name_snapshot}</h2>{item.skipped && <small>Omitido</small>}</div>{!item.skipped && (item.sets.length ? <div className="sets">{item.sets.map(set => <span key={set.id} className={set.set_type === 'WARMUP' ? 'warmup' : ''}>{set.set_type === 'WARMUP' ? 'Calentamiento' : 'Serie'} {set.position}: {set.reps} × {set.load_value ?? 'peso corporal'}{set.load_value != null ? ' kg' : ''}</span>)}</div> : <p className="muted">Sin series registradas.</p>)}</section>)}</div></main>
}

function Session({ workout, refresh, finish, error }:{ workout:Workout; refresh:() => Promise<void>; finish:() => void; error:string }) {
  const [weights, setWeights] = useState<Record<number,string>>({}), [reps, setReps] = useState(''), [warm, setWarm] = useState(false), [adding, setAdding] = useState(false), [catalog, setCatalog] = useState<any[]>([]), [last, setLast] = useState<Workout|null>(null)
  useEffect(() => { api(`/routines/${workout.routine_id}/last-workout`).then(setLast).catch(() => {}); const next:Record<number,string> = {}; workout.exercises.forEach(item => { const recent = item.sets[item.sets.length - 1]; if (recent?.load_value != null) next[item.id] = String(recent.load_value) }); setWeights(next) }, [workout.id])
  const reference = (item:WorkoutExercise) => { const found = last?.exercises.find(exercise => exercise.exercise_name_snapshot === item.exercise_name_snapshot); return found?.sets[found.sets.length - 1] }
  const add = async (item:WorkoutExercise) => { try { await api(`/workout-exercises/${item.id}/sets`, { method:'POST', body:JSON.stringify({ reps:Number(reps), load_value:weights[item.id] ? Number(weights[item.id]) : null, set_type:warm ? 'WARMUP' : 'WORKING' }) }); setReps(''); setWarm(false); await refresh() } catch (err:any) { alert(err.message) } }
  const toggle = async (item:WorkoutExercise) => { await api(`/workout-exercises/${item.id}`, { method:'PATCH', body:JSON.stringify({ skipped:!item.skipped }) }); refresh() }
  const addExercise = async (exerciseId:number) => { await api(`/workouts/${workout.id}/exercises`, { method:'POST', body:JSON.stringify({ exercise_id:exerciseId }) }); setAdding(false); refresh() }
  return <main><header><div><h1>{workout.routine.name}</h1><p className="muted">En curso · {new Date(workout.started_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</p></div><button onClick={finish} className="finish">Finalizar</button></header>{error && <p className="error">{error}</p>}<div className="session">{workout.exercises.map(item => { const ref = reference(item); return <section className={item.skipped ? 'skip' : ''} key={item.id}><div className="exercise-head"><h2>{item.exercise_name_snapshot}</h2><button onClick={() => toggle(item)}>{item.skipped ? 'Reanudar' : 'Saltar'}</button></div>{!item.skipped && <><div className="sets">{item.sets.map(set => <span key={set.id}>{set.set_type === 'WARMUP' ? 'C' : '●'} {set.reps}×{set.load_value ?? 'BW'}</span>)}{ref && <span className="reference">Anterior: {ref.reps}×{ref.load_value ?? 'BW'}</span>}</div><div className="quick"><input aria-label="Peso" inputMode="decimal" placeholder="kg" value={weights[item.id] || ''} onChange={event => setWeights({ ...weights, [item.id]:event.target.value })} /><input aria-label="Repeticiones" inputMode="numeric" placeholder="reps" value={reps} onChange={event => setReps(event.target.value)} onKeyDown={event => event.key === 'Enter' && reps && add(item)} /><button className="record" disabled={!reps} onClick={() => add(item)}>Registrar</button></div><label><input type="checkbox" checked={warm} onChange={event => setWarm(event.target.checked)} /> Calentamiento</label></>}</section> })}</div><button className="add" onClick={async () => { setCatalog(await api('/exercises')); setAdding(true) }}>+ Agregar ejercicio</button>{adding && <div className="sheet"><h2>Agregar ejercicio</h2>{catalog.map(exercise => <button key={exercise.id} onClick={() => addExercise(exercise.id)}>{exercise.name}</button>)}<button onClick={() => setAdding(false)}>Cancelar</button></div>}</main>
}

createRoot(document.getElementById('root')!).render(<App />)
