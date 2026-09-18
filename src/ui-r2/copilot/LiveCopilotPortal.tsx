import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';

type Op='search'|'summarize'|'compare'|'draft'|'explain';
type Props=Readonly<{workspace:Promise<string|null>;invoke:(body:Readonly<Record<string,unknown>>)=>Promise<Response>}>;
type Citation=Readonly<{citationId:string;title:string;subtitle?:string|null;destination:string}>;
type Result=Readonly<{answer:string;citations:readonly Citation[]}>;
const OPS=[['explain','اشرح'],['search','ابحث'],['summarize','لخّص'],['draft','مسودة'],['compare','قارن']] as const;
const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]',PLACEHOLDER='[data-live-deferred="true"]';

function parse(v:unknown):Result{
 const x=v as {schema?:unknown;ok?:unknown;result?:Result}|null,r=x?.result;
 if(!x||x.schema!=='enjaz.copilot.context.v1'||x.ok!==true||typeof r?.answer!=='string'||!Array.isArray(r.citations)||!r.citations.every(c=>typeof c.citationId==='string'&&typeof c.title==='string'&&typeof c.destination==='string'&&c.destination.startsWith('/app/')))throw new Error('تعذر قراءة رد مساعد إنجاز.');
 return r;
}
function Copilot({workspace,invoke}:Props){
 const[op,setOp]=useState<Op>('explain'),[query,setQuery]=useState(''),[other,setOther]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const submit=async()=>{const q=query.trim().slice(0,120),b=other.trim().slice(0,120);if(q.length<2||op==='compare'&&b.length<2)return;setBusy(true);setError('');try{const workspaceId=await workspace;if(!workspaceId)throw new Error('تعذر تحديد مساحة العمل.');const response=await invoke({workspaceId,requestId:crypto.randomUUID(),operation:op,query:q,...(op==='compare'?{compareWith:b}:{})}),data=await response.json().catch(()=>null);if(!response.ok)throw new Error('تعذر تنفيذ الطلب.');setResult(parse(data))}catch(e){setResult(null);setError(e instanceof Error?e.message:'تعذر تنفيذ الطلب.')}finally{setBusy(false)}};
 return <div className="r2-screen r2-oi-workspace r2-oi-copilot" data-copilot-stage="12.2" data-copilot-authority="read-only-context">
  <header className="r2-oi-header"><div><p className="r2-eyebrow">المساعد الذكي · 12.2</p><h1>مساعد إنجاز</h1></div><span className="r2-oi-stage">Contextual Assistance</span></header>
  <section className="r2-copilot-context"><strong>قراءة فقط · لا ينفذ أي إجراء</strong><small>الإجابة مساعدة؛ السجل الأصلي يبقى مصدر الحقيقة.</small></section>
  <div className="r2-placeholder-actions">{OPS.map(([id,label])=><button type="button" key={id} className={op===id?'r2-action r2-action--primary':'r2-action r2-action--secondary'} aria-pressed={op===id} onClick={()=>setOp(id)}>{label}</button>)}</div>
  <section className="r2-copilot-thread" aria-live="polite">{result?<div className="r2-copilot-message r2-copilot-message--assistant"><p>{result.answer}</p></div>:null}{result?.citations.map(c=><button type="button" className="r2-action r2-action--secondary" key={c.citationId} onClick={()=>location.assign(c.destination)}>{c.citationId} · {c.title}{c.subtitle?' — '+c.subtitle:''}</button>)}{error?<p className="r2-oi-truth" role="alert">{error}</p>:null}</section>
  {op==='compare'?<div className="r2-copilot-compose"><input value={other} maxLength={120} onChange={e=>setOther(e.currentTarget.value)} aria-label="السياق الثاني للمقارنة"/></div>:null}
  <form className="r2-copilot-compose" onSubmit={e=>{e.preventDefault();void submit()}}><input value={query} maxLength={120} onChange={e=>setQuery(e.currentTarget.value)} aria-label="رسالة إلى مساعد إنجاز" placeholder="شركة، معاملة، شخص، إجراء أو وثيقة…"/><button type="submit" disabled={busy||query.trim().length<2||(op==='compare'&&other.trim().length<2)}>{busy?'جارٍ…':'إرسال'}</button></form>
 </div>;
}
export function LiveCopilotPortal(props:Props){const{active,target}=useLiveRecordsPortal('copilot',SHELL,PLACEHOLDER);return active&&target?createPortal(<Copilot {...props}/>,target):null}
