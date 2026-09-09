import { useEffect,useMemo,useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useAutomationCommandGateway } from '../../features/automation/AutomationCommandContext.tsx';
import { createCommandCenterOrchestrator,type CommandCenterSnapshot,type CommandWorkflowDecision } from '../../features/command/commandCenter.ts';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import { useFinanceCommandGateway } from '../../features/finance/FinanceCommandContext.tsx';
import { useGovernmentProcedureCommandGateway } from '../../features/workflow/GovernmentProcedureCommandContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type Props=Readonly<{navigate:(id:R2DestinationId)=>void}>;
const FAIL='تعذر تأكيد الحالة من جميع السلطات الموثوقة. لم يعرض مركز القيادة صورة جزئية قد تكون مضللة.';
const OK='تم تأكيد القرار من السلطة المالكة وإعادة مزامنة مركز القيادة.';
const BAD='تعذر تأكيد القرار.';
const priority=(level:CommandWorkflowDecision['level'])=>level==='critical'?'حرج':level==='high'?'مرتفع':'متوسط';
const action=(snapshot:Readonly<Record<string,unknown>>)=>snapshot.type==='workflow_transition'?'انتقال سير عمل حساس':snapshot.type==='create_followup'?'إنشاء متابعة':'إجراء أتمتة يحتاج قرارًا';

