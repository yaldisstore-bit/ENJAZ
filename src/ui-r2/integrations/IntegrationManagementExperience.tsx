import { useEffect,useState,type ReactNode } from 'react';
import type { IntegrationEventType,IntegrationManagementGateway,IntegrationManagementSnapshot,IntegrationScope } from '../../features/integrations/integrationManagementGateway.ts';

const SCOPES:readonly IntegrationScope[]=['companies:read','transactions:read','webhooks:read','webhooks:manage','imports:dry-run','imports:execute'];
const EVENTS:readonly IntegrationEventType[]=['company.updated','transaction.updated','followup.due','payment.recorded','document.ready'];
const A='r2-action r2-action--secondary',P='r2-action r2-action--primary';
function Section({title,children}:{title:string;children:ReactNode}){return <section className="r2-launcher-group"><div className="r2-section-heading"><h2>{title}</h2></div>{children}</section>}
function Row({title,detail,badge,children}:{title:string;detail:string;badge:string;children?:ReactNode}){return <div className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>{title}</strong><small>{detail}</small></span><span className="r2-stage-pill">{badge}</span>{children}</div>}
function Choices<T extends string>({items,value,set,busy}:{items:readonly T[];value:readonly T[];set:(v:readonly T[])=>void;busy:boolean}){return <span>{items.map(x=><label key={x}><input type="checkbox" checked={value.includes(x)} disabled={busy} onChange={()=>set(value.includes(x)?value.filter(v=>v!==x):[...value,x])}/>{x}</label>)}</span>}
const err=(e:unknown,fallback:string)=>e instanceof Error?e.message:fallback;

