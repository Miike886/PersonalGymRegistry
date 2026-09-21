import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_TOKEN = import.meta.env.VITE_API_TOKEN
type WeightType = 'EXTERNAL'|'BODYWEIGHT'|'BODYWEIGHT_PLUS'|'BODYWEIGHT_ASSISTED'
type WorkoutSet = { id:number; position:number; reps:number; load_value:number|null; weight_type:WeightType; set_type:string }
type WorkoutExercise = { id:number; exercise_id:number|null; exercise_name_snapshot:string; position:number; skipped:boolean; sets:WorkoutSet[] }
type Workout = { id:number; routine_id:number; started_at:string; ended_at:string|null; notes:string|null; routine:{name:string}; exercises:WorkoutExercise[] }
type Exercise = { id:number; name:string; load_convention:'TOTAL'|'PER_HAND' }

async function api(path:string, options:RequestInit = {}) { const response = await fetch(API + path, { headers:{ 'Content-Type':'application/json', ...(API_TOKEN ? {'X-App-Token':API_TOKEN} : {}) }, ...options }); if (!response.ok) throw Error((await response.json().catch(() => ({ detail:'Error de conexión' }))).detail); return response.status === 204 ? null : response.json() }
function formatDate(date:string) { return new Intl.DateTimeFormat('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(date)) }
function duration(workout:Workout) { if (!workout.ended_at) return ''; const minutes = Math.max(0, Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000)); return minutes >= 60 ? [`${Math.floor(minutes / 60)} h`, minutes % 60 ? `${minutes % 60} min` : ''].filter(Boolean).join(' ') : `${minutes} min` }
function weightLabel(type:WeightType) { return ({ EXTERNAL:'Carga externa', BODYWEIGHT:'Peso corporal', BODYWEIGHT_PLUS:'Peso corporal + carga', BODYWEIGHT_ASSISTED:'Peso corporal asistido' })[type] }
function referenceSetLabel(set:WorkoutSet) { if (set.weight_type === 'BODYWEIGHT') return `${set.reps}×peso corporal`; if (set.weight_type === 'BODYWEIGHT_PLUS') return `${set.reps}×peso corporal + ${set.load_value ?? 0} kg`; if (set.weight_type === 'BODYWEIGHT_ASSISTED') return `${set.reps}×${set.load_value ?? 0} kg de asistencia`; return `${set.reps}×${set.load_value ?? 'carga sin registrar'}${set.load_value != null ? ' kg' : ''}` }

const routineInfo:Record<string,{title:string; subtitle:string; number:string}> = {
  PUSH: { title:'Empuje', subtitle:'Pecho · hombros · tríceps', number:'01' },
  PULL: { title:'Tracción', subtitle:'Espalda · bíceps', number:'02' },
  LEGS: { title:'Pierna', subtitle:'Fuerza desde la base', number:'03' },
  FREE: { title:'Libre', subtitle:'Tu sesión, a tu ritmo', number:'04' },
}
function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true">///</span><span>GYM<span className="brand-light">TRACKER</span></span></div>
}
function ErrorNotice({ message }:{message:string}) {
  return message ? <p className="error" role="alert">{message}</p> : null
}
function WorkoutRows({ item }:{item:WorkoutExercise}) {
  return <div className="sets">{item.sets.map(set => <div className="set-row" key={set.id}>
    <span className="set-number">{String(set.position).padStart(2,'0')}</span>
    <span className="set-value">{referenceSetLabel(set)}</span>
    <small className={set.set_type === 'WARMUP' ? 'badge warmup' : 'badge'}>{set.set_type === 'WARMUP' ? 'Calentamiento' : 'Trabajo'}</small>
  </div>)}</div>
}

