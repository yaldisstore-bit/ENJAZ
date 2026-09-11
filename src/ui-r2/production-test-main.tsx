import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AuthGateway, EnjazAuthSession, EnjazAuthUser } from '../core/auth/authGateway.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../data/createDataLayer.ts';
import type { AutomationCommandGateway } from '../features/automation/automationCommands.ts';
import type { FieldOperationsCommandGateway } from '../features/field-operations/fieldOperationsCommands.ts';
import type { FinanceCommandGateway } from '../features/finance/financeCommands.ts';
import type { GovernanceCommandGateway } from '../features/governance/governanceCommands.ts';
import type { SearchIntelligenceGateway } from '../features/searchIntelligence/searchIntelligenceCommands.ts';
import type { GovernmentProcedureRuntimeGateway } from '../features/workflow/governmentProcedureRuntime.ts';
import { UiR2ProductionRoot } from './runtime/UiR2ProductionRoot.tsx';

const params = new URLSearchParams(window.location.search);
const initiallyAuthenticated = params.get('test') === 'authenticated';
const testUser: EnjazAuthUser = Object.freeze({ id: '00000000-0000-4000-8000-000000000010', email: 'tester@enjaz.local' });
const testSession: EnjazAuthSession = Object.freeze({ user: testUser });

const testState = {
  passwordResetRequests: 0,
  passwordUpdates: 0,
  signOuts: 0,
  lastResetEmail: '',
  lastResetRedirect: '',
};

declare global {
  interface Window { __ENJAZ_R2_PRODUCTION_TEST__?: typeof testState; }
}
window.__ENJAZ_R2_PRODUCTION_TEST__ = testState;

let authCallback: Parameters<AuthGateway['onAuthStateChange']>[0] | null = null;
let currentUser: EnjazAuthUser | null = initiallyAuthenticated ? testUser : null;

const authGateway: AuthGateway = Object.freeze({
  async getUser() { return { data: { user: currentUser }, error: null }; },
  async signInWithPassword() {
    currentUser = testUser;
    authCallback?.('SIGNED_IN', testSession);
    return { data: { user: testUser, session: testSession }, error: null };
  },
  async signUp() { return { data: { user: testUser, session: null }, error: null }; },
  async requestPasswordReset(email: string, redirectTo: string) {
    testState.passwordResetRequests += 1;
    testState.lastResetEmail = email;
    testState.lastResetRedirect = redirectTo;
    return null;
  },
  async updatePassword() { testState.passwordUpdates += 1; return null; },
  async signOut() {
    testState.signOuts += 1;
    currentUser = null;
    authCallback?.('SIGNED_OUT', null);
    return null;
  },
  async bootstrapWorkspace() { return { data: '00000000-0000-4000-8000-000000000001', error: null }; },
  onAuthStateChange(callback: Parameters<AuthGateway['onAuthStateChange']>[0]) {
    authCallback = callback;
    return { unsubscribe() { if (authCallback === callback) authCallback = null; } };
  },
});

const emptyPage = Object.freeze({ items: Object.freeze([]), hasMore: false });
const readRepository = Object.freeze({ async list() { return emptyPage; }, async getById() { return null; } });
const mutableRepository = Object.freeze({
  ...readRepository,
  async insert() { throw new Error('R2 production test does not allow writes'); },
  async update() { throw new Error('R2 production test does not allow writes'); },
  async softDelete() { throw new Error('R2 production test does not allow writes'); },
});
const appendOnlyRepository = Object.freeze({ ...readRepository, async append() { throw new Error('R2 production test does not allow writes'); } });

const emptyLayer = Object.freeze({
  scope: Object.freeze({ workspaceId: '00000000-0000-4000-8000-000000000001' }),
  contacts: mutableRepository,
  companies: mutableRepository,
  companyContacts: readRepository,
  transactions: mutableRepository,
  followups: mutableRepository,
  blockers: mutableRepository,
  documents: mutableRepository,
  cashboxes: mutableRepository,
  calendar: mutableRepository,
  renewals: mutableRepository,
  workflowItemStates: mutableRepository,
  transactionRoutes: appendOnlyRepository,
  transactionNotes: appendOnlyRepository,
  workflowInstances: readRepository,
  lifecycleEvents: appendOnlyRepository,
  transactionActivity: appendOnlyRepository,
  payments: appendOnlyRepository,
  paymentReversals: appendOnlyRepository,
  feeChanges: appendOnlyRepository,
  ledger: appendOnlyRepository,
  automationRuns: readRepository,
  intelligenceSnapshots: readRepository,
  notificationDeliveries: readRepository,
  auditEvents: readRepository,
  importJobs: readRepository,
}) as unknown as EnjazWorkspaceDataLayer;

const dataFactory: EnjazDataLayerFactory = Object.freeze({
  async resolveWorkspaceId() { return '00000000-0000-4000-8000-000000000001'; },
  forWorkspace() { return emptyLayer; },
});

const financeCommands: FinanceCommandGateway = Object.freeze({
  async loadContext() {
    return Object.freeze({
      cashboxes: Object.freeze([]),
      engagements: Object.freeze([]),
      recentReceipts: Object.freeze([]),
      reconciliation: Object.freeze({ postedTotalCents: 0n, reversedTotalCents: 0n, statusWithoutReversal: 0, reversalWithoutStatus: 0, shadowLedgerEntries: 0, integrityWarnings: 0, moneyAuthority: 'payments_plus_non_payment_ledger' as const }),
    });
  },
  async postPayment() { throw new Error('R2 production test does not allow finance writes'); },
  async reversePayment() { throw new Error('R2 production test does not allow finance writes'); },
  async getReceipt() { throw new Error('No receipt in production bridge harness'); },
  async createCashbox() { throw new Error('R2 production test does not allow finance writes'); },
  async createEngagement() { throw new Error('R2 production test does not allow finance writes'); },
});

