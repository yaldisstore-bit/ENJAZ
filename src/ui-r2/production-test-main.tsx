import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AuthGateway, EnjazAuthSession, EnjazAuthUser } from '../core/auth/authGateway.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../data/createDataLayer.ts';
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
  interface Window {
    __ENJAZ_R2_PRODUCTION_TEST__?: typeof testState;
  }
}
window.__ENJAZ_R2_PRODUCTION_TEST__ = testState;

let authCallback: Parameters<AuthGateway['onAuthStateChange']>[0] | null = null;
let currentUser: EnjazAuthUser | null = initiallyAuthenticated ? testUser : null;

const authGateway: AuthGateway = Object.freeze({
  async getUser() {
    return { data: { user: currentUser }, error: null };
  },
  async signInWithPassword() {
    currentUser = testUser;
    authCallback?.('SIGNED_IN', testSession);
    return { data: { user: testUser, session: testSession }, error: null };
  },
  async signUp() {
    return { data: { user: testUser, session: null }, error: null };
  },
  async requestPasswordReset(email: string, redirectTo: string) {
    testState.passwordResetRequests += 1;
    testState.lastResetEmail = email;
    testState.lastResetRedirect = redirectTo;
    return null;
  },
  async updatePassword() {
    testState.passwordUpdates += 1;
    return null;
  },
  async signOut() {
    testState.signOuts += 1;
    currentUser = null;
    authCallback?.('SIGNED_OUT', null);
    return null;
  },
  async bootstrapWorkspace() {
    return { data: '00000000-0000-4000-8000-000000000001', error: null };
  },
  onAuthStateChange(callback: Parameters<AuthGateway['onAuthStateChange']>[0]) {
    authCallback = callback;
    return { unsubscribe() { if (authCallback === callback) authCallback = null; } };
  },
});

const emptyPage = Object.freeze({ items: Object.freeze([]), hasMore: false });
const readRepository = Object.freeze({
  async list() { return emptyPage; },
  async getById() { return null; },
});
const mutableRepository = Object.freeze({
  ...readRepository,
  async insert() { throw new Error('R2 production test does not allow writes'); },
  async update() { throw new Error('R2 production test does not allow writes'); },
  async softDelete() { throw new Error('R2 production test does not allow writes'); },
});
const appendOnlyRepository = Object.freeze({
  ...readRepository,
  async append() { throw new Error('R2 production test does not allow writes'); },
});

const emptyLayer = Object.freeze({
  scope: Object.freeze({ workspaceId: '00000000-0000-4000-8000-000000000001' }),
  contacts: mutableRepository,
  companies: mutableRepository,
  companyContacts: readRepository,
  transactions: mutableRepository,
  followups: mutableRepository,
  blockers: mutableRepository,
  documents: mutableRepository,
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

const rootElement = document.getElementById('r2-production-test-root');
if (!rootElement) throw new Error('R2 production test root is missing');

createRoot(rootElement).render(
  <StrictMode>
    <UiR2ProductionRoot resources={{ authGateway, dataFactory }} />
  </StrictMode>,
);