function App() {
  const [active, setActive] = useState<Workout|null>(null), [routines, setRoutines] = useState<any[]>([]), [history, setHistory] = useState<Workout[]>([]), [selected, setSelected] = useState<Workout|null>(null), [view, setView] = useState<'home'|'history'|'detail'>('home'), [error, setError] = useState(''), [loadingDetail, setLoadingDetail] = useState(false)
  const load = async () => { try { setError(''); setActive(await api('/workouts/active')); setRoutines(await api('/routines')); setHistory(await api('/workouts')) } catch (err:any) { setError(err.message) } }
  useEffect(() => { load() }, [])
  const start = async (routineId:number) => { try { setActive(await api('/workouts', { method:'POST', body:JSON.stringify({ routine_id:routineId }) })) } catch (err:any) { setError(err.message) } }
  const finish = async () => { if (active && confirm('¿Finalizar entrenamiento?')) { await api(`/workouts/${active.id}/finish`, { method:'POST' }); setActive(null); load() } }
  const cancelWorkout = async () => { if (active && confirm('¿Cancelar este entrenamiento? Se eliminarán todas las series registradas.')) { try { setError(''); await api(`/workouts/${active.id}`, { method:'DELETE' }); setActive(null); await load() } catch (err:any) { setError(err.message) } } }
  const deleteWorkout = async (workout:Workout) => { if (confirm('¿Eliminar este entrenamiento del historial? Esta acción no se puede deshacer.')) { try { setError(''); await api(`/workouts/${workout.id}`, { method:'DELETE' }); setSelected(null); setView('history'); await load() } catch (err:any) { setError(err.message) } } }
  const openDetail = async (workoutId:number) => { try { setError(''); setLoadingDetail(true); setSelected(await api(`/workouts/${workoutId}`)); setView('detail') } catch (err:any) { setError(err.message) } finally { setLoadingDetail(false) } }
  if (active) return <Session workout={active} refresh={load} finish={finish} cancelWorkout={cancelWorkout} error={error} />
  if (view === 'detail' && selected) return <WorkoutDetail workout={selected} back={() => setView('history')} deleteWorkout={deleteWorkout} error={error} />

  return <main>
    <header className="topbar"><Brand /><nav aria-label="Navegación principal"><button className={view === 'home' ? 'nav-active' : ''} onClick={() => setView('home')}>Entrenar</button><button className={view === 'history' ? 'nav-active' : ''} onClick={() => setView('history')}>Historial</button></nav></header>
    <ErrorNotice message={error} />
    <div className="hero"><div><p className="eyebrow">{view === 'home' ? 'TU PRÓXIMA SESIÓN' : 'TU RECORRIDO'}</p><h1>{view === 'home' ? <>Cada serie<br /><em>cuenta.</em></> : <>Trabajo hecho.<br /><em>Fuerza ganada.</em></>}</h1><p className="hero-description">{view === 'home' ? 'Elige tu rutina. Encuentra tu ritmo. Hazla tuya.' : 'Vuelve a tus entrenamientos y encuentra tu referencia.'}</p></div><div className="hero-art" aria-hidden="true"><span>///</span><small>KEEP SHOWING UP</small></div></div>
    {view === 'history' ? <>
      <div className="section-heading"><h2>Sesiones terminadas</h2><span className="badge">{history.length} sesiones</span></div>
      {loadingDetail && <p role="status" className="muted">Abriendo sesión…</p>}
      {history.length ? <div className="history">{history.map(workout => <button className="history-card" key={workout.id} onClick={() => openDetail(workout.id)}>
        <span className="routine-tag" data-routine={workout.routine.name}>{workout.routine.name}</span><span className="history-date">{formatDate(workout.started_at)}</span><span className="history-meta">{duration(workout)} · {workout.exercises.reduce((total,item) => total + item.sets.length,0)} series</span><span className="card-arrow" aria-hidden="true">↗</span>
      </button>)}</div> : <div className="empty-state"><span aria-hidden="true">↗</span><h3>Tu recorrido empieza aquí</h3><p>Al finalizar tu primer entrenamiento, podrás consultarlo en este espacio.</p><button className="primary" onClick={() => setView('home')}>Elegir rutina</button></div>}
    </> : <>
      <div className="section-heading"><h2>El entrenamiento de hoy</h2><span className="eyebrow">A TU RITMO</span></div>
      <div className="routine-grid">{routines.map(routine => { const info= routineInfo[routine.name]; return <button className="routine" data-routine={routine.name} key={routine.id} onClick={() => start(routine.id)}>
        <span className="routine-top"><span className="routine-tag">{routine.name}</span><span className="routine-number" aria-hidden="true">{info?.number || '↗'}</span></span>
        <span className="routine-title">{info?.title || routine.name}</span><span className="routine-description">{info?.subtitle || 'Una sesión para ti'}</span>
        <span className="routine-footer"><span>{routine.exercises.length ? routine.exercises.length + ' ejercicios' : 'Empieza vacío'}</span><span className="round-arrow" aria-hidden="true">↗</span></span>
      </button> })}</div>
    </>}
    <footer className="page-footer"><Brand /><span>UNA SERIE A LA VEZ.</span></footer>
  </main>
}


