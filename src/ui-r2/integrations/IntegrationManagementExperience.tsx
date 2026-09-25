import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  IntegrationEventType,
  IntegrationManagementGateway,
  IntegrationManagementSnapshot,
  IntegrationScope,
} from '../../features/integrations/integrationManagementGateway.ts';

function Section({eyebrow,title,children}:{eyebrow:string;title:string;children:ReactNode}){
  return <section className="r2-launcher-group">
    <div className="r2-section-heading"><div><p className="r2-eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>
    {children}
  </section>;
}
function Row({title,detail,badge,children}:{title:string;detail:string;badge:string;children?:ReactNode}){
  return <div className="r2-launcher-row" role="group">
    <span className="r2-launcher-row__copy"><strong>{title}</strong><small>{detail}</small></span>
    <span className="r2-stage-pill">{badge}</span>
    {children}
  </div>;
}

const SCOPES:readonly IntegrationScope[]=['companies:read','transactions:read','webhooks:read','webhooks:manage','imports:dry-run','imports:execute'];
const EVENTS:readonly IntegrationEventType[]=['company.updated','transaction.updated','followup.due','payment.recorded','document.ready'];

function StaticShell(){
  return <div className="r2-launcher-groups">
    <Section eyebrow="Credentials" title="اعتمادات الوصول"><div className="r2-launcher-list">
      <Row title="مفاتيح API" detail="إنشاء اعتماد مقيد بالنطاق مع إظهار السر مرة واحدة فقط." badge="Server only"/>
      <Row title="النطاقات والصلاحيات" detail="كل اعتماد مرتبط بمساحة العمل وصلاحيات صريحة." badge="Scoped"/>
      <Row title="الإلغاء وانتهاء الصلاحية" detail="إبطال الاعتماد يغلق سلطته واشتراكاته المرتبطة." badge="Fail closed"/>
    </div></Section>
    <Section eyebrow="Webhooks" title="اشتراكات Webhooks"><div className="r2-launcher-list">
      <Row title="الاشتراكات" detail="ربط الأحداث بنقطة نهاية HTTPS ضمن مساحة العمل." badge="Workspace bound"/>
      <Row title="سجل التسليم" detail="محاولات append-only دون كشف مادة التوقيع." badge="Immutable log"/>
      <Row title="إعادة المحاولة وDead-letter" detail="عامل خادمي مع lease recovery وحد أقصى للمحاولات." badge="Certified"/>
      <Row title="حدود المتصفح" detail="لا Service Role في الواجهة؛ السلطة الحساسة تبقى في الخادم." badge="A3 PASS"/>
    </div></Section>
  </div>;
}

