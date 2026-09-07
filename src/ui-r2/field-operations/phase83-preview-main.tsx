import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { FieldOperationsCommandProvider } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import type {
  FieldLocationPolicy,
  FieldOperationsCommandGateway,
  FieldOperationsContext,
  FieldVisitSummary,
  FinishFieldVisitInput,
  UpsertFieldAssignmentInput,
} from '../../features/field-operations/fieldOperationsCommands.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { LiveFieldOperationsExperience } from './LiveFieldOperationsExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import '../operational-intelligence/operational-intelligence.css';
import './field-operations.css';

const W = '11111111-1111-4111-8111-111111111111';
const U = '22222222-2222-4222-8222-222222222222';
const U2 = '22222222-2222-4222-8222-222222222223';
const TX1 = '33333333-3333-4333-8333-333333333331';
const TX2 = '33333333-3333-4333-8333-333333333332';
const A1 = '44444444-4444-4444-8444-444444444441';
const A2 = '44444444-4444-4444-8444-444444444442';
const COMPANY1 = '55555555-5555-4555-8555-555555555551';
const COMPANY2 = '55555555-5555-4555-8555-555555555552';
const NOW = '2026-09-07T12:00:00.000Z';

let locationPolicy: FieldLocationPolicy = 'disabled';
let assignments: FieldOperationsContext['assignments'] = Object.freeze([
  Object.freeze({ id: A1, transactionId: TX1, transactionType: 'تأسيس شركة', transactionStatus: 'active', companyName: 'شركة النخبة', assignedUserId: U, assignedUserName: 'سارة علي', scheduledFor: '2026-09-08', destinationLabel: 'دائرة تسجيل الشركات', department: 'شباك الاستعلامات', priority: 'urgent' as const, status: 'queued' as const, version: 1, openBlockers: 1, nextRequiredAction: 'حل المانع: إكمال مستمسك ناقص' }),
  Object.freeze({ id: A2, transactionId: TX2, transactionType: 'تعديل عقد', transactionStatus: 'stalled', companyName: 'شركة الرافدين', assignedUserId: U2, assignedUserName: 'أحمد كريم', scheduledFor: '2026-09-09', destinationLabel: 'غرفة تجارة بغداد', department: null, priority: 'high' as const, status: 'queued' as const, version: 1, openBlockers: 0, nextRequiredAction: 'متابعة: تأكيد موعد المراجعة' }),
]);
let visits: FieldOperationsContext['visits'] = Object.freeze([]);

function currentContext(): FieldOperationsContext {
  return Object.freeze({
    authority: 'field_assignments_visits_evidence_receipts', transactionWriteAuthority: 'none', workflowWriteAuthority: 'existing_workflow_rpc_only', automationWriteAuthority: 'existing_automation_rpc_only', financeWriteAuthority: 'none',
    locationPolicy,
    metrics: Object.freeze({ activeTransactions: 5, stalledTransactions: 2, highCriticalBlockers: 1, pendingAutomationApprovals: 1, queuedAssignments: assignments.filter((item) => item.status === 'queued').length, activeVisits: visits.filter((item) => item.status === 'checked_in').length }),
    members: Object.freeze([Object.freeze({ userId: U, displayName: 'سارة علي' }), Object.freeze({ userId: U2, displayName: 'أحمد كريم' })]),
    assignments,
    visits,
  });
}
function replaceAssignment(id: string, update: (assignment: FieldOperationsContext['assignments'][number]) => FieldOperationsContext['assignments'][number]) {
  assignments = Object.freeze(assignments.map((item) => item.id === id ? Object.freeze(update(item)) : item));
}
function replaceVisit(id: string, update: (visit: FieldVisitSummary) => FieldVisitSummary) {
  visits = Object.freeze(visits.map((item) => item.id === id ? Object.freeze(update(item)) : item));
}