function WorkoutDetail({ workout, back, deleteWorkout, error }:{ workout:Workout; back:() => void; deleteWorkout:(workout:Workout) => void; error:string }) {
  return <main><header className="topbar"><Brand /><button onClick={back}>← Historial</button></header>
    <div className="page-title"><p className="eyebrow">SESIÓN COMPLETADA</p><h1>{routineInfo[workout.routine.name]?.title || workout.routine.name}<em>.</em></h1><p className="muted">{formatDate(workout.started_at)}</p><div className="session-metrics"><span>{duration(workout)}</span><span>{workout.exercises.length} ejercicios</span><span>{workout.exercises.reduce((total,item)=>total+item.sets.length,0)} series</span></div></div>
    <ErrorNotice message={error} />
    {workout.notes && <aside className="notes"><p className="eyebrow">NOTAS DE LA SESIÓN</p><p>{workout.notes}</p></aside>}
    <div className="session history-detail">{workout.exercises.map(item => <section className={'exercise-card '+(item.skipped ? 'skip' : '')} key={item.id}>
      <div className="exercise-heading"><span className="exercise-number">{String(item.position).padStart(2,'0')}</span><h2>{item.exercise_name_snapshot}</h2><span className="badge">{item.skipped ? 'Omitido' : item.sets.length+' series'}</span></div>
      {!item.skipped && (item.sets.length ? <WorkoutRows item={item} /> : <p className="muted">Sin series registradas.</p>)}
    </section>)}</div><div className="danger-zone"><p>Este registro forma parte de tu historial.</p><button className="delete-workout" onClick={() => deleteWorkout(workout)}>Eliminar entrenamiento</button></div>
  </main>
}

function RecentWorkoutReference({ workouts, routineName, error, retry }:{ workouts:Workout[]; routineName:string; error:string; retry:() => void }) {
  return <aside className="recent-reference"><p className="eyebrow">TU PUNTO DE PARTIDA</p><h2>La última vez<em>.</em></h2><p className="muted">Tus sesiones recientes de {routineName}</p>
    {error ? <div><ErrorNotice message={'No se pudo cargar la referencia: '+error} /><button onClick={retry}>Reintentar</button></div> : workouts.length ? workouts.map((entry,index) => <details key={entry.id} open={index === 0}>
      <summary><span><small>{index === 0 ? 'MÁS RECIENTE' : 'SESIÓN ANTERIOR'}</small><b>{formatDate(entry.started_at)}</b></span><span className="expand-icon" aria-hidden="true">＋</span></summary><p className="reference-duration">{duration(entry)}</p>
      <div className="recent-exercises">{entry.exercises.filter(item=>!item.skipped).map(item=> { const workingSets=item.sets.filter(set=>set.set_type==='WORKING'); return <div key={item.id}><b>{item.exercise_name_snapshot}</b><span>{workingSets.length ? workingSets.map(referenceSetLabel).join(' · ') : 'Sin series de trabajo'}</span></div> })}</div>
    </details>) : <div className="reference-empty"><p>Aún no hay entrenamientos terminados de esta rutina.</p><small>Tu primera sesión será tu próxima referencia.</small></div>}
  </aside>
}

function ExercisePicker({catalog,choose,close}:{catalog:Exercise[];choose:(id:number)=>Promise<void>;close:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const node=dialog.current, opener=document.activeElement as HTMLElement|null
    node?.showModal()
    return ()=>{ node?.close(); opener?.focus() }
  },[])
  return <dialog className="sheet" ref={dialog} onCancel={close} aria-labelledby="catalog-title">
    <div className="sheet-heading"><div><p className="eyebrow">DALE TU FORMA</p><h2 id="catalog-title">Agregar o sustituir</h2></div><button onClick={close} aria-label="Cerrar catálogo">×</button></div>
    <p className="muted">Elige un ejercicio. Puedes saltar el que quieras sustituir.</p>
    <div className="catalog-list">{catalog.map(exercise=><button key={exercise.id} onClick={()=>choose(exercise.id)}><span>{exercise.name}</span><span aria-hidden="true">＋</span></button>)}</div>
    <button className="sheet-close" onClick={close}>Volver al entrenamiento</button>
  </dialog>
}

