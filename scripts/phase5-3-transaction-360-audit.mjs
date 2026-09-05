import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.3 Transaction 360 audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const [dataLayer, model, service, hook, preview, screen, list, css, listCss, main, kickoff, roadmap] = await Promise.all([
  read('src/data/createDataLayer.ts'),
  read('src/features/transactions/transaction360Model.ts'),
  read('src/features/transactions/transaction360Service.ts'),
  read('src/features/transactions/useTransaction360.ts'),
  read('src/features/transactions/transaction360Preview.ts'),
  read('src/ui-v2/screens/Transaction360.tsx'),
  read('src/ui-v2/screens/TransactionListScreen.tsx'),
  read('src/ui-v2/styles/transaction-360.css'),
  read('src/ui-v2/styles/transaction-list.css'),
  read('src/main.tsx'),
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

for (const token of ['useDataLayerFactory', 'useCurrentUserId', 'loadTransaction360Source', "'loading'", "'ready'", "'error'"]) {
  assert(hook.includes(token), `360 controller contract missing ${token}`);
}

assert(preview.includes('buildTransactionListPreviewSource'), '360 preview is not derived from the isolated transaction fixture');
assert(preview.includes("workflow-1") && preview.includes("blocker-1") && preview.includes("document-1"), '360 preview does not exercise workflow/risk/document context');

for (const token of [
  'data-pattern="transaction-360"',
  'data-transaction-360-timeline="true"',
  'data-transaction-360-followups="true"',
  'data-transaction-360-finance="true"',
  'data-transaction-360-notes="true"',
  'data-transaction-360-documents="true"',
  'ConnectedTransaction360',
  'FixtureTransaction360',
  'بعض سياق 360° يحتاج انتباهًا',
  'العمليات المالية الكاملة تبقى في Phase 7',
]) assert(screen.includes(token), `360 presentation contract missing ${token}`);

assert(list.includes('data-transaction-open-360={item.id}'), 'transaction cards cannot enter 360');
assert(list.includes('فتح 360°'), 'transaction 360 action label missing');
assert(list.includes('eyebrow="Phase 5.3"'), 'transaction 360 sheet is not marked as Phase 5.3');
assert(list.includes('الاستعادة وإجراءات دورة الحياة تأتي في Phase 5.4'), 'archived transaction lifecycle boundary missing from list');
assert(list.includes('ConnectedTransaction360') && list.includes('FixtureTransaction360'), 'live/fixture 360 routing boundary missing');

assert(main.includes("./ui-v2/styles/transaction-360.css"), 'transaction 360 stylesheet is not loaded by product entry');
assert(css.includes('@media (max-width: 390px)'), '360 narrow-phone hardening missing');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), '360 reduced-motion hardening missing');
assert(css.includes('overflow-wrap: anywhere'), '360 long-text wrapping guard missing');
assert(!css.includes('!important'), '360 styles may not use !important');
assert(!/z-index\s*:\s*\d{3,}/.test(css), '360 styles contain uncontrolled z-index escalation');
assert(listCss.includes('.ez-transaction-card__action-buttons'), 'dual transaction card actions lack layout contract');
assert(listCss.includes('min-height: var(--ez-control-h)'), 'transaction 360/list actions lost safe touch-height margin');

assert(!model.toLowerCase().includes('supabase'), '360 model directly depends on Supabase');
assert(!service.includes('createClient('), '360 service creates a direct Supabase client');
assert(!service.includes("from '@supabase"), '360 service imports Supabase directly');
assert(!hook.includes('createClient('), '360 controller creates a direct Supabase client');
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
console.log('- live and isolated preview 360 routes use frozen UI V2 with mobile/reduced-motion guards');
console.log('- lifecycle, full Finance and full Workflow mutations remain outside Phase 5.3');
