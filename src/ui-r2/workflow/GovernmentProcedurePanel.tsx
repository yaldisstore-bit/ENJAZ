import { useEffect, useMemo, useState } from 'react';
import type { GovernmentProcedureCatalogItem, GovernmentProcedureTransition } from '../../features/workflow/governmentProcedureCommands.ts';
import type { GovernmentProcedureWorkflowController } from '../../features/workflow/useGovernmentProcedureWorkflow.ts';
import { useGovernmentProcedureWorkflow } from '../../features/workflow/useGovernmentProcedureWorkflow.ts';

function referenceMoney(cents: bigint | null, currency: string | null): string {
  if (cents === null || currency === null) return 'لا توجد رسوم مرجعية';
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${fraction} ${currency}`;
}

function stageStateLabel(value: string | undefined): string {
  if (value === 'active') return 'الحالية';
  if (value === 'completed') return 'مكتملة';
  if (value === 'reopened') return 'معاد فتحها';
  return 'قادمة';
}

function itemStateLabel(value: string): string {
  if (value === 'done') return 'منجز';
  if (value === 'waived') return 'متجاوز';
  if (value === 'skipped') return 'متخطى';
  return 'معلّق';
}

function procedureEntity(controller: GovernmentProcedureWorkflowController, procedure: GovernmentProcedureCatalogItem | undefined) {
  return controller.catalog?.entities.find((entity) => entity.id === procedure?.governmentEntityId);
}

function StartProcedureCard({ controller, transactionId }: Readonly<{ controller: GovernmentProcedureWorkflowController; transactionId: string }>) {
  const procedures = useMemo(() => controller.catalog?.procedures.filter((procedure) => procedure.active) ?? [], [controller.catalog]);
  const [procedureId, setProcedureId] = useState('');
  const [branchId, setBranchId] = useState('');
  const selected = procedures.find((procedure) => procedure.id === procedureId) ?? procedures[0];
  const branches = (controller.catalog?.branches ?? []).filter((branch) => selected?.branchIds.includes(branch.id) && branch.active);
  const prerequisites = (controller.catalog?.procedures ?? []).filter((procedure) => selected?.prerequisiteProcedureIds.includes(procedure.id));

  useEffect(() => {
    if (!selected) { setProcedureId(''); setBranchId(''); return; }
    if (procedureId !== selected.id) setProcedureId(selected.id);
    const firstBranch = branches[0]?.id ?? '';
    if (!branches.some((branch) => branch.id === branchId)) setBranchId(firstBranch);
  }, [branchId, branches, procedureId, selected]);

  if (!selected) return <div className="r2-p81-empty"><strong>لا توجد إجراءات حكومية مفعّلة</strong><p>أضف كتالوج الجهة والإجراء والقالب أولًا. لا يتم تصنيع مسار افتراضي.</p></div>;
  const entity = procedureEntity(controller, selected);
  const branchRequired = selected.branchIds.length > 0;
  const busy = controller.status === 'mutating';
  return <section className="r2-p81-start" data-p81-start-surface="true" data-transaction-id={transactionId}>
    <header><div><span className="r2-p81-kicker">ربط المعاملة بإجراء رسمي</span><h3>بدء إجراء حكومي</h3></div><span className="r2-p81-authority">Workflow كانوني واحد</span></header>
    <div className="r2-p81-start-grid">
      <label><span>الإجراء</span><select aria-label="الإجراء الحكومي" value={selected.id} onChange={(event) => { setProcedureId(event.currentTarget.value); setBranchId(''); }}>{procedures.map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}</select></label>
      <label><span>الفرع</span><select aria-label="فرع الجهة الحكومية" value={branchId} disabled={!branches.length} onChange={(event) => setBranchId(event.currentTarget.value)}>{branches.length ? branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>) : <option value="">لا يتطلب فرعًا</option>}</select></label>
    </div>
    <div className="r2-p81-start-summary"><div><span>الجهة</span><strong>{entity?.shortName || entity?.name || 'جهة غير متاحة'}</strong></div><div><span>المراحل</span><strong>{selected.stages.length}</strong></div><div><span>المتطلبات السابقة</span><strong>{prerequisites.length}</strong></div></div>
    {prerequisites.length ? <div className="r2-p81-prerequisites"><strong>إجراءات سابقة مطلوبة</strong>{prerequisites.map((item) => <span key={item.id}>{item.name}</span>)}</div> : null}
    <ol className="r2-p81-template-preview">{selected.stages.map((stage) => <li key={stage.position}><span>{stage.position}</span><div><strong>{stage.name}</strong><small>{stage.dueOffsetDays === null ? 'دون SLA محدد' : `SLA مرجعي: ${stage.dueOffsetDays} يوم`} · {referenceMoney(stage.officialFeeCents, stage.feeCurrency)}</small></div></li>)}</ol>
    <div className="r2-p81-reference-note"><strong>الرسوم هنا مرجعية فقط</strong><span>لا تُنشئ دفعة أو قيدًا ماليًا. السلطة المالية تبقى في Phase 7.</span></div>
    <button type="button" className="r2-action r2-action--primary" disabled={busy || (branchRequired && !branchId)} onClick={() => { void controller.startProcedure(selected.id, branchRequired ? branchId : null); }}>{busy ? 'جارٍ تثبيت الإجراء…' : 'بدء الإجراء وربط Snapshot'}</button>
  </section>;
}

function TransitionControls({ controller, transitions }: Readonly<{ controller: GovernmentProcedureWorkflowController; transitions: readonly GovernmentProcedureTransition[] }>) {
  const [reason, setReason] = useState('');
  const instance = controller.context?.instance;
  if (!instance || !transitions.length) return <div className="r2-p81-empty r2-p81-empty--compact"><strong>لا توجد حركة مسموحة الآن</strong><p>{instance?.status === 'completed' ? 'الإجراء مكتمل ولا توجد إعادة فتح معرفة لهذه المرحلة.' : 'قالب الإجراء لا يعرّف انتقالًا صالحًا من المرحلة الحالية.'}</p></div>;
  const needsReason = transitions.some((transition) => transition.requiresReason || transition.kind === 'reopen');
  const busy = controller.status === 'mutating';
  return <section className="r2-p81-actions" aria-label="الانتقالات المسموحة">
    {needsReason ? <label><span>سبب الانتقال / إعادة الفتح</span><textarea rows={3} value={reason} maxLength={600} onChange={(event) => setReason(event.currentTarget.value)} placeholder="يُحفظ السبب في سجل الانتقالات عند الحاجة" /></label> : null}
    <div>{transitions.map((transition) => {
      const requiresReason = transition.requiresReason || transition.kind === 'reopen';
      const blockedByItems = instance.pendingRequiredCount > 0 && (transition.kind === 'advance' || transition.kind === 'complete');
      return <button key={transition.key} type="button" className={transition.kind === 'reopen' ? 'r2-action r2-action--secondary' : 'r2-action r2-action--primary'} disabled={busy || blockedByItems || (requiresReason && reason.trim().length < 3)} data-transition-kind={transition.kind} onClick={() => { void controller.transition(transition, requiresReason ? reason : null); }}><span>{busy ? 'جارٍ التحقق…' : transition.label}</span>{blockedByItems ? <small>{instance.pendingRequiredCount} متطلب إلزامي معلّق</small> : null}</button>;
    })}</div>
  </section>;
}

export function GovernmentProcedurePanelView({ controller, transactionId }: Readonly<{ controller: GovernmentProcedureWorkflowController; transactionId: string }>) {
  const [startAnother, setStartAnother] = useState(false);
  if (controller.status === 'loading') return <section className="r2-p81-panel" data-p81-workflow="loading"><div className="r2-p81-empty"><strong>جارٍ تحميل الإجراء الحكومي</strong><p>تُقرأ الحالة من Workflow والكتالوج الكانوني داخل مساحة العمل.</p></div></section>;
  if (controller.status === 'error' || !controller.catalog || !controller.context) return <section className="r2-p81-panel" data-p81-workflow="error"><div className="r2-p81-empty"><strong>تعذر تحميل الإجراء الحكومي</strong><p>{controller.errorMessage ?? 'تعذر قراءة السياق.'}</p><button type="button" className="r2-action r2-action--secondary" onClick={controller.retry}>إعادة المحاولة</button></div></section>;

  const instance = controller.context.instance;
  const procedure = controller.catalog.procedures.find((item) => item.id === instance?.procedureId);
  const entity = procedureEntity(controller, procedure);
  const branch = controller.catalog.branches.find((item) => item.id === instance?.branchId);
  const currentStage = procedure?.stages.find((stage) => stage.position === instance?.currentStagePosition);
  const currentItems = instance?.itemStates.filter((item) => item.stagePosition === instance.currentStagePosition) ?? [];
  const stageState = new Map(instance?.stageStates.map((state) => [state.position, state]) ?? []);
  const visibleTransitions = instance?.status === 'completed' ? instance.allowedTransitions.filter((transition) => transition.kind === 'reopen') : instance?.allowedTransitions ?? [];
  const showStarter = !instance || (instance.status === 'completed' && startAnother);

  return <section className="r2-p81-panel" data-p81-workflow={instance?.status ?? 'empty'} data-p81-authority="canonical_workflow_instance">
    <header className="r2-p81-heading"><div><span className="r2-p81-kicker">Phase 8.1 · Government Procedure OS</span><h2>الإجراء الحكومي</h2><p>حالة مرئية متصلة بالمعاملة نفسها؛ لا توجد آلة حالة موازية أو كتابة مالية مخفية.</p></div><span className="r2-p81-authority">M1 · Workflow + Government Catalog</span></header>
    {controller.errorMessage ? <p className="r2-p81-message r2-p81-message--error" role="alert">{controller.errorMessage}</p> : null}
    {controller.actionMessage ? <p className="r2-p81-message" role="status">{controller.actionMessage}</p> : null}
    {showStarter ? <StartProcedureCard controller={controller} transactionId={transactionId} /> : null}
    {instance ? <>
      <section className="r2-p81-overview">
        <div><span>الإجراء</span><strong>{procedure?.name ?? 'إجراء غير متاح في الكتالوج'}</strong><small>{procedure?.code ?? '—'}</small></div>
        <div><span>الجهة</span><strong>{entity?.shortName || entity?.name || '—'}</strong><small>{branch?.name ?? 'دون فرع'}</small></div>
        <div><span>المرحلة الحالية</span><strong>{currentStage?.name ?? `المرحلة ${instance.currentStagePosition}`}</strong><small>{currentStage?.dueOffsetDays === null || currentStage?.dueOffsetDays === undefined ? 'SLA غير محدد' : `${currentStage.dueOffsetDays} يوم مرجعي`}</small></div>
        <div><span>الحالة</span><strong>{instance.status === 'completed' ? 'مكتمل' : 'نشط'}</strong><small>{instance.pendingRequiredCount} متطلب إلزامي معلّق</small></div>
      </section>
      <section className="r2-p81-fee" data-money-authority="reference_fees_only_no_finance_write"><div><span>الرسم الحكومي المرجعي للمرحلة</span><strong>{referenceMoney(currentStage?.officialFeeCents ?? null, currentStage?.feeCurrency ?? null)}</strong></div><p>مرجع إجرائي فقط — لا يسجّل دفعة ولا يغيّر الخزنة أو دفتر المالية.</p></section>
      <section className="r2-p81-stages" aria-label="مراحل الإجراء"><header><span>الخريطة المرئية</span><strong>{procedure?.stages.length ?? instance.stageStates.length} مراحل</strong></header><ol>{(procedure?.stages ?? []).map((stage) => { const state = stageState.get(stage.position); return <li key={stage.position} className={`is-${state?.status ?? 'pending'}`} aria-current={stage.position === instance.currentStagePosition ? 'step' : undefined}><span className="r2-p81-stage-number">{stage.position}</span><div><strong>{stage.name}</strong><small>{stageStateLabel(state?.status)} · {stage.dueOffsetDays === null ? 'SLA غير محدد' : `${stage.dueOffsetDays} يوم`}</small></div></li>; })}</ol></section>
      <section className="r2-p81-requirements"><header><div><span>متطلبات المرحلة الحالية</span><h3>{currentStage?.name ?? `المرحلة ${instance.currentStagePosition}`}</h3></div><strong>{currentItems.filter((item) => item.status === 'done').length}/{currentItems.length}</strong></header>{currentItems.length ? <div className="r2-p81-requirement-list">{currentItems.map((item) => <article key={item.id} className={item.status === 'pending' ? 'is-pending' : 'is-done'}><div><span>{item.required ? 'إلزامي' : 'اختياري'} · {item.itemType}</span><strong>{item.title}</strong><small>{itemStateLabel(item.status)}</small></div>{item.status === 'pending' ? <button type="button" className="r2-action r2-action--secondary" disabled={controller.status === 'mutating'} onClick={() => { void controller.completeRequirement(item.id); }}>تم الإنجاز</button> : <span className="r2-p81-done">✓ مثبت</span>}</article>)}</div> : <div className="r2-p81-empty r2-p81-empty--compact"><strong>لا متطلبات في هذه المرحلة</strong><p>يمكن الانتقال وفق الانتقالات المعرفة في القالب.</p></div>}</section>
      <TransitionControls controller={controller} transitions={visibleTransitions} />
      {instance.status === 'completed' ? <div className="r2-p81-next"><div><strong>الإجراء الحالي مكتمل</strong><span>يمكن بدء إجراء حكومي آخر على نفس المعاملة؛ قاعدة البيانات تمنع وجود إجراءين نشطين معًا.</span></div><button type="button" className="r2-action r2-action--secondary" aria-pressed={startAnother} onClick={() => setStartAnother((value) => !value)}>{startAnother ? 'إخفاء البدء الجديد' : 'بدء إجراء آخر'}</button></div> : null}
    </> : null}
  </section>;
}

export function ConnectedGovernmentProcedurePanel({ transactionId }: Readonly<{ transactionId: string }>) {
  return <GovernmentProcedurePanelView controller={useGovernmentProcedureWorkflow(transactionId)} transactionId={transactionId} />;
}