export function IntegrationManagementExperience({gateway,workspace}:{gateway?:IntegrationManagementGateway;workspace?:Promise<string|null>}={}){
 const [wid,setWid]=useState<string|null>(null),[data,setData]=useState<IntegrationManagementSnapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(Boolean(gateway&&workspace));
 const [name,setName]=useState('تكامل خارجي'),[scopes,setScopes]=useState<readonly IntegrationScope[]>(['webhooks:read','webhooks:manage']),[endpoint,setEndpoint]=useState(''),[events,setEvents]=useState<readonly IntegrationEventType[]>(['company.updated']),[account,setAccount]=useState(''),[secret,setSecret]=useState<{title:string;value:string}|null>(null);
 const refresh=async(id:string)=>{if(!gateway)return;const next=await gateway.snapshot(id);setData(next);setAccount(v=>v&&next.accounts.some(a=>a.id===v&&a.status==='active')?v:next.accounts.find(a=>a.status==='active')?.id??'')};
 useEffect(()=>{if(!gateway||!workspace)return;let on=true;setLoading(true);void workspace.then(async id=>{if(!on)return;if(!id)throw Error('لا توجد مساحة عمل فعالة.');setWid(id);await refresh(id)}).catch(e=>on&&setError(err(e,'تعذر تحميل التكاملات.'))).finally(()=>on&&setLoading(false));return()=>{on=false}},[gateway,workspace]);
 const mutate=async(fn:()=>Promise<void>)=>{if(!wid)return;setBusy(true);setError('');try{await fn();await refresh(wid)}catch(e){setError(err(e,'تعذر تنفيذ العملية.'))}finally{setBusy(false)}};
 const active=data?.accounts.filter(x=>x.status==='active'&&x.scopes.includes('webhooks:manage'))??[];

 return <div className="r2-screen" data-screen="integrations" data-phase14-2-a4={gateway?'live-management':'management-shell'} dir="rtl">
  <div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">Phase 14.2 · Integration Platform</p><h1>التكاملات وواجهات API</h1><p className="r2-supporting">إدارة مقيدة بمساحة العمل؛ لا Service Role في الواجهة، والأسرار تظهر مرة واحدة فقط.</p></div></div>
  {!gateway||!workspace?<div className="r2-launcher-groups"><Section title="حدود الأمان"><Row title="اعتمادات API" detail="نطاقات صريحة وإلغاء fail-closed." badge="Server only"/><Row title="Webhooks" detail="توقيع وسجل تسليم دون كشف السر." badge="Workspace bound"/><p className="r2-supporting">Fail closed · A3 PASS</p></Section></div>:
  <div className="r2-launcher-groups" aria-busy={loading||busy}>
   {loading?<Section title="جارٍ تحميل التكاملات"><p className="r2-supporting">يتم التحقق من الجلسة ومساحة العمل.</p></Section>:null}
   {error?<Section title="تعذر إكمال العملية"><p className="r2-supporting">{error}</p><button className={A} disabled={!wid||busy} onClick={()=>void mutate(async()=>{})}>إعادة المحاولة</button></Section>:null}
   {data?<><Section title="اعتمادات الوصول"><form className="r2-launcher-list" onSubmit={e=>{e.preventDefault();if(!wid)return;void mutate(async()=>{const x=await gateway.issueCredential({workspaceId:wid,name,scopes});setSecret({title:'رمز API — انسخه الآن',value:x.rawToken})})}}>
    <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>اسم الاعتماد</strong></span><input value={name} maxLength={120} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
    <div className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>الصلاحيات</strong></span><Choices items={SCOPES} value={scopes} set={setScopes} busy={busy}/></div>
    <button className={P} disabled={busy||!name.trim()||!scopes.length}>إصدار اعتماد</button></form>
    <div className="r2-launcher-list">{data.accounts.length?data.accounts.map(x=><Row key={x.id} title={x.name} detail={x.scopes.join(' · ')} badge={x.status==='active'?'فعال':'ملغى'}>{x.status==='active'?<button className={A} disabled={busy} onClick={()=>void mutate(()=>gateway.revokeCredential(wid!,x.id))}>إلغاء</button>:null}</Row>):<p className="r2-supporting">لا توجد اعتمادات.</p>}</div>
   </Section><Section title="اشتراكات Webhooks"><form className="r2-launcher-list" onSubmit={e=>{e.preventDefault();if(!wid||!account)return;void mutate(async()=>{const x=await gateway.registerWebhook({workspaceId:wid,serviceAccountId:account,endpointUrl:endpoint,eventTypes:events});setSecret({title:'سر توقيع Webhook — انسخه الآن',value:x.signingSecret});setEndpoint('')})}}>
    <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>اعتماد الإدارة</strong></span><select value={account} disabled={busy} onChange={e=>setAccount(e.target.value)}>{active.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>HTTPS Endpoint</strong></span><input type="url" value={endpoint} disabled={busy} onChange={e=>setEndpoint(e.target.value)}/></label>
    <div className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>الأحداث</strong></span><Choices items={EVENTS} value={events} set={setEvents} busy={busy}/></div>
    <button className={P} disabled={busy||!account||!endpoint.trim()||!events.length}>تسجيل Webhook</button></form>
    <div className="r2-launcher-list">{data.subscriptions.length?data.subscriptions.map(x=><Row key={x.id} title={x.endpointUrl} detail={x.eventTypes.join(' · ')+' · '+x.signingKeyPrefix} badge={x.status==='active'?'فعال':'معطل'}>{x.status==='active'?<button className={A} disabled={busy} onClick={()=>void mutate(()=>gateway.disableWebhook(wid!,x.id))}>تعطيل</button>:null}</Row>):<p className="r2-supporting">لا توجد اشتراكات.</p>}</div>
   </Section><Section title="آخر محاولات التسليم"><div className="r2-launcher-list">{data.deliveries.length?data.deliveries.slice(0,20).map(x=><Row key={x.id} title={x.eventType+' · '+x.attemptNo} detail={'HTTP '+(x.httpStatus??'—')+(x.errorCode?' · '+x.errorCode:'')} badge={x.outcome}/>):<p className="r2-supporting">لا توجد محاولات تسليم.</p>}</div></Section></>:null}
  </div>}
  {secret?<div className="r2-overlay" role="dialog" aria-modal="true" aria-label={secret.title}><button className="r2-overlay__backdrop" aria-label="إغلاق" onClick={()=>setSecret(null)}/><section className="r2-account-sheet"><p className="r2-eyebrow">One-time secret</p><h2>{secret.title}</h2><code dir="ltr">{secret.value}</code><p className="r2-supporting">لن يمكن استرجاع السر الخام بعد الإغلاق.</p><button className={P} onClick={()=>setSecret(null)}>فهمت وحفظته</button></section></div>:null}
 </div>
}
