import {useEffect,useRef,useState} from 'react'

type SetRecord={id:number;reps:number;load_value:number|null;load_unit:'lb'|'kg';weight_type:string}
export type EditDraft={record:SetRecord;reps:string;load:string}
export function SetEditor({draft,change,save,close,suspend}:{draft:EditDraft;change:(draft:EditDraft)=>void;save:(changes:{reps:number;load_value:number|null})=>Promise<void>;close:()=>void;suspend:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),pending=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const node=dialog.current,opener=document.activeElement as HTMLElement|null;node?.showModal();return()=>{node?.close();opener?.focus()}},[])
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(pending.current)return
    pending.current=true;setBusy(true);setError('')
    try {await save({reps:Number(draft.reps),load_value:draft.record.weight_type==='BODYWEIGHT'||!draft.load.trim()?null:Number(draft.load)});close()}
    catch(err){if(err && typeof err==='object' && 'status' in err && err.status===401)suspend();else setError(err instanceof Error?err.message:'No se pudo editar la serie')}
    finally{pending.current=false;setBusy(false)}
  }
  return <dialog ref={dialog} className="sheet edit-sheet" aria-labelledby="edit-set-title" onCancel={event=>{event.preventDefault();if(!busy)close()}}><p className="eyebrow">AFINA TU REGISTRO</p><h2 id="edit-set-title">Editar serie</h2><ErrorBlock message={error}/><form onSubmit={submit}><fieldset disabled={busy}>
    <label className="field"><span>Repeticiones de la serie</span><input type="number" inputMode="numeric" min="1" max="999" step="1" required value={draft.reps} onChange={e=>change({...draft,reps:e.target.value})}/></label>
    {draft.record.weight_type!=='BODYWEIGHT' && <label className="field"><span>Peso de la serie ({draft.record.load_unit})</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.load} onChange={e=>change({...draft,load:e.target.value})}/><small>Deja vacío para carga sin registrar. Se conserva la unidad original.</small></label>}
    <div className="edit-actions"><button type="button" onClick={close}>Cancelar edición</button><button className="primary" type="submit">{busy?'Guardando…':'Guardar cambios'}</button></div>
  </fieldset></form></dialog>
}
function ErrorBlock({message}:{message:string}){return message?<p className="error" role="alert">{message}</p>:null}
