import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { loadUnifiedCalendar, type UnifiedCalendarAuthority, type UnifiedCalendarItem, type UnifiedCalendarSnapshot } from '../../features/scheduling/unifiedCalendarService.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PREVIEW='[data-live-deferred="true"]';
const sourceLabel:Record<NonNullable<UnifiedCalendarAuthority>,string>={appointment:'موعد',workflow_deadline:'استحقاق سير العمل',renewal_occurrence:'تجديد'};
const stateLabel:Record<string,string>={upcoming:'قادم',in_progress:'جارٍ الآن',past_unresolved:'غير محسوم',completed:'مكتمل',cancelled:'ملغى',overdue:'متأخر',due_today:'اليوم',completed_on_time:'مكتمل بموعده',completed_late:'مكتمل متأخرًا'};
const dateFmt=new Intl.DateTimeFormat('ar-IQ',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
const timeFmt=new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit'});

function when(item:UnifiedCalendarItem){
  const start=new Date(item.startsAt);
  return item.allDay?dateFmt.format(start):`${dateFmt.format(start)} · ${timeFmt.format(start)}`;
}

function exportIcs(snapshot:UnifiedCalendarSnapshot){
  const instant=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,'').replace('.000','');
  const clean=(value:string)=>value.replace(/[\\;,\n]/g,(m)=>`\\${m}`);
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ENJAZ//Unified Calendar//AR'];
  for(const item of snapshot.items){
    lines.push('BEGIN:VEVENT',`UID:${item.sourceKind}-${item.canonicalId}@enjaz`,`DTSTAMP:${instant(snapshot.asOf)}`,
      item.allDay?`DTSTART;VALUE=DATE:${item.localDate.replaceAll('-','')}`:`DTSTART:${instant(item.startsAt)}`,
      ...(item.endsAt&&!item.allDay?[`DTEND:${instant(item.endsAt)}`]:[]),`SUMMARY:${clean(item.title)}`,'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='enjaz-calendar.ics';anchor.click();URL.revokeObjectURL(url);
}

export function UnifiedCalendarExperience({factory,userId}:{factory:EnjazDataLayerFactory;userId:string}){
  const [authority,setAuthority]=useState<UnifiedCalendarAuthority>(null),[snapshot,setSnapshot]=useState<UnifiedCalendarSnapshot|null>(null),[error,setError]=useState<string|null>(null),[refresh,setRefresh]=useState(0);
  useEffect(()=>{let live=true;setError(null);loadUnifiedCalendar(factory,userId,{authority}).then(data=>{if(live)setSnapshot(data)}).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:'تعذر تحميل التقويم')});return()=>{live=false}},[factory,userId,authority,refresh]);
  return <div className="r2-screen r2-core-today" data-phase11-5-unified-calendar="live" data-calendar-authority={authority??'all'}>
    <header className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">Phase 11.5-D · M10</p><h1>التقويم والمواعيد</h1><p className="r2-supporting">عرض موحّد من المواعيد واستحقاقات سير العمل والتجديدات، دون إنشاء حقيقة زمنية موازية.</p></div></header>
    <section className="r2-core-toolbar"><label className="r2-core-sort"><span>المصدر</span><select aria-label="تصفية مصدر التقويم" value={authority??''} onChange={e=>setAuthority((e.target.value||null) as UnifiedCalendarAuthority)}><option value="">الكل</option><option value="appointment">المواعيد</option><option value="workflow_deadline">استحقاقات سير العمل</option><option value="renewal_occurrence">التجديدات</option></select></label><button type="button" className="r2-action r2-action--secondary" onClick={()=>setRefresh(v=>v+1)}>تحديث</button>{snapshot?<button type="button" className="r2-action r2-action--secondary" onClick={()=>exportIcs(snapshot)}>تصدير ICS</button>:null}</section>
    {error?<section className="r2-core-state" role="alert"><strong>تعذر تحميل التقويم</strong><p>{error}</p><button type="button" className="r2-action r2-action--secondary" onClick={()=>setRefresh(v=>v+1)}>إعادة المحاولة</button></section>:null}
    {!snapshot&&!error?<section className="r2-core-state" role="status"><strong>جارٍ تجهيز التقويم</strong><p>تتم قراءة المصادر الأصلية داخل مساحة العمل الحالية.</p></section>:null}
    {snapshot?<><section className="r2-core-focus" data-calendar-summary="canonical"><div><span>النطاق الموحّد</span><h2>{snapshot.summary.returnedCount} عنصرًا</h2><p>{snapshot.timezone} · آخر قراءة {timeFmt.format(new Date(snapshot.asOf))}</p></div><div className="r2-core-focus__stats"><span><strong>{snapshot.summary.appointmentCount}</strong> موعد</span><span><strong>{snapshot.summary.overdueCount}</strong> متأخر</span><span><strong>{snapshot.summary.conflictCount}</strong> تعارض</span></div></section><section className="r2-core-scope-note" data-calendar-export-boundary={snapshot.exportBoundary.mode}><strong>حد التصدير</strong><span>ICS إسقاط خارجي أحادي الاتجاه؛ الحالة الخارجية ليست حقيقة إنجاز ولا يمكنها تعديل السجل.</span></section><section className="r2-core-work-list" data-calendar-items="canonical">{snapshot.items.length?snapshot.items.map(item=><article className={`r2-core-work-row is-${item.isOverdue?'overdue':item.isUpcoming?'upcoming':'action'}`} key={`${item.sourceKind}:${item.id}`} data-calendar-source={item.sourceKind} data-calendar-conflict={item.conflictState}><div className="r2-core-work-row__signal"><span>{sourceLabel[item.sourceKind]}</span><strong>{item.localDate.slice(8)}</strong></div><div className="r2-core-work-row__copy"><strong>{item.title}</strong><p>{item.companyLabel??item.transactionLabel??'دون ارتباط مسمى'}</p><small>{when(item)} · {stateLabel[item.temporalState]??item.temporalState}{item.isConflict?' · تعارض موظف':''}</small></div></article>):<section className="r2-core-state" role="status"><strong>لا توجد عناصر</strong><p>لا توجد مواعيد أو استحقاقات ضمن النطاق الحالي لهذا الفلتر.</p></section>}</section></>:null}
  </div>;
}

export function LiveSchedulingCalendarPortal(){
  const factory=useDataLayerFactory(),userId=useCurrentUserId(),[target,setTarget]=useState<HTMLElement|null>(null),[active,setActive]=useState(false);
  useLayoutEffect(()=>{const shell=document.querySelector<HTMLElement>(SHELL),main=document.getElementById('r2-main');if(!shell||!main)return;setTarget(main);const sync=()=>setActive(shell.dataset.destination==='calendar');sync();const observer=new MutationObserver(sync);observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});return()=>observer.disconnect()},[]);
  useLayoutEffect(()=>{if(!target)return;const preview=target.querySelector<HTMLElement>(PREVIEW);if(preview)preview.hidden=active;return()=>{if(preview)preview.hidden=false}},[active,target]);
  if(!active||!target||!userId)return null;
  return createPortal(<UnifiedCalendarExperience factory={factory} userId={userId}/>,target);
}
