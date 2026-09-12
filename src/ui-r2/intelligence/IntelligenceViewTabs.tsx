import { useEffect,useState } from 'react';

export type IntelligenceView='business'|'process';
const EVENT='enjaz:intelligence-view';

function readView():IntelligenceView{return new URLSearchParams(window.location.search).get('view')==='process'?'process':'business'}

export function useIntelligenceView():IntelligenceView{
 const [view,setView]=useState<IntelligenceView>(()=>readView());
 useEffect(()=>{const sync=()=>setView(readView());window.addEventListener('popstate',sync);window.addEventListener(EVENT,sync);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(EVENT,sync)}},[]);
 return view;
}

export function setIntelligenceView(view:IntelligenceView):void{
 const url=new URL(window.location.href);
 if(view==='process')url.searchParams.set('view','process');else url.searchParams.delete('view');
 window.history.pushState({...window.history.state,intelligenceView:view},'',url);
 window.dispatchEvent(new Event(EVENT));
 window.scrollTo({top:0,behavior:'auto'});
}

export function IntelligenceViewTabs(){
 const view=useIntelligenceView();
 return <div className="r2-placeholder-actions" role="group" aria-label="أقسام مركز الذكاء" data-intelligence-view-tabs="true">
  <button type="button" className={`r2-action ${view==='business'?'r2-action--primary':'r2-action--secondary'}`} aria-pressed={view==='business'} onClick={()=>setIntelligenceView('business')}>ذكاء الأعمال</button>
  <button type="button" className={`r2-action ${view==='process'?'r2-action--primary':'r2-action--secondary'}`} aria-pressed={view==='process'} onClick={()=>setIntelligenceView('process')}>ذكاء العمليات</button>
 </div>;
}
