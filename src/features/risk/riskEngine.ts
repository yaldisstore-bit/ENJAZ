export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskUrgency = 'monitor' | 'soon' | 'now';
export type RiskEntityType = 'transaction' | 'workflow' | 'finance' | 'workload' | 'company';
export type RiskSourceDomain = 'transactions' | 'workflow' | 'finance' | 'field-operations' | 'companies';

export interface RiskEntityRef {
  readonly type: RiskEntityType;
  readonly id: string;
  readonly label?: string;
}

export interface RiskEvidence {
  readonly sourceDomain: RiskSourceDomain;
  readonly sourceObjectId: string;
  readonly field: string;
  readonly observedValue: string | number | boolean;
  readonly observedAt: string | null;
}

export interface RiskComponent {
  readonly code: string;
  readonly explanation: string;
}

export interface RiskRecommendation {
  readonly destination: '/app/transactions' | '/app/workflow' | '/app/finance' | '/app/operations' | '/app/companies';
  readonly label: string;
  readonly mutates: false;
}

export interface RiskSignal {
  readonly code:
    | 'transaction_stalled'
    | 'transaction_inactive'
    | 'open_critical_blocker'
    | 'deadline_overdue'
    | 'deadline_near'
    | 'workflow_sla_pressure'
    | 'finance_anomaly'
    | 'workload_concentration'
    | 'company_compliance_due';
  readonly severity: RiskSeverity;
  readonly urgency: RiskUrgency;
  readonly entity: RiskEntityRef;
  readonly components: readonly RiskComponent[];
  readonly evidence: readonly RiskEvidence[];
  readonly explanation: string;
  readonly evaluatedAt: string;
  readonly recommendation: RiskRecommendation;
}

export interface RiskTransactionFact {
  readonly id: string;
  readonly label?: string;
  readonly status: string;
  readonly priority?: string | null;
  readonly lastActivityAt?: string | null;
  readonly dueAt?: string | null;
  readonly blockers?: readonly {
    readonly id: string;
    readonly severity: string;
    readonly status: string;
    readonly openedAt?: string | null;
  }[];
}

export interface RiskWorkflowFact {
  readonly instanceId: string;
  readonly transactionId: string;
  readonly label?: string;
  readonly status: string;
  readonly slaDueAt?: string | null;
}

export interface RiskFinanceAnomalyFact {
  readonly id: string;
  readonly label?: string;
  readonly kind: string;
  readonly severity: RiskSeverity;
  readonly explanation: string;
  readonly observedAt?: string | null;
}

export interface RiskWorkloadFact {
  readonly ownerId: string;
  readonly ownerLabel?: string;
  readonly activeCount: number;
  readonly urgentCount: number;
  readonly observedAt?: string | null;
}

export interface RiskCompanyFact {
  readonly id: string;
  readonly label?: string;
  readonly complianceDueAt?: string | null;
  readonly complianceStatus?: string | null;
}

export interface RiskFactSnapshot {
  readonly evaluatedAt: string;
  readonly transactions?: readonly RiskTransactionFact[];
  readonly workflows?: readonly RiskWorkflowFact[];
  readonly financeAnomalies?: readonly RiskFinanceAnomalyFact[];
  readonly workloads?: readonly RiskWorkloadFact[];
  readonly companies?: readonly RiskCompanyFact[];
}

export interface RiskThresholds {
  readonly inactiveHours: number;
  readonly nearDeadlineHours: number;
  readonly workloadActiveCount: number;
  readonly workloadUrgentCount: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = Object.freeze({
  inactiveHours: 48,
  nearDeadlineHours: 72,
  workloadActiveCount: 8,
  workloadUrgentCount: 3,
});

const severityRank: Readonly<Record<RiskSeverity, number>> = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });
const urgencyRank: Readonly<Record<RiskUrgency, number>> = Object.freeze({ monitor: 1, soon: 2, now: 3 });

