import { useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useSchedulingCommandGateway } from '../../features/scheduling/SchedulingCommandContext.tsx';
import { businessDateForInstant, enumerateBusinessDates, localInputForInstant, workspaceLocalDateTimeToInstant } from '../../features/scheduling/calendarTime.ts';
import { buildUnifiedCalendarIcs, loadUnifiedCalendar, shiftUnifiedCalendarAnchor, type UnifiedCalendarAuthority, type UnifiedCalendarItem, type UnifiedCalendarSnapshot, type UnifiedCalendarView } from '../../features/scheduling/unifiedCalendar.ts';
import './calendar.css';

type Props=Readonly<{workspace:Promise<string|null>}>;
type Notice=Readonly<{kind:'ok'|'error'|'warning';text:string}>|null;
const VIEWS:readonly [UnifiedCalendarView,string][]=[['day','يوم'],['week','أسبوع'],['month','شهر'],['agenda','أجندة']];
const AUTHORITIES:readonly [UnifiedCalendarAuthority,string][]=[['all','كل المصادر'],['appointment','المواعيد'],['renewal','التجديدات'],['workflow_deadline','مهل سير العمل']];
const WEEKDAYS=['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];

function shortId(value:string){return `${value.slice(0,8)}…`}
function sourceLabel(source:UnifiedCalendarItem['source']){return source==='appointment'?'موعد':source==='renewal'?'تجديد':'مهلة سير عمل'}
function attentionLabel(state:UnifiedCalendarItem['attentionState']){return state==='overdue'?'متأخر':state==='due_today'?'اليوم':state==='terminal'?'منتهٍ':'قادم'}
function actionError(error:unknown){
  if(error instanceof DataAccessError){
    if(error.dataCode==='DATA_CONFLICT')return 'تغيرت البيانات أو وجد تعارض من جلسة أخرى. تم إيقاف الكتابة؛ حدّث التقويم ثم أعد المحاولة.';
    if(error.dataCode==='DATA_OUTCOME_UNKNOWN')return 'تعذر تأكيد نتيجة الكتابة. حدّث التقويم قبل إعادة المحاولة حتى لا تتكرر العملية.';
    return error.userMessage;
  }
  return error instanceof Error&&error.message?error.message:'تعذر إكمال العملية.';
}
function localDate(item:UnifiedCalendarItem,timeZone:string){return item.dueDate??(item.startsAt?businessDateForInstant(item.startsAt,timeZone):null)}
function formatBusinessDate(value:string){const [y,m,d]=value.split('-').map(Number);return new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(Date.UTC(y!,m!-1,d!)))}
function formatInstant(value:string,timeZone:string){return new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeStyle:'short',timeZone}).format(new Date(value))}

function CalendarItemCard({item,timeZone,busy,onAttendance,onEdit}:{item:UnifiedCalendarItem;timeZone:string;busy:boolean;onAttendance:(item:UnifiedCalendarItem,outcome:'attended'|'missed')=>void;onEdit:(item:UnifiedCalendarItem)=>void}){
  return <article className={`enjaz-cal-item is-${item.source} attention-${item.attentionState}`} data-calendar-source={item.source} data-attention={item.attentionState}>
    <div className="enjaz-cal-item__head"><span className="enjaz-cal-source">{sourceLabel(item.source)}</span><span className="enjaz-cal-attention">{attentionLabel(item.attentionState)}</span></div>
    <h3>{item.title}</h3>
    <p className="enjaz-cal-time">{item.startsAt?formatInstant(item.startsAt,timeZone):item.dueDate?formatBusinessDate(item.dueDate):'دون وقت'}</p>
    {item.companyLabel?<p className="enjaz-cal-meta">{item.companyLabel}</p>:null}
    {item.confirmationStatus?<p className="enjaz-cal-meta">التأكيد: {item.confirmationStatus}</p>:null}
    {item.attendanceOutcome?<p className="enjaz-cal-meta">الحضور: {item.attendanceOutcome}</p>:null}
    {item.source==='appointment'&&item.status==='scheduled'&&item.version?<div className="enjaz-cal-actions">
      <button type="button" disabled={busy} onClick={()=>onEdit(item)}>إعادة جدولة</button>
      <button type="button" disabled={busy||item.attendanceOutcome!=null} onClick={()=>onAttendance(item,'attended')}>حضر</button>
      <button type="button" disabled={busy||item.attendanceOutcome!=null} onClick={()=>onAttendance(item,'missed')}>لم يحضر</button>
    </div>:null}
  </article>;
}

