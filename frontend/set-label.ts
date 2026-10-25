type RecordedSet={reps:number;weight_type:string;load_value:number|null;load_unit:'kg'|'lb'}

export function referenceSetLabel(set:RecordedSet){
  const load=set.load_value===null?null:`${set.load_value} ${set.load_unit}`
  if(set.weight_type==='BODYWEIGHT')return `${set.reps}×peso corporal`
  if(set.weight_type==='BODYWEIGHT_PLUS')return `${set.reps}×peso corporal + ${load??'carga sin registrar'}`
  if(set.weight_type==='BODYWEIGHT_ASSISTED')return `${set.reps}×${load===null?'asistencia sin registrar':load+' de asistencia'}`
  return `${set.reps}×${load??'carga sin registrar'}`
}
