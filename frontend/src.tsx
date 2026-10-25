import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import {SetEditor,type EditDraft} from './set-editor'
import { Progress } from './progress'
import { AttendanceCalendar } from './attendance'
import { clearDrafts, readDraft, saveDraft, useWallClock, FloatingTimer } from './session-continuity'
import { recentExerciseRecords, type ExerciseRecordReference } from './recent-exercise-records'
import { referenceSetLabel } from './set-label'

const API = '/api'
type WeightType = 'EXTERNAL'|'BODYWEIGHT'|'BODYWEIGHT_PLUS'|'BODYWEIGHT_ASSISTED'
type WorkoutSet = { id:number; position:number; reps:number; load_value:number|null; load_unit:'kg'|'lb'; weight_type:WeightType; set_type:string; created_at:string }
type WorkoutExercise = { id:number; exercise_id:number|null; exercise_name_snapshot:string; position:number; skipped:boolean; sets:WorkoutSet[] }
type Workout = { id:number; routine_id:number; started_at:string; ended_at:string|null; rest_until:string|null; notes:string|null; routine:{name:string}; exercises:WorkoutExercise[] }
type Exercise = { id:number; name:string; load_convention:'TOTAL'|'PER_HAND' }

class ApiError extends Error {
  constructor(public status:number, message:string) { super(message) }
}
async function api(path:string, options:RequestInit = {}) {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type','application/json')
  const response = await fetch(API + path, { ...options, headers, credentials:'same-origin', cache:'no-store' })
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('gym:unauthorized'))
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, typeof body.detail === 'string' ? body.detail : 'No se pudo completar la solicitud')
  }
  return response.status === 204 ? null : response.json()
}
function timestamp(date:string) { return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(date)?date:date+'Z').getTime() }
function clock(seconds:number) { return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(value=>String(value).padStart(2,'0')).join(':') }
function formatDate(date:string) { return new Intl.DateTimeFormat('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(timestamp(date))) }
function duration(workout:Workout) { if (!workout.ended_at) return ''; const minutes = Math.max(0, Math.round((timestamp(workout.ended_at) - timestamp(workout.started_at)) / 60000)); return minutes >= 60 ? [`${Math.floor(minutes / 60)} h`, minutes % 60 ? `${minutes % 60} min` : ''].filter(Boolean).join(' ') : `${minutes} min` }
function weightLabel(type:WeightType) { return ({ EXTERNAL:'Carga externa', BODYWEIGHT:'Peso corporal', BODYWEIGHT_PLUS:'Peso corporal + carga', BODYWEIGHT_ASSISTED:'Peso corporal asistido' })[type] }

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

function Login({done, notice, retry}:{done:(owner:{username:string})=>void;notice:string;retry:()=>void}) {
  const [username,setUsername]=useState(''), [password,setPassword]=useState(''), [remember,setRemember]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState('')
  const [registration,setRegistration]=useState(false), [available,setAvailable]=useState(false), [activation,setActivation]=useState(''), [confirmation,setConfirmation]=useState(''), [statusError,setStatusError]=useState('')
  const loadStatus=async ()=>{
    setStatusError('')
    try {
      const status=await api('/auth/registration')
      setAvailable(status.available)
      setRegistration(status.available && !status.configured)
      if (!status.available && !status.configured) setStatusError('La creación de tu cuenta aún no está habilitada. Falta activar el acceso en el servidor.')
    } catch { setStatusError('No se pudo comprobar si puedes crear tu cuenta. Inténtalo de nuevo.') }
  }
  useEffect(()=>{loadStatus()},[])
  const submit=async (event:React.FormEvent)=>{
    event.preventDefault()
    if (busy) return
    if (registration && password!==confirmation) {setError('Las contraseñas no coinciden'); return}
    setBusy(true); setError('')
    try {
      const owner=await api(registration ? '/auth/register' : '/auth/login',{method:'POST',body:JSON.stringify({username,password,remember,...(registration ? {setup_token:activation} : {})})})
      setPassword(''); setConfirmation(''); setActivation(''); done(owner)
    } catch(err) { setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión') }
    finally { setBusy(false) }
  }
  return <main className="login-page"><header className="topbar"><Brand /><span className="live-badge">ACCESO PRIVADO</span></header>
    <div className="login-layout"><div className="login-intro"><p className="eyebrow">TU ESPACIO DE ENTRENAMIENTO</p><h1>Tu esfuerzo.<br/><em>Tu progreso.</em></h1><p className="hero-description">Tus rutinas, tus series y tu historial. Inicia sesión para continuar donde lo dejaste.</p></div>
      <section className="login-card" aria-labelledby="login-title"><p className="eyebrow">{registration ? 'TU CUENTA PERSONAL' : 'BIENVENIDO DE NUEVO'}</p><h2 id="login-title">{registration ? 'Crear mi cuenta' : 'Iniciar sesión'}</h2>
        {notice && <div className="login-notice"><p role="status">{notice}</p><button onClick={retry} disabled={busy}>Comprobar sesión</button></div>}
        <ErrorNotice message={error}/>
        {statusError && <div className="login-notice"><p role="status">{statusError}</p><button onClick={loadStatus} disabled={busy}>Comprobar acceso</button></div>}
        <form onSubmit={submit}>
          <label className="field"><span>Usuario</span><input autoComplete="username" name="username" value={username} onChange={e=>setUsername(e.target.value)} maxLength={100} required disabled={busy}/></label>
          <label className="field"><span>Contraseña</span><input type="password" autoComplete={registration ? 'new-password' : 'current-password'} name="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={registration ? 12 : 1} maxLength={128} required disabled={busy}/></label>
          {registration && <>
            <p className="muted">Elige una contraseña de al menos 12 caracteres. Esta será la única cuenta de la aplicación.</p>
            <label className="field"><span>Confirmar contraseña</span><input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={12} maxLength={128} required disabled={busy}/></label>
            <label className="field"><span>Código de activación</span><input type="password" autoComplete="off" value={activation} onChange={e=>setActivation(e.target.value)} minLength={20} maxLength={256} required disabled={busy}/></label>
            <p className="muted">Usa el código privado de activación para vincular tu cuenta con tus entrenamientos.</p>
          </>}
          <label className="checkbox-label"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} disabled={busy}/>Mantener mi sesión iniciada</label>
          <p className="muted login-hint">Recuerda este dispositivo para entrar directamente a tu entrenamiento.</p>
          <button className="primary" type="submit" disabled={busy}>{busy ? (registration ? 'Creando cuenta…' : 'Entrando…') : (registration ? 'Crear cuenta y entrar ↗' : 'Entrar a mi espacio ↗')}</button>
        </form>
        {available && <button disabled={busy} onClick={()=>{setRegistration(!registration);setPassword('');setConfirmation('');setActivation('');setError('')}}>{registration ? 'Ya tengo acceso. Iniciar sesión' : 'Crear mi cuenta'}</button>}
      </section>
    </div>
  </main>
}

function App() {
  const [owner,setOwner]=useState<{username:string}|null>(null), [checking,setChecking]=useState(true), [opened,setOpened]=useState(false), [notice,setNotice]=useState(''), [version,setVersion]=useState(0), [closing,setClosing]=useState(false)
  const authenticated=(next:{username:string})=>{ setOwner(next); setOpened(true); setNotice(''); setVersion(v=>v+1) }
  const check=async ()=>{
    setChecking(true)
    try { authenticated(await api('/auth/session')) }
    catch(err) { setOwner(null); setNotice(err instanceof ApiError && err.status===401 ? '' : 'No se pudo comprobar tu sesión. Revisa la conexión e inténtalo de nuevo.') }
    finally { setChecking(false) }
  }
  useEffect(()=>{
    check()
    const expired=()=>{ setOwner(null); setNotice('Tu sesión venció. Vuelve a entrar; los datos que estabas escribiendo se conservan en esta pantalla.') }
    window.addEventListener('gym:unauthorized',expired)
    return ()=>window.removeEventListener('gym:unauthorized',expired)
  },[])
  const logout=async ()=>{
    setClosing(true)
    try { await api('/auth/logout',{method:'POST'}); clearDrafts(); window.dispatchEvent(new Event('gym:logout')); setOpened(false); setOwner(null); setNotice('') }
    catch(err) { setNotice(err instanceof Error ? err.message : 'No se pudo cerrar la sesión') }
    finally { setClosing(false) }
  }
  return <>
    {checking ? <main className="auth-check"><Brand/><p role="status">Comprobando tu sesión…</p></main> : !owner && <Login done={authenticated} notice={notice} retry={check}/>}
    {opened && <div hidden={!owner || checking}>
      <div className="account-bar"><span>{owner?.username}</span><button onClick={logout} disabled={closing}>{closing ? 'Cerrando…' : 'Cerrar sesión'}</button></div>
      {owner && notice && <main><ErrorNotice message={notice}/></main>}
      <WorkoutApp authVersion={version}/>
    </div>}
  </>
}

function WorkoutApp({authVersion}:{authVersion:number}) {
  type AppView='home'|'history'|'detail'|'session'|'progress'|'settings'
  const [active, setActive] = useState<Workout|null>(null), [routines, setRoutines] = useState<any[]>([]), [history, setHistory] = useState<Workout[]>([]), [selected, setSelected] = useState<Workout|null>(null), [view, setView] = useState<AppView>('home'), [error, setError] = useState(''), [loadingDetail, setLoadingDetail] = useState(false)
  const [lifecycleBusy,setLifecycleBusy]=useState(false)
  const initialLoad = useRef(true),loadVersion=useRef(0),mutating=useRef(false)
  const load = async () => {
    if(mutating.current)return
    const expected=++loadVersion.current
    try {
      const [current,nextRoutines,nextHistory]=await Promise.all([api('/workouts/active'),api('/routines'),api('/workouts')])
      if(expected!==loadVersion.current || mutating.current)return
      setError('');setActive(current);setRoutines(nextRoutines);setHistory(nextHistory)
      if(initialLoad.current){setView(current?'session':'home');initialLoad.current=false}
    }catch(err){if(expected===loadVersion.current)setError(err instanceof Error?err.message:'No se pudo cargar la sesión')}
  }
  useEffect(() => { load() }, [authVersion])
  useEffect(()=>{const resume=()=>{if(document.visibilityState==='visible')load()};window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);document.addEventListener('visibilitychange',resume);return()=>{loadVersion.current++;window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',resume)}},[])
  const mutate=async(action:()=>Promise<void>)=>{
    if(mutating.current)return
    mutating.current=true;setLifecycleBusy(true);loadVersion.current++;setError('')
    let failure=''
    try{await action()}catch(err){failure=err instanceof Error?err.message:'No se pudo guardar el cambio'}
    finally{mutating.current=false;await load();setLifecycleBusy(false);if(failure)setError(failure)}
  }
  const start = (routineId:number) => mutate(async()=>{setActive(await api('/workouts',{method:'POST',body:JSON.stringify({routine_id:routineId})}));setView('session')})
  const finish = () => {if(active && confirm('¿Finalizar entrenamiento?'))mutate(async()=>{await api(`/workouts/${active.id}/finish`,{method:'POST'});clearDrafts(active.id);setActive(null);setView('history')})}
  const cancelWorkout = () => {if(active && confirm('¿Cancelar este entrenamiento? Se eliminarán todas las series registradas.'))mutate(async()=>{await api(`/workouts/${active.id}`,{method:'DELETE'});clearDrafts(active.id);setActive(null);setView('home')})}
  const deleteWorkout = async (workout:Workout) => { if (confirm('¿Eliminar este entrenamiento del historial? Esta acción no se puede deshacer.')) { try { setError(''); await api(`/workouts/${workout.id}`, { method:'DELETE' }); setSelected(null); setView('history'); await load() } catch (err:any) { setError(err.message) } } }
  const openDetail = async (workoutId:number) => { try { setError(''); setLoadingDetail(true); setSelected(await api(`/workouts/${workoutId}`)); setView('detail') } catch (err:any) { setError(err.message) } finally { setLoadingDetail(false) } }

  return <><div className={active ? 'browsing-active' : ''} hidden={view==='session'}>{view==='detail' && selected ? <WorkoutDetail workout={selected} back={()=>setView('history')} deleteWorkout={deleteWorkout} error={error}/> : <main>
    <header className="topbar"><Brand /></header>
    <ErrorNotice message={error} />
    <div className="hero"><div><p className="eyebrow">{view === 'home' ? 'TU PRÓXIMA SESIÓN' : 'TU RECORRIDO'}</p><h1>{view === 'home' ? <>Cada serie<br /><em>cuenta.</em></> : <>Trabajo hecho.<br /><em>Fuerza ganada.</em></>}</h1><p className="hero-description">{view === 'home' ? 'Elige tu rutina. Encuentra tu ritmo. Hazla tuya.' : 'Vuelve a tus entrenamientos y encuentra tu referencia.'}</p></div><div className="hero-art" aria-hidden="true"><span>///</span><small>KEEP SHOWING UP</small></div></div>
    {view==='progress'?<Progress workouts={history} open={openDetail}/>:view==='history'?<>
      <div className="section-heading"><h2>Historial</h2><span className="badge">{history.filter(workout=>workout.ended_at).length} sesiones</span></div>
      {loadingDetail && <p role="status" className="muted">Abriendo sesión…</p>}
      <AttendanceCalendar workouts={history} open={openDetail}/>
    </>:view==='settings'?<>
      <div className="section-heading"><h2>Configuración</h2></div>
      <section className="settings-placeholder"><span className="settings-placeholder-icon" aria-hidden="true">⚙</span><h3>Próximamente</h3><p>Este espacio se preparará para las opciones de tu cuenta y de la aplicación.</p></section>
    </>: <>
      <div className="section-heading"><h2>El entrenamiento de hoy</h2><span className="eyebrow">A TU RITMO</span></div>
      <div className="routine-grid">{routines.map(routine => { const info= routineInfo[routine.name]; return <button className="routine" data-routine={routine.name} key={routine.id} disabled={!!active || lifecycleBusy} onClick={() => start(routine.id)}>
        <span className="routine-top"><span className="routine-tag">{routine.name}</span><span className="routine-number" aria-hidden="true">{info?.number || '↗'}</span></span>
        <span className="routine-title">{info?.title || routine.name}</span><span className="routine-description">{info?.subtitle || 'Una sesión para ti'}</span>
        <span className="routine-footer"><span>{routine.exercises.length ? routine.exercises.length + ' ejercicios' : 'Empieza vacío'}</span><span className="round-arrow" aria-hidden="true">↗</span></span>
      </button> })}</div>
    </>}
    <footer className="page-footer"><Brand /><span>UNA SERIE A LA VEZ.</span></footer>
  </main>}</div>
    {view!=='session'&&<BottomNavigation view={view} navigate={setView}/>}
    {active && <div hidden={view!=='session'}><Session key={active.id} workout={active} history={history} lifecycleBusy={lifecycleBusy} refresh={load} finish={finish} cancelWorkout={cancelWorkout} error={error} browse={()=>setView('home')}/></div>}
    {active && <FloatingTimer workout={active}/>}
    {active && view!=='session' && <button className="resume-session" onClick={()=>setView('session')}>● Retomar {active.routine.name} <span>Entrenamiento en curso ↗</span></button>}
  </>
}

function BottomNavigation({view,navigate}:{view:'home'|'history'|'detail'|'session'|'progress'|'settings';navigate:(view:'home'|'history'|'detail'|'session'|'progress'|'settings')=>void}) {
  const items=[
    {id:'home' as const,label:'Entrenar',path:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>},
    {id:'history' as const,label:'Historial',path:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 17h6"/></>},
    {id:'progress' as const,label:'Progreso',path:<><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></>},
    {id:'settings' as const,label:'Ajustes',path:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6L8 16.2l1.4-1.1a8 8 0 0 1 0-2l-1.4-1.2 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.2a8 8 0 0 1-.2 1.9Z" transform="translate(-1 -2)"/></>}
  ]
  const current=view==='detail'?'history':view
  return <nav className="bottom-navigation" aria-label="Navegación principal">{items.map(item=><button key={item.id} className={current===item.id?'nav-active':''} aria-current={current===item.id?'page':undefined} onClick={()=>navigate(item.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.path}</svg><span>{item.label}</span></button>)}</nav>
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

function ExerciseHistory({name,records}:{name:string;records:ExerciseRecordReference[]}) {
  return <aside className="exercise-history-reference" aria-label={'Historial de '+name}>
    <div className="exercise-history-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2"/></svg><h3>Historial de este ejercicio</h3></div>
    {records.length>0?<ol className="exercise-history-records">{records.map((record,index)=><li className="exercise-history-row" key={record.set.id}>
      <span className="exercise-history-meta"><time dateTime={record.date}>{new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(new Date(timestamp(record.date)))}</time><span>Serie {record.set.position}</span></span>
      <b>{referenceSetLabel(record.set)}</b><small>{index===0?'Último registro':'Registro anterior'}</small>
    </li>)}</ol>:<p className="exercise-history-empty">Aún no hay registros de este ejercicio. Aquí verás tus últimas series al completar una sesión.</p>}
  </aside>
}

type ExerciseDraft = {name:string; convention:'TOTAL'|'PER_HAND'}
function ExercisePicker({catalog,choose,custom,close,draft,setDraft}:{catalog:Exercise[];choose:(id:number)=>Promise<void>;custom?: (name:string,convention:'TOTAL'|'PER_HAND')=>Promise<void>;close:()=>void;draft:ExerciseDraft;setDraft:(value:ExerciseDraft)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    const node=dialog.current, opener=document.activeElement as HTMLElement|null
    node?.showModal()
    return ()=>{ node?.close(); opener?.focus() }
  },[])
  const run=async(action:()=>Promise<void>)=>{
    setBusy(true);setError('')
    try { await action() }
    catch(err) { if(err instanceof ApiError && err.status===401) close(); else setError(err instanceof Error?err.message:'No se pudo agregar el ejercicio') }
    finally { setBusy(false) }
  }
  return <dialog className="sheet" ref={dialog} onCancel={event=>{if(busy)event.preventDefault();else close()}} aria-labelledby="catalog-title">
    <div className="sheet-heading"><div><p className="eyebrow">DALE TU FORMA</p><h2 id="catalog-title">Agregar o sustituir</h2></div><button onClick={close} disabled={busy} aria-label="Cerrar catálogo">×</button></div>
    <p className="muted">Elige un ejercicio. Puedes saltar el que quieras sustituir.</p>
    <ErrorNotice message={error}/>
    {custom && <form className="custom-exercise" onSubmit={event=>{event.preventDefault();run(()=>custom(draft.name,draft.convention))}}>
      <h3>¿No está en la lista?</h3>
      <label className="field"><span>Nombre del ejercicio</span><input value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})} required maxLength={100} disabled={busy}/></label>
      <label className="field"><span>Cómo registrarás la carga</span><select aria-label="Cómo registrarás la carga" value={draft.convention} onChange={event=>setDraft({...draft,convention:event.target.value as 'TOTAL'|'PER_HAND'})} disabled={busy}><option value="TOTAL">Carga total</option><option value="PER_HAND">Por mano</option></select></label>
      <button className="primary" disabled={busy || !draft.name.trim()}>{busy?'Agregando…':'Crear y agregar ejercicio'}</button>
      <small>Se guardará en tu catálogo para próximas sesiones.</small>
    </form>}
    <div className="catalog-list">{catalog.map(exercise=><button key={exercise.id} disabled={busy} onClick={()=>run(()=>choose(exercise.id))}><span>{exercise.name}</span><span aria-hidden="true">＋</span></button>)}</div>
    <button className="sheet-close" disabled={busy} onClick={close}>Volver al entrenamiento</button>
  </dialog>
}

function Session({ workout, history, refresh, finish, cancelWorkout, error, browse, lifecycleBusy }:{ workout:Workout; history:Workout[]; refresh:() => Promise<void>; finish:() => void; cancelWorkout:() => void; error:string; browse:()=>void; lifecycleBusy:boolean }) {
  const [draft]=useState(()=>readDraft(workout.id))
  const [weights, setWeights] = useState<Record<number,string>>(draft.weights||{}), [weightTypes, setWeightTypes] = useState<Record<number,WeightType>>(draft.weightTypes||{}), [reps, setReps] = useState<Record<number,string>>(draft.repsById || (draft.reps && workout.exercises[0]?{[workout.exercises[0].id]:draft.reps}:{})), [warm, setWarm] = useState<Record<number,boolean>>(draft.warmsById || (draft.warm && workout.exercises[0]?{[workout.exercises[0].id]:true}:{})), [adding, setAdding] = useState(false), [catalog, setCatalog] = useState<Exercise[]>([]), [catalogError, setCatalogError] = useState('')
  const now=useWallClock()
  const loadCatalog = () => { setCatalogError(''); api('/exercises').then(setCatalog).catch((err:any)=>setCatalogError(err.message)) }
  useEffect(() => { loadCatalog() }, [workout.id])
  const [customDraft,setCustomDraft]=useState<ExerciseDraft>(draft.customDraft||{name:'',convention:'TOTAL'})
  useEffect(()=>{saveDraft(workout.id,{weights,weightTypes,repsById:reps,warmsById:warm,customDraft})},[workout.id,weights,weightTypes,reps,warm,customDraft])
  const exercise = (item:WorkoutExercise) => catalog.find(entry => entry.id === item.exercise_id)
  const convention = (item:WorkoutExercise) => exercise(item)?.load_convention === 'PER_HAND' ? 'lb por mano' : 'lb totales'
  const typeFor = (item:WorkoutExercise):WeightType => weightTypes[item.id] || 'EXTERNAL'
  const inFlight=useRef(false),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[editing,setEditing]=useState<EditDraft|null>(null),[editVisible,setEditVisible]=useState(false)
  const locked=busy||lifecycleBusy
  const run=async(action:()=>Promise<void>)=>{
    if(inFlight.current||lifecycleBusy)return
    inFlight.current=true;setBusy(true);setActionError('')
    try{await action()}catch(err){setActionError(err instanceof Error?err.message:'No se pudo guardar el cambio')}
    finally{inFlight.current=false;setBusy(false)}
  }
  const add=(item:WorkoutExercise)=>run(async()=>{
    const count=Number(reps[item.id]),load=weights[item.id]?.trim().replace(',','.'),type=typeFor(item)
    if(!Number.isInteger(count)||count<1||count>999)throw new Error('Escribe entre 1 y 999 repeticiones.')
    if(type!=='BODYWEIGHT' && load && (!Number.isFinite(Number(load))||Number(load)<0))throw new Error('La carga debe ser un número válido, igual o mayor que cero.')
    await api(`/workout-exercises/${item.id}/sets`,{method:'POST',body:JSON.stringify({reps:count,load_value:type==='BODYWEIGHT'||!load?null:Number(load),load_unit:'lb',weight_type:type,set_type:warm[item.id]?'WARMUP':'WORKING'})})
    setReps(current=>({...current,[item.id]:''}));setWarm(current=>({...current,[item.id]:false}));await refresh()
  })
  const editSet=(record:WorkoutSet)=>{setEditing({record,reps:String(record.reps),load:record.load_value===null?'':String(record.load_value)});setEditVisible(true)}
  const saveSet=async(changes:{reps:number;load_value:number|null})=>{if(!editing)return;await api(`/sets/${editing.record.id}`,{method:'PATCH',body:JSON.stringify(changes)});await refresh()}
  const deleteSet=(set:WorkoutSet)=>{if(confirm('¿Eliminar esta serie?'))run(async()=>{await api(`/sets/${set.id}`,{method:'DELETE'});await refresh()})}
  const move=(item:WorkoutExercise,direction:number)=>run(async()=>{await api(`/workout-exercises/${item.id}`,{method:'PATCH',body:JSON.stringify({position:Math.max(1,item.position+direction)})});await refresh()})
  const toggle=(item:WorkoutExercise)=>run(async()=>{await api(`/workout-exercises/${item.id}`,{method:'PATCH',body:JSON.stringify({skipped:!item.skipped})});await refresh()})
  const addExercise = async (exerciseId:number) => { await api(`/workouts/${workout.id}/exercises`, { method:'POST', body:JSON.stringify({ exercise_id:exerciseId }) }); setAdding(false); refresh() }
  const addCustomExercise=async(name:string,convention:'TOTAL'|'PER_HAND')=>{
    const item=await api(`/workouts/${workout.id}/exercises`,{method:'POST',body:JSON.stringify({name,load_convention:convention})})
    setCatalog(current=>current.some(entry=>entry.id===item.exercise_id)?current:[...current,{id:item.exercise_id,name:item.exercise_name_snapshot,load_convention:convention}])
    setCustomDraft({name:'',convention:'TOTAL'});setAdding(false);await refresh()
  }
  const seconds = workout.rest_until ? Math.max(0, Math.ceil((timestamp(workout.rest_until) - now) / 1000)) : 0
  const elapsed = Math.max(0,Math.floor((now-timestamp(workout.started_at))/1000))
  const skipRest = ()=>run(async()=>{await api(`/workouts/${workout.id}/rest/skip`,{method:'POST'});await refresh()})

  return <main className="workout-page">
    <header className="topbar"><Brand /><div className="session-navigation"><span className="live-badge"><i /> SESIÓN EN CURSO</span><button onClick={browse}>Explorar app</button></div></header>
    <div className="session-title"><div><p className="eyebrow">HOY TOCA</p><h1>{routineInfo[workout.routine.name]?.title || workout.routine.name}<em>.</em></h1><div className="session-metrics"><span role="timer" aria-label="Tiempo de sesión">{clock(elapsed)}</span><span>{workout.exercises.length} ejercicios</span><span>{workout.exercises.reduce((total,item)=>total+item.sets.length,0)} series registradas</span></div></div><div className="header-actions"><button disabled={locked} onClick={finish} className="primary">Finalizar sesión ↗</button><button disabled={locked} onClick={cancelWorkout} className="cancel-workout">Cancelar entrenamiento</button></div></div>
    <ErrorNotice message={error || actionError} />
    {editing && !editVisible && <button onClick={()=>setEditVisible(true)}>Continuar edición de serie</button>}
    {busy && <p role="status" className="muted">Guardando cambio…</p>}
    {seconds > 0 && <div className="rest-timer" role="timer" aria-label="Tiempo de descanso restante"><div><p className="eyebrow">RECUPERA EL AIRE</p><b>Tu siguiente serie te espera.</b></div><span className="rest-clock">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span><button disabled={locked} onClick={skipRest}>Omitir descanso</button><div className="rest-track" aria-hidden="true"><span style={{width:(seconds/165*100)+'%'}} /></div></div>}
    <div className="workout-content">
      <div className="section-heading"><h2>Tu entrenamiento</h2><span className="eyebrow">{workout.routine.name}</span></div>
      <div className="session">{workout.exercises.map(item=> { const records=recentExerciseRecords(history,item.exercise_id), type=typeFor(item); return <div className="exercise-group" key={item.id}><section className={'exercise-card '+(item.skipped ? 'skip' : '')}><fieldset className="exercise-fields" disabled={locked}>
        <div className="exercise-heading"><span className="exercise-number">{String(item.position).padStart(2,'0')}</span><h2>{item.exercise_name_snapshot}</h2></div>
        <div className="exercise-toolbar"><span className="badge">{item.skipped ? 'Omitido' : item.sets.length+' series'}</span><div className="exercise-actions"><button aria-label={'Mover arriba: '+item.exercise_name_snapshot} onClick={()=>move(item,-1)} disabled={item.position===1}>↑</button><button aria-label={'Mover abajo: '+item.exercise_name_snapshot} onClick={()=>move(item,1)} disabled={item.position===workout.exercises.length}>↓</button><button onClick={()=>toggle(item)}>{item.skipped ? 'Reanudar' : 'Saltar'}</button></div></div>
        {!item.skipped && <>
          <div className="sets">{item.sets.map(set=><div className="set-row" key={set.id}><span className="set-number">{String(set.position).padStart(2,'0')}</span><span className="set-value">{referenceSetLabel(set)}<small>{set.set_type==='WARMUP' ? 'Calentamiento' : 'Trabajo'}</small></span><div className="set-actions"><button aria-label={'Editar serie '+set.position+' de '+item.exercise_name_snapshot} onClick={()=>editSet(set)}>Editar</button><button className="icon-danger" aria-label={'Eliminar serie '+set.position+' de '+item.exercise_name_snapshot} onClick={()=>deleteSet(set)}>×</button></div></div>)}</div>
          <div className="quick">
            <label className="field weight-type"><span>Tipo de carga</span><select value={type} onChange={event=>setWeightTypes({...weightTypes,[item.id]:event.target.value as WeightType})}>{(['EXTERNAL','BODYWEIGHT','BODYWEIGHT_PLUS','BODYWEIGHT_ASSISTED'] as WeightType[]).map(option=><option key={option} value={option}>{weightLabel(option)}</option>)}</select><small>{weightLabel(type)}</small></label>
            {type!=='BODYWEIGHT' && <label className="field"><span>Peso <small>({convention(item)})</small></span><input aria-label={'Peso: '+item.exercise_name_snapshot} inputMode="decimal" placeholder="0" value={weights[item.id] || ''} onChange={event=>setWeights({...weights,[item.id]:event.target.value})} /></label>}
            <label className="field"><span>Repeticiones</span><input aria-label={'Repeticiones: '+item.exercise_name_snapshot} inputMode="numeric" placeholder="0" value={reps[item.id]||''} onChange={event=>setReps({...reps,[item.id]:event.target.value})} /></label>
          </div>
          <div className="record-row"><label className="checkbox-label"><input type="checkbox" checked={warm[item.id]||false} onChange={event=>setWarm({...warm,[item.id]:event.target.checked})} />Calentamiento</label><button className="record" disabled={locked || !reps[item.id]} onClick={()=>add(item)}>＋ Registrar serie</button></div>
        </>}
      </fieldset></section>{!item.skipped&&<ExerciseHistory name={item.exercise_name_snapshot} records={records}/>}</div> })}</div>
      {catalogError&&<div className="catalog-error"><ErrorNotice message={'No se pudo cargar el catálogo: '+catalogError}/><button onClick={loadCatalog}>Reintentar catálogo</button></div>}
      <button disabled={locked} className="add" onClick={()=>setAdding(true)} aria-haspopup="dialog">＋ Agregar o sustituir ejercicio</button>
    </div>
    {editing && editVisible && <SetEditor draft={editing} change={setEditing} save={saveSet} close={()=>{setEditing(null);setEditVisible(false)}} suspend={()=>setEditVisible(false)}/>}
    {adding && <ExercisePicker catalog={catalog} choose={addExercise} custom={workout.routine.name==='FREE'?addCustomExercise:undefined} draft={customDraft} setDraft={setCustomDraft} close={()=>setAdding(false)} />}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
