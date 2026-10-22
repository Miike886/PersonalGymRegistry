import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const prefix='gym:session-draft:'
export function clearDrafts(id?:number) {
  try { for(const key of Object.keys(sessionStorage)) if(key.startsWith(prefix) && (id===undefined || key===prefix+id)) sessionStorage.removeItem(key) } catch {}
}
type Draft={weights?:Record<number,string>;weightTypes?:Record<number,'EXTERNAL'|'BODYWEIGHT'|'BODYWEIGHT_PLUS'|'BODYWEIGHT_ASSISTED'>;reps?:string;warm?:boolean;repsById?:Record<number,string>;warmsById?:Record<number,boolean>;customDraft?:{name:string;convention:'TOTAL'|'PER_HAND'}}
export function readDraft(id:number):Draft {
  try {
    const value=JSON.parse(sessionStorage.getItem(prefix+id)||'{}')
    if(!value || typeof value!=='object' || Array.isArray(value))return {}
    const map=(input:unknown)=>input && typeof input==='object' && !Array.isArray(input)?Object.fromEntries(Object.entries(input).filter(([key,val])=>/^\d+$/.test(key) && typeof val==='string')):{}
    const types=Object.fromEntries(Object.entries(map(value.weightTypes)).filter(([,val])=>['EXTERNAL','BODYWEIGHT','BODYWEIGHT_PLUS','BODYWEIGHT_ASSISTED'].includes(val))) as Draft['weightTypes']
    const warms=(value.warmsById && typeof value.warmsById==='object'?Object.fromEntries(Object.entries(value.warmsById).filter(([key,val])=>/^\d+$/.test(key) && typeof val==='boolean')):{}) as Record<number,boolean>
    return {weights:map(value.weights),weightTypes:types,reps:typeof value.reps==='string'?value.reps:'',warm:value.warm===true,repsById:value.repsById?map(value.repsById):undefined,warmsById:value.warmsById?warms:undefined,customDraft:{name:typeof value.customDraft?.name==='string'?value.customDraft.name:'',convention:value.customDraft?.convention==='PER_HAND'?'PER_HAND':'TOTAL'}}
  } catch {return {}}
}
export function saveDraft(id:number,draft:unknown) {
  try {sessionStorage.setItem(prefix+id,JSON.stringify(draft))} catch {}
}

export function useWallClock() {
  const [now,setNow]=useState(Date.now())
  useEffect(()=>{
    const update=()=>setNow(Date.now()),timer=window.setInterval(update,1000)
    window.addEventListener('focus',update);window.addEventListener('pageshow',update);document.addEventListener('visibilitychange',update)
    return ()=>{clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('pageshow',update);document.removeEventListener('visibilitychange',update)}
  },[])
  return now
}
type PiPWindow=Window & {documentPictureInPicture?:{requestWindow:(options:{width:number;height:number})=>Promise<Window>}}
function time(value:string) {return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value)?value:value+'Z')}
function clock(value:number) {return [Math.floor(value/3600),Math.floor(value/60)%60,value%60].map(v=>String(v).padStart(2,'0')).join(':')}
export function FloatingTimer({workout}:{workout:{started_at:string;rest_until:string|null;routine:{name:string}}}) {
  const now=useWallClock(),[popup,setPopup]=useState<Window|null>(null),[error,setError]=useState('')
  const opened=useRef<Window|null>(null)
  const generation=useRef(0)
  useEffect(()=>{
    const close=()=>{generation.current++;opened.current?.close();opened.current=null;setPopup(null)}
    window.addEventListener('gym:unauthorized',close);window.addEventListener('gym:logout',close)
    return ()=>{close();window.removeEventListener('gym:unauthorized',close);window.removeEventListener('gym:logout',close)}
  },[])
  const supported=!!(window as PiPWindow).documentPictureInPicture
  const open=async()=>{
    try {
      setError('');if(opened.current && !opened.current.closed){opened.current.focus();return}
      const expected=generation.current
      const next=await (window as PiPWindow).documentPictureInPicture!.requestWindow({width:320,height:230})
      if(expected!==generation.current){next.close();return}
      next.document.title='Gym Tracker · Temporizador'
      const style=next.document.createElement('style');style.textContent='body{background:#10130e;color:#f1f5eb;font:16px system-ui;margin:24px}strong{display:block;color:#c4f135;font:700 40px monospace;margin:14px 0}small{color:#c4cbbb}';next.document.head.append(style)
      next.addEventListener('pagehide',()=>{opened.current=null;setPopup(null)},{once:true})
      opened.current=next;setPopup(next)
    }catch{setError('No se pudo abrir la ventana flotante. Puedes seguir usando el reloj de la sesión.')}
  }
  const rest=workout.rest_until?Math.max(0,Math.ceil((time(workout.rest_until)-now)/1000)):0
  return <>
    <aside className="continuity-tools">
      {supported?<button onClick={open}>↗ Temporizador en ventana flotante</button>:<small>El tiempo se conserva al cambiar de aplicación. Este navegador no permite superponer este reloj fuera de la app.</small>}
      {error && <p role="alert">{error}</p>}
    </aside>
    {popup && createPortal(<section aria-label="Temporizador flotante"><small>{workout.routine.name} · {rest?'DESCANSO':'TIEMPO DE SESIÓN'}</small><strong role="timer">{clock(rest || Math.max(0,Math.floor((now-time(workout.started_at))/1000)))}</strong><p>{rest?'Tu próxima serie te espera.':'Vuelve a la app para registrar tu siguiente serie.'}</p><button onClick={()=>popup.close()}>Cerrar ventana</button></section>,popup.document.body)}
  </>
}