export function IntegrationManagementExperience({gateway,workspace}:{gateway?:IntegrationManagementGateway|undefined;workspace?:Promise<string|null>|undefined}={}){
  const [workspaceId,setWorkspaceId]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<IntegrationManagementSnapshot|null>(null);
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>(gateway&&workspace?'loading':'idle');
  const [error,setError]=useState('');
  const [credentialName,setCredentialName]=useState('تكامل خارجي');
  const [scopes,setScopes]=useState<readonly IntegrationScope[]>(['webhooks:read','webhooks:manage']);
  const [endpoint,setEndpoint]=useState('');
  const [events,setEvents]=useState<readonly IntegrationEventType[]>(['company.updated']);
  const [serviceAccountId,setServiceAccountId]=useState('');
  const [busy,setBusy]=useState(false);
  const [secret,setSecret]=useState<Readonly<{title:string;value:string}>|null>(null);

  const refresh=async(id:string)=>{
    if(!gateway)return;
    const next=await gateway.snapshot(id);
    setSnapshot(next);
    setServiceAccountId(current=>current&&next.accounts.some(a=>a.id===current&&a.status==='active')?current:(next.accounts.find(a=>a.status==='active')?.id??''));
  };

  useEffect(()=>{
    if(!gateway||!workspace)return;
    let active=true;
    setStatus('loading');
    setError('');
    void workspace.then(async id=>{
      if(!active)return;
      if(!id)throw new Error('لا توجد مساحة عمل فعالة لهذا الحساب.');
      setWorkspaceId(id);
      await refresh(id);
      if(active)setStatus('ready');
    }).catch(reason=>{
      if(active){
        setError(reason instanceof Error?reason.message:'تعذر تحميل التكاملات.');
        setStatus('error');
      }
    });
    return()=>{active=false};
  },[gateway,workspace]);

  const activeAccounts=useMemo(()=>snapshot?.accounts.filter(a=>a.status==='active')??[],[snapshot]);
  const mutate=async(action:()=>Promise<void>)=>{
    if(!workspaceId)return;
    setBusy(true);
    setError('');
    try{
      await action();
      await refresh(workspaceId);
      setStatus('ready');
    }catch(reason){
      setError(reason instanceof Error?reason.message:'تعذر تنفيذ العملية.');
      setStatus('error');
    }finally{
      setBusy(false);
    }
  };
  const toggleScope=(value:IntegrationScope)=>setScopes(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value]);
  const toggleEvent=(value:IntegrationEventType)=>setEvents(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value]);

  return <div className="r2-screen" data-screen="integrations" data-phase14-2-a4={gateway?'live-management':'management-shell'} dir="rtl">
    <div className="r2-section-heading r2-section-heading--hero"><div>
      <p className="r2-eyebrow">Phase 14.2 · Integration Platform</p>
      <h1>التكاملات وواجهات API</h1>
      <p className="r2-supporting">{gateway?'إدارة حقيقية مرتبطة بصلاحيات مالك مساحة العمل؛ لا توجد أسرار أو Service Role في المتصفح.':'إدارة آمنة ومقيدة بمساحة العمل للاعتمادات والاشتراكات وسجل تسليم Webhooks.'}</p>
    </div></div>

    {!gateway||!workspace?<StaticShell/>:
    <div className="r2-launcher-groups" aria-busy={status==='loading'||busy}>
      {status==='loading'?<Section eyebrow="Loading" title="جارٍ تحميل التكاملات"><p className="r2-supporting">يتم التحقق من جلسة المستخدم ومساحة العمل ثم قراءة المصدر الحقيقي.</p></Section>:null}
      {error?<Section eyebrow="Fail closed" title="تعذر إكمال العملية"><p className="r2-supporting">{error}</p><button type="button" className="r2-action r2-action--secondary" disabled={!workspaceId||busy} onClick={()=>workspaceId&&void mutate(async()=>{})}>إعادة المحاولة</button></Section>:null}

      {snapshot?<><Section eyebrow="Credentials" title="اعتمادات الوصول">
        <form className="r2-launcher-list" onSubmit={event=>{
          event.preventDefault();
          if(!gateway||!workspaceId)return;
          void mutate(async()=>{
            const issued=await gateway.issueCredential({workspaceId,name:credentialName,scopes});
            setSecret({title:'رمز API — انسخه الآن، لن يظهر مرة أخرى',value:issued.rawToken});
          });
        }}>
          <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>اسم الاعتماد</strong><small>اسم واضح للتكامل أو النظام الخارجي.</small></span><input value={credentialName} maxLength={120} onChange={e=>setCredentialName(e.target.value)} disabled={busy}/></label>
          <div className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>الصلاحيات</strong><small>أقل نطاق ممكن هو الافتراضي.</small></span><span>{SCOPES.map(scope=><label key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={()=>toggleScope(scope)} disabled={busy}/>{scope}</label>)}</span></div>
          <button type="submit" className="r2-action r2-action--primary" disabled={busy||!credentialName.trim()||!scopes.length}>إصدار اعتماد</button>
        </form>
        <div className="r2-launcher-list">{snapshot.accounts.length?snapshot.accounts.map(account=><Row key={account.id} title={account.name} detail={account.scopes.join(' · ')+(account.expiresAt?' · ينتهي '+new Date(account.expiresAt).toLocaleDateString('ar-IQ'):'')} badge={account.status==='active'?'فعال':'ملغى'}>{account.status==='active'?<button type="button" className="r2-action r2-action--secondary" disabled={busy} onClick={()=>workspaceId&&void mutate(()=>gateway.revokeCredential(workspaceId,account.id))}>إلغاء</button>:null}</Row>):<p className="r2-supporting">لا توجد اعتمادات بعد.</p>}</div>
      </Section>

      <Section eyebrow="Webhooks" title="اشتراكات Webhooks">
        <form className="r2-launcher-list" onSubmit={event=>{
          event.preventDefault();
          if(!gateway||!workspaceId||!serviceAccountId)return;
          void mutate(async()=>{
            const created=await gateway.registerWebhook({workspaceId,serviceAccountId,endpointUrl:endpoint,eventTypes:events});
            setSecret({title:'سر توقيع Webhook — انسخه الآن، لن يظهر مرة أخرى',value:created.signingSecret});
            setEndpoint('');
          });
        }}>
          <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>اعتماد الإدارة</strong><small>يجب أن يتضمن webhooks:manage.</small></span><select value={serviceAccountId} onChange={e=>setServiceAccountId(e.target.value)} disabled={busy}>{activeAccounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>HTTPS Endpoint</strong><small>لن يرسل العامل إلى localhost أو عناوين IP مباشرة.</small></span><input type="url" value={endpoint} placeholder="https://example.com/webhooks/enjaz" onChange={e=>setEndpoint(e.target.value)} disabled={busy}/></label>
          <div className="r2-launcher-row"><span className="r2-launcher-row__copy"><strong>الأحداث</strong><small>اختر الأحداث المطلوبة فقط.</small></span><span>{EVENTS.map(item=><label key={item}><input type="checkbox" checked={events.includes(item)} onChange={()=>toggleEvent(item)} disabled={busy}/>{item}</label>)}</span></div>
          <button type="submit" className="r2-action r2-action--primary" disabled={busy||!serviceAccountId||!endpoint.trim()||!events.length}>تسجيل Webhook</button>
        </form>
        <div className="r2-launcher-list">{snapshot.subscriptions.length?snapshot.subscriptions.map(item=><Row key={item.id} title={item.endpointUrl} detail={item.eventTypes.join(' · ')+' · '+item.signingKeyPrefix} badge={item.status==='active'?'فعال':'معطل'}>{item.status==='active'?<button type="button" className="r2-action r2-action--secondary" disabled={busy} onClick={()=>workspaceId&&void mutate(()=>gateway.disableWebhook(workspaceId,item.id))}>تعطيل</button>:null}</Row>):<p className="r2-supporting">لا توجد اشتراكات Webhook بعد.</p>}</div>
      </Section>

      <Section eyebrow="Delivery ledger" title="آخر محاولات التسليم">
        <div className="r2-launcher-list">{snapshot.deliveries.length?snapshot.deliveries.slice(0,20).map(item=><Row key={item.id} title={item.eventType+' · محاولة '+item.attemptNo} detail={new Date(item.completedAt).toLocaleString('ar-IQ')+' · HTTP '+(item.httpStatus??'—')+(item.errorCode?' · '+item.errorCode:'')} badge={item.outcome}/>):<p className="r2-supporting">لا توجد محاولات تسليم مسجلة بعد.</p>}</div>
      </Section></>:null}
    </div>}

    {secret?<div className="r2-overlay" role="dialog" aria-modal="true" aria-label={secret.title}><button type="button" className="r2-overlay__backdrop" aria-label="إغلاق" onClick={()=>setSecret(null)}/><section className="r2-account-sheet"><div className="r2-account-sheet__handle" aria-hidden="true"/><p className="r2-eyebrow">One-time secret</p><h2>{secret.title}</h2><code dir="ltr">{secret.value}</code><p className="r2-supporting">بعد إغلاق هذه النافذة لا يستطيع إنجاز استرجاع السر الخام من واجهة الإدارة.</p><button type="button" className="r2-action r2-action--primary" onClick={()=>setSecret(null)}>فهمت وحفظته</button></section></div>:null}
  </div>;
}
