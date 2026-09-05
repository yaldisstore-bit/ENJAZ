import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.3 Transaction 360 audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const [dataLayer, model, service, kickoff, roadmap] = await Promise.all([
  read('src/data/createDataLayer.ts'),
  read('src/features/transactions/transaction360Model.ts'),
  read('src/features/transactions/transaction360Service.ts'),
  read('docs/PHASE5_3_TRANSACTION_DETAILS_360_KICKOFF.md'),
  read('docs/ENJAZ_MASTER_ROADMAP.md'),
]);

for (const token of ['transactionRoutes', 'transactionNotes', 'transactionActivity', 'followups', 'payments', 'feeChanges', 'documents', 'workflowInstances', 'blockers']) {
  assert(dataLayer.includes(token), `typed Data Layer lost ${token}`);
}

for (const token of [
  'TRANSACTION_360_SECTION_LIMIT = 100',
  'TRANSACTION_360_TIMELINE_LIMIT = 200',
  'Transaction360SectionState',
  'companyMissing',
  'feePrecisionSafe',
  'timelineTruncated',
  'followupSummary',
  'financialSummary',
  'sectionStates',
  'Deleted transaction cannot be represented by Phase 5.3',
]) assert(model.includes(token), `360 model contract missing ${token}`);

for (const token of [
  'EnjazDataLayerFactory',
  'resolveWorkspaceId',
  'layer.transactions.getById',
  'layer.companies.getById',
  "column: 'transaction_id'",
  "state: 'unavailable'",
  'Transaction360CoreLoadError',
  'Transaction360DeletedError',
]) assert(service.includes(token), `360 service contract missing ${token}`);

assert(!model.toLowerCase().includes('supabase'), '360 model directly depends on Supabase');
assert(!service.includes('createClient('), '360 service creates a direct Supabase client');
assert(!service.includes("from '@supabase"), '360 service imports Supabase directly');
assert(kickoff.includes('Status: **IN PROGRESS**'), 'Phase 5.3 kickoff is not in progress');
assert(kickoff.includes('Archive, restore, reactivation and lifecycle mutation remain strictly Phase 5.4'), 'Phase 5.4 lifecycle boundary missing');
assert(kickoff.includes('Full Finance operations remain Phase 7'), 'Finance boundary missing');
assert(kickoff.includes('Full workflow management remains Phase 8'), 'Workflow boundary missing');
assert(roadmap.includes('## 5.3 — Transaction Details / 360°'), 'roadmap lost Phase 5.3');
assert(roadmap.includes('## 5.4 — Archive/Restore/Lifecycle'), 'roadmap lost Phase 5.4 boundary');

console.log('Phase 5.3 Transaction Details / 360° architecture gate PASS');
console.log('- authoritative workspace-scoped Data Layer composition is locked');
console.log('- core relation failures fail closed while optional context is explicitly unavailable/truncated');
console.log('- timeline and section bounds prevent unbounded 360 rendering');
console.log('- lifecycle, full Finance and full Workflow mutations remain outside Phase 5.3');