function validDate(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function hoursBetween(later: number, earlier: number): number {
  return (later - earlier) / 3_600_000;
}

function entityRef(type: RiskEntityType, id: string, label: string | undefined): RiskEntityRef {
  return label === undefined ? { type, id } : { type, id, label };
}

function freezeSignal(signal: RiskSignal): RiskSignal {
  return Object.freeze({
    ...signal,
    entity: Object.freeze({ ...signal.entity }),
    components: Object.freeze(signal.components.map((component) => Object.freeze({ ...component }))),
    evidence: Object.freeze(signal.evidence.map((evidence) => Object.freeze({ ...evidence }))),
    recommendation: Object.freeze({ ...signal.recommendation }),
  });
}

function signal(input: RiskSignal): RiskSignal {
  if (!input.entity.id.trim()) throw new Error('Risk signal entity id is required');
  if (input.components.length === 0 || input.evidence.length === 0) throw new Error('Risk signals require explainable components and evidence');
  return freezeSignal(input);
}

function activeWork(status: string): boolean {
  return !['completed', 'archived', 'cancelled', 'deleted'].includes(status.toLowerCase());
}

function addDeadlineSignal(
  out: RiskSignal[],
  input: {
    readonly entity: RiskEntityRef;
    readonly sourceDomain: RiskSourceDomain;
    readonly sourceObjectId: string;
    readonly dueAt: string | null | undefined;
    readonly evaluatedAt: string;
    readonly nowMs: number;
    readonly nearHours: number;
    readonly field: string;
    readonly overdueCode: 'deadline_overdue' | 'company_compliance_due';
    readonly nearCode: 'deadline_near' | 'company_compliance_due';
    readonly destination: RiskRecommendation['destination'];
    readonly label: string;
  },
) {
  const dueMs = validDate(input.dueAt);
  if (dueMs === null) return;
  const remainingHours = hoursBetween(dueMs, input.nowMs);
  if (remainingHours > input.nearHours) return;
  const overdue = remainingHours < 0;
  const code = overdue ? input.overdueCode : input.nearCode;
  const severity: RiskSeverity = overdue ? 'critical' : remainingHours <= 24 ? 'high' : 'medium';
  const urgency: RiskUrgency = overdue || remainingHours <= 24 ? 'now' : 'soon';
  const relation = overdue ? `متأخر منذ ${Math.max(1, Math.ceil(Math.abs(remainingHours)))} ساعة` : `متبقٍ ${Math.max(1, Math.ceil(remainingHours))} ساعة`;
  out.push(signal({
    code,
    severity,
    urgency,
    entity: input.entity,
    components: [{ code: overdue ? 'past_due' : 'near_due', explanation: relation }],
    evidence: [{ sourceDomain: input.sourceDomain, sourceObjectId: input.sourceObjectId, field: input.field, observedValue: input.dueAt!, observedAt: input.evaluatedAt }],
    explanation: `${input.label}: ${relation}.`,
    evaluatedAt: input.evaluatedAt,
    recommendation: { destination: input.destination, label: 'مراجعة المصدر المعتمد', mutates: false },
  }));
}

export function evaluateRiskSnapshot(
  snapshot: RiskFactSnapshot,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): readonly RiskSignal[] {
  const nowMs = validDate(snapshot.evaluatedAt);
  if (nowMs === null) throw new Error('Risk evaluation requires a valid evaluatedAt timestamp');
  if (
    !Number.isFinite(thresholds.inactiveHours) || thresholds.inactiveHours <= 0 ||
    !Number.isFinite(thresholds.nearDeadlineHours) || thresholds.nearDeadlineHours <= 0 ||
    !Number.isSafeInteger(thresholds.workloadActiveCount) || thresholds.workloadActiveCount <= 0 ||
    !Number.isSafeInteger(thresholds.workloadUrgentCount) || thresholds.workloadUrgentCount <= 0
  ) throw new Error('Risk thresholds must be positive and finite');

  const out: RiskSignal[] = [];

  for (const transaction of snapshot.transactions ?? []) {
    if (!transaction.id.trim()) continue;
    const entity = entityRef('transaction', transaction.id, transaction.label);
    const status = transaction.status.toLowerCase();
    if (status === 'stalled') {
      const urgent = transaction.priority?.toLowerCase() === 'urgent';
      out.push(signal({
        code: 'transaction_stalled',
        severity: urgent ? 'critical' : 'high',
        urgency: 'now',
        entity,
        components: [{ code: 'status_stalled', explanation: 'الحالة المعتمدة للمعاملة هي stalled.' }, ...(urgent ? [{ code: 'priority_urgent', explanation: 'أولوية المعاملة urgent.' }] : [])],
        evidence: [
          { sourceDomain: 'transactions', sourceObjectId: transaction.id, field: 'status', observedValue: transaction.status, observedAt: snapshot.evaluatedAt },
          ...(urgent ? [{ sourceDomain: 'transactions' as const, sourceObjectId: transaction.id, field: 'priority', observedValue: transaction.priority!, observedAt: snapshot.evaluatedAt }] : []),
        ],
        explanation: urgent ? 'معاملة متوقفة ذات أولوية عاجلة.' : 'معاملة متوقفة تحتاج مراجعة سبب التعطل.',
        evaluatedAt: snapshot.evaluatedAt,
        recommendation: { destination: '/app/transactions', label: 'فتح المعاملة ومراجعة التعطل', mutates: false },
      }));
    }

    if (activeWork(status)) {
      const lastActivityMs = validDate(transaction.lastActivityAt);
      if (lastActivityMs !== null && lastActivityMs <= nowMs) {
        const inactiveHours = hoursBetween(nowMs, lastActivityMs);
        if (inactiveHours >= thresholds.inactiveHours) {
          out.push(signal({
            code: 'transaction_inactive',
            severity: inactiveHours >= thresholds.inactiveHours * 2 ? 'high' : 'medium',
            urgency: inactiveHours >= thresholds.inactiveHours * 2 ? 'now' : 'soon',
            entity,
            components: [{ code: 'inactivity_window', explanation: `لا توجد حركة معتمدة منذ ${Math.floor(inactiveHours)} ساعة.` }],
            evidence: [{ sourceDomain: 'transactions', sourceObjectId: transaction.id, field: 'last_activity_at', observedValue: transaction.lastActivityAt!, observedAt: snapshot.evaluatedAt }],
            explanation: `المعاملة فعّالة لكن آخر حركة أقدم من حد ${thresholds.inactiveHours} ساعة.`,
            evaluatedAt: snapshot.evaluatedAt,
            recommendation: { destination: '/app/transactions', label: 'مراجعة آخر نشاط والحالة', mutates: false },
          }));
        }
      }
    }

    for (const blocker of transaction.blockers ?? []) {
      const blockerSeverity = blocker.severity.toLowerCase();
      if (blocker.status.toLowerCase() !== 'open' || !['high', 'critical'].includes(blockerSeverity) || !blocker.id.trim()) continue;
      const severity: RiskSeverity = blockerSeverity === 'critical' ? 'critical' : 'high';
      out.push(signal({
        code: 'open_critical_blocker',
        severity,
        urgency: 'now',
        entity,
        components: [{ code: `blocker_${blockerSeverity}`, explanation: `يوجد حاجز ${blockerSeverity} مفتوح.` }],
        evidence: [
          { sourceDomain: 'transactions', sourceObjectId: blocker.id, field: 'status', observedValue: blocker.status, observedAt: blocker.openedAt ?? snapshot.evaluatedAt },
          { sourceDomain: 'transactions', sourceObjectId: blocker.id, field: 'severity', observedValue: blocker.severity, observedAt: blocker.openedAt ?? snapshot.evaluatedAt },
        ],
        explanation: 'حاجز عالي/حرج مفتوح يمنع اعتبار العمل طبيعيًا.',
        evaluatedAt: snapshot.evaluatedAt,
        recommendation: { destination: '/app/transactions', label: 'مراجعة الحاجز المفتوح', mutates: false },
      }));
    }

    if (activeWork(status)) {
      addDeadlineSignal(out, {
        entity,
        sourceDomain: 'transactions',
        sourceObjectId: transaction.id,
        dueAt: transaction.dueAt,
        evaluatedAt: snapshot.evaluatedAt,
        nowMs,
        nearHours: thresholds.nearDeadlineHours,
        field: 'due_at',
        overdueCode: 'deadline_overdue',
        nearCode: 'deadline_near',
        destination: '/app/transactions',
        label: 'موعد المعاملة',
      });
    }
  }

  for (const workflow of snapshot.workflows ?? []) {
    if (!workflow.instanceId.trim() || !activeWork(workflow.status)) continue;
    const dueMs = validDate(workflow.slaDueAt);
    if (dueMs === null) continue;
    const remainingHours = hoursBetween(dueMs, nowMs);
    if (remainingHours > thresholds.nearDeadlineHours) continue;
    const overdue = remainingHours < 0;
    out.push(signal({
      code: 'workflow_sla_pressure',
      severity: overdue ? 'critical' : remainingHours <= 24 ? 'high' : 'medium',
      urgency: overdue || remainingHours <= 24 ? 'now' : 'soon',
      entity: entityRef('workflow', workflow.instanceId, workflow.label),
      components: [{ code: overdue ? 'sla_overdue' : 'sla_near', explanation: overdue ? 'تجاوز المسار حد SLA المعتمد.' : 'المسار يقترب من حد SLA المعتمد.' }],
      evidence: [{ sourceDomain: 'workflow', sourceObjectId: workflow.instanceId, field: 'sla_due_at', observedValue: workflow.slaDueAt!, observedAt: snapshot.evaluatedAt }],
      explanation: overdue ? 'مسار العمل تجاوز موعد SLA.' : 'مسار العمل قريب من موعد SLA.',
      evaluatedAt: snapshot.evaluatedAt,
      recommendation: { destination: '/app/workflow', label: 'فتح مسار العمل ومراجعة المرحلة', mutates: false },
    }));
  }

  for (const anomaly of snapshot.financeAnomalies ?? []) {
    if (!anomaly.id.trim() || !anomaly.kind.trim() || !anomaly.explanation.trim()) continue;
    out.push(signal({
      code: 'finance_anomaly',
      severity: anomaly.severity,
      urgency: severityRank[anomaly.severity] >= severityRank.high ? 'now' : 'soon',
      entity: entityRef('finance', anomaly.id, anomaly.label),
      components: [{ code: anomaly.kind, explanation: anomaly.explanation }],
      evidence: [{ sourceDomain: 'finance', sourceObjectId: anomaly.id, field: 'anomaly_kind', observedValue: anomaly.kind, observedAt: anomaly.observedAt ?? snapshot.evaluatedAt }],
      explanation: anomaly.explanation,
      evaluatedAt: snapshot.evaluatedAt,
      recommendation: { destination: '/app/finance', label: 'مراجعة المصدر المالي المعتمد', mutates: false },
    }));
  }

  for (const workload of snapshot.workloads ?? []) {
    if (!workload.ownerId.trim() || !validCount(workload.activeCount) || !validCount(workload.urgentCount)) continue;
    if (workload.activeCount < thresholds.workloadActiveCount && workload.urgentCount < thresholds.workloadUrgentCount) continue;
    const urgentPressure = workload.urgentCount >= thresholds.workloadUrgentCount;
    out.push(signal({
      code: 'workload_concentration',
      severity: urgentPressure ? 'high' : 'medium',
      urgency: urgentPressure ? 'now' : 'soon',
      entity: entityRef('workload', workload.ownerId, workload.ownerLabel),
      components: [
        { code: 'active_count', explanation: `${workload.activeCount} عنصرًا فعّالًا لدى المالك.` },
        { code: 'urgent_count', explanation: `${workload.urgentCount} عنصرًا عاجلًا لدى المالك.` },
      ],
      evidence: [
        { sourceDomain: 'field-operations', sourceObjectId: workload.ownerId, field: 'active_count', observedValue: workload.activeCount, observedAt: workload.observedAt ?? snapshot.evaluatedAt },
        { sourceDomain: 'field-operations', sourceObjectId: workload.ownerId, field: 'urgent_count', observedValue: workload.urgentCount, observedAt: workload.observedAt ?? snapshot.evaluatedAt },
      ],
      explanation: 'عبء العمل متركز فوق الحد المعلن ويحتاج مراجعة توزيع المسؤولية.',
      evaluatedAt: snapshot.evaluatedAt,
      recommendation: { destination: '/app/operations', label: 'مراجعة توزيع عبء العمل', mutates: false },
    }));
  }

  for (const company of snapshot.companies ?? []) {
    if (!company.id.trim()) continue;
    const status = company.complianceStatus?.toLowerCase();
    if (status === 'expired' || status === 'overdue') {
      out.push(signal({
        code: 'company_compliance_due',
        severity: 'critical',
        urgency: 'now',
        entity: entityRef('company', company.id, company.label),
        components: [{ code: 'compliance_status_overdue', explanation: `حالة الامتثال المعتمدة هي ${company.complianceStatus}.` }],
        evidence: [{ sourceDomain: 'companies', sourceObjectId: company.id, field: 'compliance_status', observedValue: company.complianceStatus!, observedAt: snapshot.evaluatedAt }],
        explanation: 'حالة امتثال/تجديد الشركة متأخرة وفق المصدر المعتمد.',
        evaluatedAt: snapshot.evaluatedAt,
        recommendation: { destination: '/app/companies', label: 'مراجعة بيانات الامتثال المعتمدة', mutates: false },
      }));
      continue;
    }
    addDeadlineSignal(out, {
      entity: entityRef('company', company.id, company.label),
      sourceDomain: 'companies',
      sourceObjectId: company.id,
      dueAt: company.complianceDueAt,
      evaluatedAt: snapshot.evaluatedAt,
      nowMs,
      nearHours: thresholds.nearDeadlineHours,
      field: 'compliance_due_at',
      overdueCode: 'company_compliance_due',
      nearCode: 'company_compliance_due',
      destination: '/app/companies',
      label: 'امتثال/تجديد الشركة',
    });
  }

  out.sort((a, b) => {
    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta) return severityDelta;
    const urgencyDelta = urgencyRank[b.urgency] - urgencyRank[a.urgency];
    if (urgencyDelta) return urgencyDelta;
    return `${a.code}:${a.entity.type}:${a.entity.id}`.localeCompare(`${b.code}:${b.entity.type}:${b.entity.id}`);
  });

  return Object.freeze(out);
}