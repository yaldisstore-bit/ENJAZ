import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';

type Op='search'|'summarize'|'compare'|'draft'|'explain';
type Props=Readonly<{workspace:Promise<string|null>;invoke:(body:Readonly<Record<string,unknown>>)=>Promise<Response>}>;
type Citation=Readonly<{citationId:string;title:string;subtitle:string|null;destination:string;domain:string}>;
type Result=Readonly<{answer:string;citations:readonly Citation[]}>;
const OPS=[['explain','اشرح'],['search','ابحث'],['summarize','لخّص'],['draft','مسودة'],['compare','قارن']] as const;
const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]',PLACEHOLDER='[data-live-deferred="true"]';

function parse(value:unknown):Result{
 const x=value as {schema?:unknown;ok?:unknown;result?:{answer?:unknown;citations?:unknown};error?:{message?:unknown}}|null;
 if(!x||x.schema!=='enjaz.copilot.context.v1'||x.ok!==true||typeof x.result?.answer!=='string'||!Array.isArray(x.result.citations))throw new Error(typeof x?.error?.message==='string'?x.error.message:'تعذر قراءة رد مساعد إنجاز.');
 const citations=x.result.citations.map((v)=>{
  const c=v as Partial<Citation>;
  if(typeof c.citationId!=='string'||typeof c.title!=='string'||typeof c.destination!=='string'||!c.destination.startsWith('/app/'))throw new Error('تعذر التحقق من مراجع الرد.');
  return {citationId:c.citationId,title:c.title,subtitle:typeof c.subtitle==='string'?c.subtitle:null,destination:c.destination,domain:typeof c.domain==='string'?c.domain:''};
 });
 return {answer:x.result.answer,citations};
}

function Copilot({workspace,invoke}:Props){
 const [op,setOp]=useState<Op>('explain'),[query,setQuery]=useState(''),[compare,setCompare]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null),[asked,setAsked]=useState('');
 const submit=async()=>{const q=query.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120),b=compare.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120);if(q.length<2||op==='compare'&&b.length<2)return;setBusy(true);setError('');try{const ws=await workspace;if(!ws)throw new Error('تعذر تحديد مساحة العمل.');const response=await invoke({workspaceId:ws,requestId:crypto.randomUUID(),operation:op,query:q,...(op==='compare'?{compareWith:b}:{})});const data=await response.json().catch(()=>null);if(!response.ok){const message=(data as {error?:{message?:unknown}}|null)?.error?.message;throw new Error(typeof message==='string'?message:'تعذر تنفيذ الطلب.')}setResult(parse(data));setAsked(op==='compare'?q+' ↔ '+b:q)}catch(e){setResult(null);setError(e instanceof Error?e.message:'تعذر تنفيذ الطلب.')}finally{setBusy(false)}};
 return <div className="r2-screen r2-oi-workspace r2-oi-copilot" data-copilot-stage="12.2" data-copilot-authority="read-only-context">
  <header className="r2-oi-header"><div><p className="r2-eyebrow">المساعد الذكي · 12.2</p><h1>مساعد إنجاز</h1><p>مساعدة سياقية من سجلات إنجاز المصرح بها، مع مراجع لكل معلومة.</p></div><span className="r2-oi-stage">Contextual Assistance</span></header>
  <section className="r2-copilot-context"><span>حدود المساعد</span><strong>قراءة فقط · لا ينفذ أي إجراء</strong><small>الإجابة مساعدة غير معتمدة؛ السجل الأصلي المشار إليه يبقى مصدر الحقيقة.</small></section>
  <div className="r2-placeholder-actions" aria-label="نوع المساعدة">{OPS.map(([id,label])=><button type="button" key={id} className={op===id?'r2-action r2-action--primary':'r2-action r2-action--secondary'} aria-pressed={op===id} onClick={()=>setOp(id)} disabled={busy}>{label}</button>)}</div>
  <section className="r2-copilot-thread" aria-live="polite">
   {asked?<div className="r2-copilot-message r2-copilot-message--user"><span>أنت</span><p>{asked}</p></div>:null}
   {result?<div className="r2-copilot-message r2-copilot-message--assistant"><span>إنجاز · مستند إلى {result.citations.length} مرجع</span><p>{result.answer}</p></div>:null}
   {result?.citations.map(c=><button type="button" className="r2-action r2-action--secondary" key={c.citationId} onClick={()=>window.location.assign(c.destination)}>{c.citationId} · {c.title}{c.subtitle?' — '+c.subtitle:''}</button>)}
   {error?<p className="r2-oi-truth" role="alert">{error}</p>:null}
  </section>
  {op==='compare'?<div className="r2-copilot-compose"><input value={compare} maxLength={120} onChange={e=>setCompare(e.currentTarget.value)} aria-label="السياق الثاني للمقارنة" placeholder="اكتب الطرف الثاني للمقارنة…"/><span/></div>:null}
  <form className="r2-copilot-compose" onSubmit={e=>{e.preventDefault();void submit()}}><input value={query} maxLength={120} onChange={e=>setQuery(e.currentTarget.value)} aria-label="رسالة إلى مساعد إنجاز" placeholder="ابحث عن شركة، معاملة، شخص، إجراء أو وثيقة…"/><button type="submit" disabled={busy||query.trim().length<2||(op==='compare'&&compare.trim().length<2)}>{busy?'جارٍ…':'إرسال'}</button></form>
 </div>;
}

export function LiveCopilotPortal(props:Props){
 const {active,target}=useLiveRecordsPortal('copilot',SHELL,PLACEHOLDER);
 return active&&target?createPortal(<Copilot {...props}/>,target):null;
}