export function LiveCommandCenterExperience({navigate}:Props){
  const userId=useCurrentUserId(),dataFactory=useDataLayerFactory(),finance=useFinanceCommandGateway(),workflow=useGovernmentProcedureCommandGateway(),automation=useAutomationCommandGateway(),field=useFieldOperationsCommandGateway();
  const center=useMemo(()=>createCommandCenterOrchestrator({dataFactory,finance,workflow,automation,field}),[dataFactory,finance,workflow,automation,field]);
  const [snapshot,setSnapshot]=useState<CommandCenterSnapshot|null>(null),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
  const load=async()=>{if(!userId)throw new Error('AUTH_USER_REQUIRED');const next=await center.load(userId);setSnapshot(next);return next};
  useEffect(()=>{let live=true;setSnapshot(null);setMessage('');void center.load(userId??'').then(x=>{if(live)setSnapshot(x)}).catch(()=>{if(live)setMessage(FAIL)});return()=>{live=false}},[center,userId]);
  const run=async(key:string,op:(current:CommandCenterSnapshot)=>Promise<unknown>)=>{if(!snapshot||busy)return;setBusy(key);setMessage('');try{await op(snapshot);await load();setMessage(OK)}catch{setMessage(BAD);try{await load()}catch{setSnapshot(null);setMessage(FAIL)}}finally{setBusy('')}};
  const decideApproval=(approvalId:string,decision:'approved'|'rejected',form:HTMLFormElement|null)=>void run(`approval:${approvalId}`,x=>center.decideAutomationApproval({workspaceId:x.workspaceId,approvalId,decision,note:String(new FormData(form??undefined).get('note')??'').trim()||null,decisionKey:crypto.randomUUID()}));
  const transitionWorkflow=(decision:CommandWorkflowDecision,transitionKey:string,form:HTMLFormElement)=>{const transition=decision.allowedTransitions.find(x=>x.key===transitionKey);if(!transition)return;const reason=String(new FormData(form).get('reason')??'').trim()||null;if(transition.requiresReason&&!reason){setMessage('هذا الانتقال يتطلب سببًا موثقًا قبل التنفيذ.');return}void run(`workflow:${decision.instanceId}:${transitionKey}`,x=>center.transitionWorkflow({workspaceId:x.workspaceId,instanceId:decision.instanceId,transitionKey,expectedStagePosition:decision.currentStagePosition,reason,idempotencyKey:crypto.randomUUID()}))};
  const reassignField=(assignmentId:string,version:number,form:HTMLFormElement)=>{const values=new FormData(form),assignedUserId=String(values.get('member')??''),reason=String(values.get('reason')??'').trim();if(!assignedUserId||reason.length<3){setMessage('إعادة الإسناد تحتاج عضوًا وسببًا موثقًا.');return}void run(`field:${assignmentId}`,x=>center.reassignField({workspaceId:x.workspaceId,assignmentId,expectedVersion:version,assignedUserId,reason,clientOperationId:crypto.randomUUID()}))};
  const fields=snapshot?.field.assignments.filter(x=>x.status==='queued'||x.status==='in_progress').slice(0,4)??[];
  const signals=snapshot?snapshot.home.criticalBlockers+snapshot.home.overdueFollowups+snapshot.automation.pendingApprovals.length+snapshot.finance.reconciliation.integrityWarnings+snapshot.field.metrics.highCriticalBlockers:0;

  return <div className="r2-screen r2-command-live" data-command-stage="8.6" data-command-authority="delegated_existing_domain_gateways_only" data-command-write-authority="none" data-finance-write-authority="none">
    <header className="r2-command-hero"><div><p className="r2-eyebrow">Phase 8.6 · Global Command Center</p><h1>مركز القيادة</h1></div></header>
    {message&&<div className="r2-command-alert" role="status">{message}</div>}
    {!snapshot?<section className="r2-command-state"><strong>{message===FAIL?'صورة القيادة غير متاحة':'جارٍ تكوين صورة القيادة…'}</strong>{message===FAIL&&<button type="button" className="r2-action r2-action--secondary" onClick={()=>void load().catch(()=>setMessage(FAIL))}>إعادة المحاولة</button>}</section>:<>
      <section className="r2-command-overview" aria-label="نبض القيادة">
        <article className="r2-command-metric r2-command-metric--focus"><span>إشارات قرار</span><strong>{signals}</strong><small>عوائق + تأخير + موافقات + نزاهة</small></article>
        <article className="r2-command-metric"><span>العمل النشط</span><strong>{snapshot.home.activeTransactions}</strong><small>{snapshot.home.stalledTransactions} متلكئة · {snapshot.home.urgentTransactions} عاجلة</small></article>
        <article className="r2-command-metric"><span>الميدان</span><strong>{snapshot.field.metrics.queuedAssignments+snapshot.field.metrics.activeVisits}</strong><small>{snapshot.field.metrics.queuedAssignments} إسناد · {snapshot.field.metrics.activeVisits} زيارة</small></article>
        <article className="r2-command-metric"><span>نزاهة المالية</span><strong>{snapshot.finance.reconciliation.integrityWarnings}</strong><small>قراءة ومصالحة فقط</small></article>
      </section>
      <section className="r2-command-grid">
        <article className="r2-command-panel"><div className="r2-command-panel__head"><div><p className="r2-eyebrow">Decision Queue</p><h2>قرارات العمل ذات الأولوية</h2></div><button type="button" className="r2-command-link" onClick={()=>navigate('transactions')}>المعاملات</button></div>
          {snapshot.workflowDecisions.length===0?<p className="r2-command-empty">لا توجد معاملة ذات أولوية تحمل انتقال سير عمل متاحًا الآن.</p>:<div className="r2-command-stack">{snapshot.workflowDecisions.map(d=><section className="r2-command-decision" key={d.instanceId}><div className="r2-command-decision__copy"><span className="r2-command-badge">{priority(d.level)}</span><div><strong>{d.title}</strong><small>{d.companyLabel??'شركة غير متاحة'} · المرحلة {d.currentStagePosition}</small></div></div>{d.allowedTransitions.length===0?<p className="r2-command-empty">لا يوجد انتقال مسموح به من الحالة الحالية.</p>:d.allowedTransitions.map(t=><form className="r2-command-transition" key={t.key} onSubmit={e=>{e.preventDefault();transitionWorkflow(d,t.key,e.currentTarget)}}><div><strong>{t.label}</strong><small>{t.requiresReason?'يتطلب سببًا موثقًا':'انتقال مسموح'}</small></div><input name="reason" aria-label={`سبب ${t.label} — ${d.title}`} placeholder={t.requiresReason?'السبب مطلوب…':'سبب اختياري…'}/><button className="r2-action r2-action--primary" disabled={Boolean(busy)}>{busy===`workflow:${d.instanceId}:${t.key}`?'جارٍ التأكيد…':t.label}</button></form>)}</section>)}</div>}
        </article>
        <article className="r2-command-panel"><div className="r2-command-panel__head"><div><p className="r2-eyebrow">Human Approval</p><h2>موافقات الأتمتة</h2></div><button type="button" className="r2-command-link" onClick={()=>navigate('automation')}>الأتمتة</button></div>
          {snapshot.automation.pendingApprovals.length===0?<p className="r2-command-empty">لا توجد موافقات أتمتة معلقة.</p>:snapshot.automation.pendingApprovals.map(a=><form className="r2-command-approval" key={a.id}><div><strong>{action(a.actionSnapshot)}</strong><small>التنفيذ خلف الموافقة البشرية</small></div><input name="note" aria-label={`ملاحظة قرار الأتمتة ${a.id}`} placeholder="ملاحظة اختيارية"/><div className="r2-command-actions"><button type="button" className="r2-action r2-action--primary" disabled={Boolean(busy)} onClick={e=>decideApproval(a.id,'approved',e.currentTarget.form)}>موافقة</button><button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busy)} onClick={e=>decideApproval(a.id,'rejected',e.currentTarget.form)}>رفض</button></div></form>)}
        </article>
      </section>
      <section className="r2-command-grid r2-command-grid--lower">
        <article className="r2-command-panel"><div className="r2-command-panel__head"><h2>إعادة إسناد العمل الميداني</h2><button type="button" className="r2-command-link" onClick={()=>navigate('operations')}>العمليات</button></div>
          {fields.length===0?<p className="r2-command-empty">لا توجد إسنادات قابلة لإعادة التوزيع.</p>:fields.map(a=><form className="r2-command-field-row" key={a.id} onSubmit={e=>{e.preventDefault();reassignField(a.id,a.version,e.currentTarget)}}><div><strong>{a.transactionType}</strong><small>المالك الحالي {a.assignedUserName??'غير محدد'} · {a.destinationLabel}</small></div><select name="member" aria-label="المالك الجديد" defaultValue=""><option value="">اختر عضوًا</option>{snapshot.field.members.map(m=><option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select><input name="reason" aria-label="سبب إعادة الإسناد" placeholder="سبب موثق"/><button className="r2-action r2-action--primary" disabled={Boolean(busy)}>إعادة الإسناد</button></form>)}
        </article>
        <article className="r2-command-panel r2-command-authority"><div className="r2-command-panel__head"><div><p className="r2-eyebrow">Authority Boundary</p><h2>سلطة مركز القيادة</h2></div></div><dl><div><dt>Command write authority</dt><dd>none</dd></div><div><dt>Finance write authority</dt><dd>none</dd></div><div><dt>Execution</dt><dd>delegated gateways only</dd></div></dl></article>
      </section>
    </>}
  </div>
}