const gateway: FieldOperationsCommandGateway = Object.freeze({
  async loadContext(workspaceId) { if (workspaceId !== W) throw new Error('preview workspace mismatch'); return currentContext(); },
  async setLocationPolicy(workspaceId, policy) { if (workspaceId !== W) throw new Error('preview workspace mismatch'); locationPolicy = policy; return Object.freeze({ locationEvidence: policy }); },
  async upsertAssignment(input: UpsertFieldAssignmentInput) {
    if (input.workspaceId !== W || input.assignmentId !== null) throw new Error('preview create boundary');
    const id = crypto.randomUUID();
    const userName = currentContext().members.find((item) => item.userId === input.assignedUserId)?.displayName ?? 'موظف';
    assignments = Object.freeze([...assignments, Object.freeze({ id, transactionId: input.transactionId, transactionType: input.transactionId === TX1 ? 'تأسيس شركة' : 'تعديل عقد', transactionStatus: 'active', companyName: input.transactionId === TX1 ? 'شركة النخبة' : 'شركة الرافدين', assignedUserId: input.assignedUserId, assignedUserName: userName, scheduledFor: input.scheduledFor, destinationLabel: input.destinationLabel, department: input.department, priority: input.priority, status: 'queued' as const, version: 1, openBlockers: 0, nextRequiredAction: 'مراجعة المعاملة وتحديد الخطوة التالية' })]);
    return Object.freeze({ id, wasDuplicate: false });
  },
  async reassign(workspaceId, assignmentId, expectedVersion, assignedUserId, _reason, clientOperationId) {
    const current = assignments.find((item) => item.id === assignmentId); if (workspaceId !== W || !current || current.version !== expectedVersion) throw new Error('preview stale assignment');
    const userName = currentContext().members.find((item) => item.userId === assignedUserId)?.displayName ?? 'موظف';
    replaceAssignment(assignmentId, (item) => ({ ...item, assignedUserId, assignedUserName: userName, version: item.version + 1 }));
    return Object.freeze({ assignmentId, assignedUserId, clientOperationId, wasDuplicate: false });
  },
  async checkIn(workspaceId, assignmentId, expectedAssignmentVersion, _location, clientOperationId) {
    const current = assignments.find((item) => item.id === assignmentId); if (workspaceId !== W || !current || current.version !== expectedAssignmentVersion) throw new Error('preview stale assignment');
    replaceAssignment(assignmentId, (item) => ({ ...item, status: 'in_progress', version: item.version + 1 }));
    const visit = Object.freeze({ id: clientOperationId, assignmentId, transactionId: current.transactionId, assignedUserId: current.assignedUserId, status: 'checked_in' as const, version: 1, checkInAt: NOW, checkOutAt: null, counterDepartment: null, officialReference: null, officialFeePaid: null, failureReason: null, outcomeNote: null, checkInLocationRecorded: false, checkOutLocationRecorded: false, evidenceCount: 0 });
    visits = Object.freeze([visit, ...visits]);
    return Object.freeze({ visitId: clientOperationId, visitVersion: 1, assignmentId, assignmentVersion: current.version + 1, wasDuplicate: false });
  },
  async checkOut(input: FinishFieldVisitInput) {
    const current = visits.find((item) => item.id === input.visitId); if (input.workspaceId !== W || !current || current.version !== input.expectedVisitVersion) throw new Error('preview stale visit');
    replaceVisit(input.visitId, (item) => ({ ...item, status: input.outcome, version: item.version + 1, checkOutAt: NOW, counterDepartment: input.counterDepartment, officialReference: input.officialReference, officialFeePaid: input.officialFeePaid, failureReason: input.failureReason, outcomeNote: input.outcomeNote }));
    replaceAssignment(current.assignmentId, (item) => ({ ...item, status: 'visit_complete', version: item.version + 1 }));
    return Object.freeze({ visitId: input.visitId, officialFeeEvidenceOnly: input.officialFeePaid !== null, wasDuplicate: false });
  },
  async addEvidence(workspaceId, visitId, expectedVisitVersion, _evidenceType, _documentId, _note, _clientOperationId) {
    const current = visits.find((item) => item.id === visitId); if (workspaceId !== W || !current || current.version !== expectedVisitVersion) throw new Error('preview stale visit');
    replaceVisit(visitId, (item) => ({ ...item, version: item.version + 1, evidenceCount: item.evidenceCount + 1 }));
    return Object.freeze({ visitId, visitVersion: current.version + 1, wasDuplicate: false });
  },
  async handoff(workspaceId, assignmentId, expectedVersion, _note, _clientOperationId) {
    const current = assignments.find((item) => item.id === assignmentId); if (workspaceId !== W || !current || current.version !== expectedVersion) throw new Error('preview stale handoff');
    replaceAssignment(assignmentId, (item) => ({ ...item, status: 'handoff_complete', version: item.version + 1 }));
    return Object.freeze({ assignmentId, status: 'handoff_complete', wasDuplicate: false });
  },
});

const txRows = [
  { id: TX1, company_id: COMPANY1, type: 'تأسيس شركة', status: 'active', deleted_at: null, archived_at: null },
  { id: TX2, company_id: COMPANY2, type: 'تعديل عقد', status: 'stalled', deleted_at: null, archived_at: null },
];
const companyRows = [
  { id: COMPANY1, legal_name: 'شركة النخبة', display_name: 'شركة النخبة' },
  { id: COMPANY2, legal_name: 'شركة الرافدين', display_name: 'شركة الرافدين' },
];
const page = (items: readonly unknown[]) => Object.freeze({ items, offset: 0, limit: 100, total: items.length, hasMore: false });
const dataFactory = Object.freeze({
  async resolveWorkspaceId(userId: string) { return userId === U ? W : null; },
  forWorkspace(workspaceId: string) {
    if (workspaceId !== W) throw new Error('preview workspace mismatch');
    return { transactions: { list: async () => page(txRows) }, companies: { list: async () => page(companyRows) } };
  },
}) as unknown as EnjazDataLayerFactory;

function PreviewApp() {
  return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="operations" dir="rtl"><main id="r2-main" className="r2-main"><DataLayerProvider factory={dataFactory}><FieldOperationsCommandProvider gateway={gateway}><CurrentUserIdProvider userId={U}><LiveFieldOperationsExperience /></CurrentUserIdProvider></FieldOperationsCommandProvider></DataLayerProvider></main></div>;
}

const root = document.getElementById('phase83-field-root');
if (!root) throw new Error('Phase 8.3 preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);