const governanceCommands: GovernanceCommandGateway = Object.freeze({
  async loadContext(_workspaceId: string, companyId: string, asOf?: string | null) {
    return Object.freeze({
      companyId,
      asOf: asOf ?? '2026-09-11',
      canMutate: false,
      versions: Object.freeze({ ownership: 0, beneficialOwners: 0, authority: 0, resolutions: 0, capital: 0 }),
      ownership: Object.freeze({ configured: false, totalPercentage: null, stakes: Object.freeze([]) }),
      beneficialOwners: Object.freeze([]),
      authorities: Object.freeze([]),
      resolutions: Object.freeze([]),
      capital: Object.freeze({ known: false, amount: null, source: 'company_current', effectiveOn: null, version: 0 }),
      timeline: Object.freeze([]),
      risks: Object.freeze([]),
    });
  },
  async replaceOwnership() { throw new Error('R2 production test does not allow governance writes'); },
  async replaceBeneficialOwners() { throw new Error('R2 production test does not allow governance writes'); },
  async grantAuthority() { throw new Error('R2 production test does not allow governance writes'); },
  async revokeAuthority() { throw new Error('R2 production test does not allow governance writes'); },
  async recordResolution() { throw new Error('R2 production test does not allow governance writes'); },
  async recordCapital() { throw new Error('R2 production test does not allow governance writes'); },
});

const workflowCommands: GovernmentProcedureRuntimeGateway = Object.freeze({
  async loadCatalog() {
    return Object.freeze({
      authority: 'workflow_plus_government_catalog' as const,
      moneyAuthority: 'reference_fees_only_no_finance_write' as const,
      entities: Object.freeze([]),
      branches: Object.freeze([]),
      procedures: Object.freeze([]),
    });
  },
  async loadTransactionContext(_workspaceId: string, transactionId: string) {
    return Object.freeze({
      authority: 'canonical_workflow_instance' as const,
      transactionId,
      instance: null,
    });
  },
  async startProcedure() { throw new Error('R2 production test does not allow workflow writes'); },
  async transition() { throw new Error('R2 production test does not allow workflow writes'); },
});

const automationCommands: AutomationCommandGateway = Object.freeze({
  async loadContext() {
    return Object.freeze({
      authority: 'automation_rules_and_runs' as const,
      workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval' as const,
      financeWriteAuthority: 'none' as const,
      rules: Object.freeze([]),
      recentRuns: Object.freeze([]),
      pendingApprovals: Object.freeze([]),
    });
  },
  async upsertRule() { throw new Error('R2 production test does not allow automation writes'); },
  async setRuleEnabled() { throw new Error('R2 production test does not allow automation writes'); },
  async dispatch() { throw new Error('R2 production test does not allow automation writes'); },
  async decideApproval() { throw new Error('R2 production test does not allow automation writes'); },
});

const fieldOperationsCommands: FieldOperationsCommandGateway = Object.freeze({
  async loadContext() {
    return Object.freeze({
      authority: 'field_assignments_visits_evidence_receipts' as const,
      transactionWriteAuthority: 'none' as const,
      workflowWriteAuthority: 'existing_workflow_rpc_only' as const,
      automationWriteAuthority: 'existing_automation_rpc_only' as const,
      financeWriteAuthority: 'none' as const,
      locationPolicy: 'disabled' as const,
      metrics: Object.freeze({ activeTransactions: 0, stalledTransactions: 0, highCriticalBlockers: 0, pendingAutomationApprovals: 0, queuedAssignments: 0, activeVisits: 0 }),
      members: Object.freeze([]),
      assignments: Object.freeze([]),
      visits: Object.freeze([]),
    });
  },
  async setLocationPolicy() { throw new Error('R2 production test does not allow field writes'); },
  async upsertAssignment() { throw new Error('R2 production test does not allow field writes'); },
  async reassign() { throw new Error('R2 production test does not allow field writes'); },
  async checkIn() { throw new Error('R2 production test does not allow field writes'); },
  async checkOut() { throw new Error('R2 production test does not allow field writes'); },
  async addEvidence() { throw new Error('R2 production test does not allow field writes'); },
  async handoff() { throw new Error('R2 production test does not allow field writes'); },
});

const searchIntelligence: SearchIntelligenceGateway = Object.freeze({
  async listSavedViews() { return Object.freeze([]); },
  async saveSavedView() { throw new Error('R2 production test does not allow saved-view writes'); },
  async deleteSavedView() { throw new Error('R2 production test does not allow saved-view writes'); },
  async globalSearch() { return Object.freeze([]); },
});

const rootElement = document.getElementById('r2-production-test-root');
if (!rootElement) throw new Error('R2 production test root is missing');

createRoot(rootElement).render(
  <StrictMode>
    <UiR2ProductionRoot resources={{ authGateway, dataFactory, financeCommands, governanceCommands, workflowCommands, automationCommands, fieldOperationsCommands, searchIntelligence }} />
  </StrictMode>,
);
