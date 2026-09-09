import type {
  RiskFactSnapshot,
  RiskSeverity,
  RiskSignal,
  RiskThresholds,
} from './riskEngine.ts';

const defaults: RiskThresholds = { inactiveHours: 48, nearDeadlineHours: 72, workloadActiveCount: 8, workloadUrgentCount: 3 };
const sr: Record<RiskSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const ur = { monitor: 1, soon: 2, now: 3 } as const;
const time = (v: string | null | undefined) => { const n = v ? Date.parse(v) : NaN; return Number.isFinite(n) ? n : null; };
const active = (s: string) => !['completed', 'archived', 'cancelled', 'deleted'].includes(s.toLowerCase());
const count = (n: number) => Number.isSafeInteger(n) && n >= 0;

function frozen(signal: RiskSignal): RiskSignal {
  return Object.freeze({
    ...signal,
    entity: Object.freeze({ ...signal.entity }),
    components: Object.freeze(signal.components.map((x) => Object.freeze({ ...x }))),
    evidence: Object.freeze(signal.evidence.map((x) => Object.freeze({ ...x }))),
    recommendation: Object.freeze({ ...signal.recommendation }),
  });
}

export function evaluateOperationalRiskSnapshot(snapshot: RiskFactSnapshot, t: RiskThresholds = defaults): readonly RiskSignal[] {
  const now = time(snapshot.evaluatedAt);
  if (now === null) throw new Error('Risk evaluation requires a valid evaluatedAt timestamp');
  if (!Number.isFinite(t.inactiveHours) || t.inactiveHours <= 0 || !Number.isFinite(t.nearDeadlineHours) || t.nearDeadlineHours <= 0 || !Number.isSafeInteger(t.workloadActiveCount) || t.workloadActiveCount <= 0 || !Number.isSafeInteger(t.workloadUrgentCount) || t.workloadUrgentCount <= 0) throw new Error('Risk thresholds must be positive and finite');
  const out: RiskSignal[] = [];
  const push = (x: RiskSignal) => out.push(frozen(x));

  for (const x of snapshot.transactions ?? []) {
    if (!x.id.trim()) continue;
    const entity = x.label === undefined ? { type: 'transaction' as const, id: x.id } : { type: 'transaction' as const, id: x.id, label: x.label };
    const status = x.status.toLowerCase();
    if (status === 'stalled') {
      const urgent = x.priority?.toLowerCase() === 'urgent';
      push({ code: 'transaction_stalled', severity: urgent ? 'critical' : 'high', urgency: 'now', entity,
        components: [{ code: 'status_stalled', explanation: 'الحالة المعتمدة للمعاملة هي stalled.' }, ...(urgent ? [{ code: 'priority_urgent', explanation: 'أولوية المعاملة urgent.' }] : [])],
        evidence: [{ sourceDomain: 'transactions', sourceObjectId: x.id, field: 'status', observedValue: x.status, observedAt: snapshot.evaluatedAt }, ...(urgent ? [{ sourceDomain: 'transactions' as const, sourceObjectId: x.id, field: 'priority', observedValue: x.priority!, observedAt: snapshot.evaluatedAt }] : [])],
        explanation: urgent ? 'معاملة متوقفة ذات أولوية عاجلة.' : 'معاملة متوقفة تحتاج مراجعة سبب التعطل.', evaluatedAt: snapshot.evaluatedAt,
        recommendation: { destination: '/app/transactions', label: 'فتح المعاملة ومراجعة التعطل', mutates: false } });
    }
    if (active(status)) {
      const last = time(x.lastActivityAt);
      if (last !== null && last <= now) {
        const h = (now - last) / 3_600_000;
        if (h >= t.inactiveHours) push({ code: 'transaction_inactive', severity: h >= t.inactiveHours * 2 ? 'high' : 'medium', urgency: h >= t.inactiveHours * 2 ? 'now' : 'soon', entity,
          components: [{ code: 'inactivity_window', explanation: `لا توجد حركة معتمدة منذ ${Math.floor(h)} ساعة.` }],
          evidence: [{ sourceDomain: 'transactions', sourceObjectId: x.id, field: 'last_activity_at', observedValue: x.lastActivityAt!, observedAt: snapshot.evaluatedAt }],
          explanation: `المعاملة فعّالة لكن آخر حركة أقدم من حد ${t.inactiveHours} ساعة.`, evaluatedAt: snapshot.evaluatedAt,
          recommendation: { destination: '/app/transactions', label: 'مراجعة آخر نشاط والحالة', mutates: false } });
      }
    }
    for (const b of x.blockers ?? []) {
      const sev = b.severity.toLowerCase();
      if (b.status.toLowerCase() !== 'open' || (sev !== 'high' && sev !== 'critical') || !b.id.trim()) continue;
      push({ code: 'open_critical_blocker', severity: sev === 'critical' ? 'critical' : 'high', urgency: 'now', entity,
        components: [{ code: `blocker_${sev}`, explanation: `يوجد حاجز ${sev} مفتوح.` }],
        evidence: [{ sourceDomain: 'transactions', sourceObjectId: b.id, field: 'status', observedValue: b.status, observedAt: b.openedAt ?? snapshot.evaluatedAt }, { sourceDomain: 'transactions', sourceObjectId: b.id, field: 'severity', observedValue: b.severity, observedAt: b.openedAt ?? snapshot.evaluatedAt }],
        explanation: 'حاجز عالي/حرج مفتوح يمنع اعتبار العمل طبيعيًا.', evaluatedAt: snapshot.evaluatedAt,
        recommendation: { destination: '/app/transactions', label: 'مراجعة الحاجز المفتوح', mutates: false } });
    }
  }

  for (const x of snapshot.financeAnomalies ?? []) {
    if (!x.id.trim() || !x.kind.trim() || !x.explanation.trim()) continue;
    push({ code: 'finance_anomaly', severity: x.severity, urgency: sr[x.severity] >= 3 ? 'now' : 'soon', entity: x.label === undefined ? { type: 'finance', id: x.id } : { type: 'finance', id: x.id, label: x.label },
      components: [{ code: x.kind, explanation: x.explanation }], evidence: [{ sourceDomain: 'finance', sourceObjectId: x.id, field: 'anomaly_kind', observedValue: x.kind, observedAt: x.observedAt ?? snapshot.evaluatedAt }], explanation: x.explanation, evaluatedAt: snapshot.evaluatedAt,
      recommendation: { destination: '/app/finance', label: 'مراجعة المصدر المالي المعتمد', mutates: false } });
  }

  for (const x of snapshot.workloads ?? []) {
    if (!x.ownerId.trim() || !count(x.activeCount) || !count(x.urgentCount) || (x.activeCount < t.workloadActiveCount && x.urgentCount < t.workloadUrgentCount)) continue;
    const urgent = x.urgentCount >= t.workloadUrgentCount;
    push({ code: 'workload_concentration', severity: urgent ? 'high' : 'medium', urgency: urgent ? 'now' : 'soon', entity: x.ownerLabel === undefined ? { type: 'workload', id: x.ownerId } : { type: 'workload', id: x.ownerId, label: x.ownerLabel },
      components: [{ code: 'active_count', explanation: `${x.activeCount} عنصرًا فعّالًا لدى المالك.` }, { code: 'urgent_count', explanation: `${x.urgentCount} عنصرًا عاجلًا لدى المالك.` }],
      evidence: [{ sourceDomain: 'field-operations', sourceObjectId: x.ownerId, field: 'active_count', observedValue: x.activeCount, observedAt: x.observedAt ?? snapshot.evaluatedAt }, { sourceDomain: 'field-operations', sourceObjectId: x.ownerId, field: 'urgent_count', observedValue: x.urgentCount, observedAt: x.observedAt ?? snapshot.evaluatedAt }],
      explanation: 'عبء العمل متركز فوق الحد المعلن ويحتاج مراجعة توزيع المسؤولية.', evaluatedAt: snapshot.evaluatedAt,
      recommendation: { destination: '/app/operations', label: 'مراجعة توزيع عبء العمل', mutates: false } });
  }

  out.sort((a, b) => sr[b.severity] - sr[a.severity] || ur[b.urgency] - ur[a.urgency] || `${a.code}:${a.entity.type}:${a.entity.id}`.localeCompare(`${b.code}:${b.entity.type}:${b.entity.id}`));
  return Object.freeze(out);
}