export function LiveUnifiedCalendarExperience({workspace}:Props){
  const factory=useDataLayerFactory(),commands=useSchedulingCommandGateway();
  const [workspaceId,setWorkspaceId]=useState<string|null>(null),[workspaceResolved,setWorkspaceResolved]=useState(false);
  const [view,setView]=useState<UnifiedCalendarView>('month'),[anchor,setAnchor]=useState<string|null>(null),[authority,setAuthority]=useState<UnifiedCalendarAuthority>('all');
  const [staff,setStaff]=useState<string|null>(null),[company,setCompany]=useState<string|null>(null),[transaction,setTransaction]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<UnifiedCalendarSnapshot|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<string|null>(null),[revision,setRevision]=useState(0);
  const [online,setOnline]=useState(()=>navigator.onLine),[busyId,setBusyId]=useState<string|null>(null),[notice,setNotice]=useState<Notice>(null);
  const [editing,setEditing]=useState<UnifiedCalendarItem|null>(null),[rescheduleLocal,setRescheduleLocal]=useState(''),[rescheduleReason,setRescheduleReason]=useState('');

  useEffect(()=>{let live=true;void workspace.then(id=>{if(live){setWorkspaceId(id);setWorkspaceResolved(true)}}).catch(()=>{if(live){setWorkspaceResolved(true);setLoadError('تعذر تحديد مساحة العمل.')}});return()=>{live=false}},[workspace]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
  useEffect(()=>{
    if(!workspaceId){if(workspaceResolved)setLoading(false);return}
    let live=true;setLoading(true);setLoadError(null);
    void loadUnifiedCalendar(factory,{workspaceId,anchorDate:anchor,view,authority,staffMemberId:staff,companyId:company,transactionId:transaction}).then(result=>{
      if(!live)return;setSnapshot(result);if(anchor===null)setAnchor(result.anchorDate);setLoading(false);
    }).catch(error=>{if(live){setLoadError(actionError(error));setLoading(false)}});
    return()=>{live=false};
  },[workspaceId,workspaceResolved,factory,anchor,view,authority,staff,company,transaction,revision]);

  const companies=useMemo(()=>{const map=new Map<string,string>();for(const item of snapshot?.items??[])if(item.companyId)map.set(item.companyId,item.companyLabel??shortId(item.companyId));return [...map.entries()]},[snapshot]);
  const transactions=useMemo(()=>[...new Set((snapshot?.items??[]).map(x=>x.transactionId).filter((x):x is string=>Boolean(x)))],[snapshot]);
  const staffMembers=useMemo(()=>[...new Set((snapshot?.items??[]).flatMap(x=>x.staffMemberIds))],[snapshot]);
  const dates=useMemo(()=>snapshot?enumerateBusinessDates(snapshot.businessStartDate,snapshot.businessEndDate):[],[snapshot]);
  const byDate=useMemo(()=>{const map=new Map<string,UnifiedCalendarItem[]>();if(snapshot)for(const item of snapshot.items){const d=localDate(item,snapshot.workspaceTimezone);if(d){const rows=map.get(d)??[];rows.push(item);map.set(d,rows)}}return map},[snapshot]);

  const reload=()=>setRevision(x=>x+1);
  const move=(direction:-1|1)=>{const base=anchor??snapshot?.anchorDate;if(base)setAnchor(shiftUnifiedCalendarAnchor(base,view,direction))};
  const goToday=()=>setAnchor(snapshot?.businessToday??null);
  const runAction=async(item:UnifiedCalendarItem,work:()=>Promise<unknown>,success:string)=>{
    if(!online){setNotice({kind:'warning',text:'أنت دون اتصال. لم تُنفذ أي كتابة على التقويم.'});return}
    setBusyId(item.id);setNotice(null);
    try{await work();setNotice({kind:'ok',text:success});reload()}catch(error){setNotice({kind:'error',text:actionError(error)});reload()}finally{setBusyId(null)}
  };
  const attendance=(item:UnifiedCalendarItem,outcome:'attended'|'missed')=>{
    const activeWorkspaceId=workspaceId;
    const expectedVersion=item.version;
    if(!activeWorkspaceId||expectedVersion===null)return;
    void runAction(item,()=>commands.recordCalendarEventAttendance({workspaceId:activeWorkspaceId,eventId:item.id,operationId:crypto.randomUUID(),expectedVersion,outcome}),outcome==='attended'?'تم تسجيل الحضور.':'تم تسجيل عدم الحضور.');
  };
  const openReschedule=(item:UnifiedCalendarItem)=>{if(!snapshot||!item.startsAt)return;setEditing(item);setRescheduleLocal(localInputForInstant(item.startsAt,snapshot.workspaceTimezone));setRescheduleReason('');setNotice(null)};
  const submitReschedule=()=>{
    const activeWorkspaceId=workspaceId;
    const activeSnapshot=snapshot;
    const item=editing;
    const expectedVersion=item?.version??null;
    const originalStartsAt=item?.startsAt??null;
    const originalEndsAt=item?.endsAt??null;
    const localValue=rescheduleLocal;
    const reason=rescheduleReason.trim();
    if(!activeWorkspaceId||!activeSnapshot||!item||expectedVersion===null||!originalStartsAt||!localValue||!reason)return;
    const workspaceTimezone=activeSnapshot.workspaceTimezone;
    void runAction(item,async()=>{
      if(item.staffMemberIds.length===0)throw new Error('لا يمكن اعتماد إعادة الجدولة دون تعيين موظف صريح؛ فحص التعارض يفشل مغلقًا.');
      const startsAt=workspaceLocalDateTimeToInstant(localValue,workspaceTimezone);
      const oldStart=Date.parse(originalStartsAt),oldEnd=originalEndsAt?Date.parse(originalEndsAt):oldStart;
      const duration=Math.max(0,oldEnd-oldStart),endsAt=duration>0?new Date(Date.parse(startsAt)+duration).toISOString():null;
      const conflict=await commands.checkCalendarEventStaffConflicts({workspaceId:activeWorkspaceId,startsAt,endsAt,staffMemberIds:item.staffMemberIds,excludeEventId:item.id});
      if(conflict.state!=='clear')throw new Error(conflict.state==='conflict'?'يوجد تعارض فعلي مع موعد آخر للموظف.':'تعذر إثبات خلو الفترة من التعارض؛ أوقفت إنجاز إعادة الجدولة.');
      await commands.rescheduleCalendarEvent({workspaceId:activeWorkspaceId,eventId:item.id,operationId:crypto.randomUUID(),expectedVersion,startsAt,endsAt,reason});
      setEditing(null);setRescheduleReason('');
    },'تمت إعادة الجدولة بعد فحص التعارض.');
  };
  const exportIcs=()=>{if(!snapshot)return;const blob=new Blob([buildUnifiedCalendarIcs(snapshot)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`enjaz-calendar-${snapshot.businessStartDate}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);setNotice({kind:'ok',text:'تم إنشاء نسخة تصدير أحادية الاتجاه. لا تصبح التقويمات الخارجية مصدر حقيقة لإنجاز.'})};

  const renderGrid=()=>{
    if(!snapshot)return null;
    if(view==='day')return <div className="enjaz-cal-day">{(byDate.get(snapshot.businessStartDate)??[]).map(item=><CalendarItemCard key={`${item.source}:${item.id}`} item={item} timeZone={snapshot.workspaceTimezone} busy={busyId===item.id} onAttendance={attendance} onEdit={openReschedule}/>)}</div>;
    if(view==='agenda')return <div className="enjaz-cal-agenda">{dates.flatMap(dateValue=>(byDate.get(dateValue)?.length?[<section key={dateValue} className="enjaz-cal-agenda-day"><h2>{formatBusinessDate(dateValue)}</h2>{byDate.get(dateValue)!.map(item=><CalendarItemCard key={`${item.source}:${item.id}`} item={item} timeZone={snapshot.workspaceTimezone} busy={busyId===item.id} onAttendance={attendance} onEdit={openReschedule}/>)}</section>]:[]))}</div>;
    const first=dates[0],offset=view==='month'&&first?((new Date(`${first}T00:00:00Z`).getUTCDay()+6)%7):0;
    return <><div className="enjaz-cal-weekdays">{WEEKDAYS.map(day=><span key={day}>{day}</span>)}</div><div className={`enjaz-cal-grid is-${view}`}>{Array.from({length:offset},(_,i)=><div key={`blank-${i}`} className="enjaz-cal-cell is-blank"/>)}{dates.map(dateValue=><section key={dateValue} className={`enjaz-cal-cell${dateValue===snapshot.businessToday?' is-today':''}`}><header><strong>{dateValue.slice(8,10)}</strong><span>{formatBusinessDate(dateValue)}</span></header><div>{(byDate.get(dateValue)??[]).map(item=><CalendarItemCard key={`${item.source}:${item.id}`} item={item} timeZone={snapshot.workspaceTimezone} busy={busyId===item.id} onAttendance={attendance} onEdit={openReschedule}/>)}</div></section>)}</div></>;
  };

  return <main className="r2-screen enjaz-calendar" data-phase11-5d-unified-calendar="live" data-calendar-view={view}>
    <header className="enjaz-cal-hero"><div><p className="r2-eyebrow">M10 · 11.5-D</p><h1>التقويم والمواعيد</h1><p>موعد واحد، تجديد واحد، ومهلة واحدة من مصادرها الحاكمة — دون نسخ ظل.</p></div><button type="button" className="r2-action r2-action--secondary" disabled={!snapshot} onClick={exportIcs}>تصدير التقويم</button></header>
    {!online?<div className="enjaz-cal-banner is-warning">وضع دون اتصال: القراءة الحالية قد تكون قديمة، وكل إجراءات الكتابة متوقفة.</div>:null}
    {notice?<div className={`enjaz-cal-banner is-${notice.kind}`} role="status">{notice.text}</div>:null}
    <section className="enjaz-cal-toolbar" aria-label="أدوات التقويم"><div className="enjaz-cal-view-tabs">{VIEWS.map(([id,label])=><button key={id} type="button" className={view===id?'is-active':''} onClick={()=>setView(id)}>{label}</button>)}</div><div className="enjaz-cal-nav"><button type="button" onClick={()=>move(-1)}>السابق</button><button type="button" onClick={goToday}>اليوم</button><button type="button" onClick={()=>move(1)}>التالي</button></div></section>
    <section className="enjaz-cal-filters" aria-label="مرشحات التقويم"><label>المصدر<select value={authority} onChange={e=>{setAuthority(e.target.value as UnifiedCalendarAuthority);setStaff(null)}}>{AUTHORITIES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>الشركة<select value={company??''} onChange={e=>setCompany(e.target.value||null)}><option value="">كل الشركات</option>{companies.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>المعاملة<select value={transaction??''} onChange={e=>setTransaction(e.target.value||null)}><option value="">كل المعاملات</option>{transactions.map(id=><option key={id} value={id}>{shortId(id)}</option>)}</select></label><label>الموظف<select value={staff??''} onChange={e=>{setStaff(e.target.value||null);if(e.target.value)setAuthority('appointment')}}><option value="">كل الموظفين/غير المعيّن</option>{staffMembers.map(id=><option key={id} value={id}>{shortId(id)}</option>)}</select></label></section>
    {staff?<p className="enjaz-cal-scope-note">عند التصفية بموظف، يعرض إنجاز المواعيد ذات التعيين الصريح فقط؛ التجديدات والمهل غير المنسوبة لا تُفترض لموظف.</p>:null}
    {snapshot?<div className="enjaz-cal-range"><strong>{formatBusinessDate(snapshot.businessStartDate)}</strong><span>←</span><strong>{formatBusinessDate(snapshot.businessEndDate)}</strong><small>{snapshot.workspaceTimezone} · {snapshot.items.length} عنصر</small></div>:null}
    {loading?<div className="enjaz-cal-state">جارٍ تحميل مصدر الحقيقة…</div>:loadError?<div className="enjaz-cal-state is-error"><p>{loadError}</p><button type="button" onClick={reload}>إعادة المحاولة</button></div>:!workspaceId?<div className="enjaz-cal-state">لا توجد مساحة عمل متاحة.</div>:snapshot&&snapshot.items.length===0?<div className="enjaz-cal-state">لا توجد مواعيد أو تجديدات أو مهل ضمن هذه الفترة والمرشحات.</div>:renderGrid()}
    {editing&&snapshot?<div className="enjaz-cal-sheet" role="dialog" aria-modal="true" aria-labelledby="enjaz-reschedule-title"><button className="enjaz-cal-sheet__backdrop" type="button" aria-label="إغلاق" onClick={()=>setEditing(null)}/><section><h2 id="enjaz-reschedule-title">إعادة جدولة {editing.title}</h2><p>الوقت أدناه يُفسّر حسب {snapshot.workspaceTimezone} وليس توقيت الجهاز.</p><label>الوقت الجديد<input type="datetime-local" value={rescheduleLocal} onChange={e=>setRescheduleLocal(e.target.value)}/></label><label>سبب التغيير<textarea value={rescheduleReason} maxLength={1200} onChange={e=>setRescheduleReason(e.target.value)}/></label><div><button type="button" className="r2-action r2-action--secondary" onClick={()=>setEditing(null)}>إلغاء</button><button type="button" className="r2-action r2-action--primary" disabled={busyId===editing.id||!rescheduleLocal||!rescheduleReason.trim()} onClick={submitReschedule}>فحص التعارض وإعادة الجدولة</button></div></section></div>:null}
  </main>;
}