function Session({ workout, refresh, finish, cancelWorkout, error }:{ workout:Workout; refresh:() => Promise<void>; finish:() => void; cancelWorkout:() => void; error:string }) {
  const [weights, setWeights] = useState<Record<number,string>>({}), [weightTypes, setWeightTypes] = useState<Record<number,WeightType>>({}), [reps, setReps] = useState(''), [warm, setWarm] = useState(false), [adding, setAdding] = useState(false), [catalog, setCatalog] = useState<Exercise[]>([]), [recent, setRecent] = useState<Workout[]>([]), [referenceError, setReferenceError] = useState(''), [restUntil, setRestUntil] = useState<number|null>(null), [now, setNow] = useState(Date.now())
  const loadReference = () => { setReferenceError(''); Promise.all([api(`/routines/${workout.routine_id}/recent-workouts?limit=2`), api('/exercises')]).then(([recentWorkouts, exercises]) => { setRecent(recentWorkouts); setCatalog(exercises); const previous = recentWorkouts[0], nextWeights:Record<number,string> = {}, nextTypes:Record<number,WeightType> = {}; workout.exercises.forEach(item => { const previousExercise = previous?.exercises.find((exercise:WorkoutExercise) => exercise.exercise_id === item.exercise_id); const suggestion = previousExercise?.sets.slice().reverse().find((set:WorkoutSet) => set.set_type === 'WORKING'); if (suggestion) { if (suggestion.load_value != null) nextWeights[item.id] = String(suggestion.load_value); nextTypes[item.id] = suggestion.weight_type } }); setWeights(nextWeights); setWeightTypes(nextTypes) }).catch((err:any) => setReferenceError(err.message)) }
  useEffect(() => { loadReference() }, [workout.id])
  useEffect(() => { if (!restUntil) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [restUntil])
  const reference = (item:WorkoutExercise) => { const found = recent[0]?.exercises.find(exercise => exercise.exercise_id === item.exercise_id); return found?.sets.slice().reverse().find(set => set.set_type === 'WORKING') }
  const exercise = (item:WorkoutExercise) => catalog.find(entry => entry.id === item.exercise_id)
  const convention = (item:WorkoutExercise) => exercise(item)?.load_convention === 'PER_HAND' ? 'kg por mano' : 'kg totales'
  const typeFor = (item:WorkoutExercise):WeightType => weightTypes[item.id] || 'EXTERNAL'
  const add = async (item:WorkoutExercise) => { try { const type = typeFor(item); await api(`/workout-exercises/${item.id}/sets`, { method:'POST', body:JSON.stringify({ reps:Number(reps), load_value:type === 'BODYWEIGHT' ? null : weights[item.id] ? Number(weights[item.id]) : null, weight_type:type, set_type:warm ? 'WARMUP' : 'WORKING' }) }); if (!warm) setRestUntil(Date.now() + 180000); setReps(''); setWarm(false); await refresh() } catch (err:any) { alert(err.message) } }
  const editSet = async (set:WorkoutSet) => { const nextReps = prompt('Repeticiones', String(set.reps)); if (!nextReps) return; const nextLoad = set.load_value == null ? null : prompt('Peso (kg)', String(set.load_value)); await api(`/sets/${set.id}`, { method:'PATCH', body:JSON.stringify({ reps:Number(nextReps), load_value:nextLoad === null ? null : Number(nextLoad) }) }); refresh() }
  const deleteSet = async (set:WorkoutSet) => { if (confirm('¿Eliminar esta serie?')) { await api(`/sets/${set.id}`, { method:'DELETE' }); refresh() } }
  const move = async (item:WorkoutExercise, direction:number) => { await api(`/workout-exercises/${item.id}`, { method:'PATCH', body:JSON.stringify({ position:Math.max(1, item.position + direction) }) }); refresh() }
  const toggle = async (item:WorkoutExercise) => { await api(`/workout-exercises/${item.id}`, { method:'PATCH', body:JSON.stringify({ skipped:!item.skipped }) }); refresh() }
  const addExercise = async (exerciseId:number) => { await api(`/workouts/${workout.id}/exercises`, { method:'POST', body:JSON.stringify({ exercise_id:exerciseId }) }); setAdding(false); refresh() }
  const seconds = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0

  return <main className="workout-page">
    <header className="topbar"><Brand /><span className="live-badge"><i /> SESIÓN EN CURSO</span></header>
    <div className="session-title"><div><p className="eyebrow">HOY TOCA</p><h1>{routineInfo[workout.routine.name]?.title || workout.routine.name}<em>.</em></h1><div className="session-metrics"><span>{workout.exercises.length} ejercicios</span><span>{workout.exercises.reduce((total,item)=>total+item.sets.length,0)} series registradas</span></div></div><div className="header-actions"><button onClick={finish} className="primary">Finalizar sesión ↗</button><button onClick={cancelWorkout} className="cancel-workout">Cancelar entrenamiento</button></div></div>
    <ErrorNotice message={error} />
    {seconds > 0 && <div className="rest-timer" role="timer" aria-label="Tiempo de descanso restante"><div><p className="eyebrow">RECUPERA EL AIRE</p><b>Tu siguiente serie te espera.</b></div><span className="rest-clock">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span><button onClick={()=>setRestUntil(null)}>Omitir descanso</button><div className="rest-track" aria-hidden="true"><span style={{width:(seconds/180*100)+'%'}} /></div></div>}
    <div className="workout-layout"><div className="workout-content">
      <div className="section-heading"><h2>Tu entrenamiento</h2><span className="eyebrow">{workout.routine.name}</span></div>
      <div className="session">{workout.exercises.map(item=> { const ref=reference(item), type=typeFor(item); return <section className={'exercise-card '+(item.skipped ? 'skip' : '')} key={item.id}>
        <div className="exercise-heading"><span className="exercise-number">{String(item.position).padStart(2,'0')}</span><h2>{item.exercise_name_snapshot}</h2></div>
        <div className="exercise-toolbar"><span className="badge">{item.skipped ? 'Omitido' : item.sets.length+' series'}</span><div className="exercise-actions"><button aria-label={'Mover arriba: '+item.exercise_name_snapshot} onClick={()=>move(item,-1)} disabled={item.position===1}>↑</button><button aria-label={'Mover abajo: '+item.exercise_name_snapshot} onClick={()=>move(item,1)} disabled={item.position===workout.exercises.length}>↓</button><button onClick={()=>toggle(item)}>{item.skipped ? 'Reanudar' : 'Saltar'}</button></div></div>
        {!item.skipped && <>
          {ref && <div className="previous-set"><span>ÚLTIMA VEZ</span><b>{referenceSetLabel(ref)}</b></div>}
          <div className="sets">{item.sets.map(set=><div className="set-row" key={set.id}><span className="set-number">{String(set.position).padStart(2,'0')}</span><span className="set-value">{referenceSetLabel(set)}<small>{set.set_type==='WARMUP' ? 'Calentamiento' : 'Trabajo'}</small></span><div className="set-actions"><button aria-label={'Editar serie '+set.position+' de '+item.exercise_name_snapshot} onClick={()=>editSet(set)}>Editar</button><button className="icon-danger" aria-label={'Eliminar serie '+set.position+' de '+item.exercise_name_snapshot} onClick={()=>deleteSet(set)}>×</button></div></div>)}</div>
          <div className="quick">
            <label className="field weight-type"><span>Tipo de carga</span><select value={type} onChange={event=>setWeightTypes({...weightTypes,[item.id]:event.target.value as WeightType})}>{(['EXTERNAL','BODYWEIGHT','BODYWEIGHT_PLUS','BODYWEIGHT_ASSISTED'] as WeightType[]).map(option=><option key={option} value={option}>{weightLabel(option)}</option>)}</select><small>{weightLabel(type)}</small></label>
            {type!=='BODYWEIGHT' && <label className="field"><span>Peso <small>({convention(item)})</small></span><input aria-label={'Peso: '+item.exercise_name_snapshot} inputMode="decimal" placeholder="0" value={weights[item.id] || ''} onChange={event=>setWeights({...weights,[item.id]:event.target.value})} /></label>}
            <label className="field"><span>Repeticiones</span><input aria-label={'Repeticiones: '+item.exercise_name_snapshot} inputMode="numeric" placeholder="0" value={reps} onChange={event=>setReps(event.target.value)} /></label>
          </div>
          <div className="record-row"><label className="checkbox-label"><input type="checkbox" checked={warm} onChange={event=>setWarm(event.target.checked)} />Calentamiento</label><button className="record" disabled={!reps} onClick={()=>add(item)}>＋ Registrar serie</button></div>
        </>}
      </section> })}</div>
      <button className="add" onClick={()=>setAdding(true)} aria-haspopup="dialog">＋ Agregar o sustituir ejercicio</button>
    </div><RecentWorkoutReference workouts={recent} routineName={workout.routine.name} error={referenceError} retry={loadReference} /></div>
    {adding && <ExercisePicker catalog={catalog} choose={addExercise} close={()=>setAdding(false)} />}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
