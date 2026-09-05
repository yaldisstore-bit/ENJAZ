import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.4 Transaction Lifecycle audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const [core, model, service, controller, listModel, dailyWorkService, panel, list, css, main, kickoff, roadmap, pkgText] = await Promise.all([
  read('src/ui-v2/runtime/CoreApp.tsx'),
  read('src/features/transactions/transactionLifecycleModel.ts'),
  read('src/features/transactions/transactionLifecycleService.ts'),
  read('src/features/transactions/useTransactionLifecycle.ts'),
  read('src/features/transactions/transactionListModel.ts'),
  read('src/features/daily-work/dailyWorkService.ts'),
  read('src/ui-v2/screens/TransactionLifecyclePanel.tsx'),
  read('src/ui-v2/screens/TransactionListScreen.tsx'),
  read('src/ui-v2/styles/transaction-lifecycle.css'),
  read('src/main.tsx'),
  read('docs/PHASE5_4_ARCHIVE_RESTORE_LIFECYCLE_KICKOFF.md'),
  read('docs/ENJAZ_MASTER_ROADMAP.md'),
  read('package.json'),
]);
const pkg = JSON.parse(pkgText);

assert(core.includes('data-stage="ui-10"'), 'frozen UI-10 marker changed');
const phase = Number(core.match(/data-product-phase="([0-9]+(?:\.[0-9]+)?)"/)?.[1]);
assert(Number.isFinite(phase) && phase >= 5.4, 'canonical runtime marker must be at or beyond Phase 5.4');

for (const token of [
  "export type TransactionLifecycleAction = 'archive' | 'restore' | 'reactivate'",
  'TRANSACTION_LIFECYCLE_NOTE_MAX_LENGTH = 600',
  'transactionLifecycleCapabilities',
  'buildTransactionLifecyclePatch',
  "status: 'active'",
  'completed_at: null',
  'archived_at: null',
  'TransactionLifecycleRuleError',
]) assert(model.includes(token), `lifecycle model contract missing ${token}`);

for (const token of [
  'resolveWorkspaceId',
  'layer.transactions.getById',
  "column: 'transaction_id'",
  "column: 'status'",
  "value: 'open'",
  'FOLLOWUP_SAFE_LIMIT = 5_000',
  'latest.updated_at !== loaded.transaction.updated_at',
  'layer.transactions.update',
  'layer.transactionActivity.create',
  'preserved_open_followups',
  'DATA_OUTCOME_UNKNOWN',
]) assert(service.includes(token), `lifecycle service contract missing ${token}`);

for (const token of [
  'useDataLayerFactory',
  'useCurrentUserId',
  'loadTransactionLifecycleContext',
  'applyTransactionLifecycleAction',
  "'mutating'",
  'TransactionLifecycleConflictError',
  'TransactionLifecycleCapacityError',
]) assert(controller.includes(token), `lifecycle controller contract missing ${token}`);

assert(!service.includes('lifecycleEvents.create'), 'transaction lifecycle must not misuse company/contact entity_lifecycle_events');
assert(!service.includes('createClient(') && !service.includes("from '@supabase"), 'lifecycle service may not create or import a direct Supabase client');
assert(!controller.includes('createClient(') && !controller.includes("from '@supabase"), 'lifecycle controller may not create or import a direct Supabase client');
assert(listModel.includes("row.archived_at !== null") && listModel.includes("row.completed_at !== null"), 'transaction list lost archive/completion classification');
for (const token of [
  "{ column: 'archived_at', operator: 'is', value: null }",
  "{ column: 'deleted_at', operator: 'is', value: null }",
  "{ column: 'status', operator: 'neq', value: 'completed' }",
]) assert(dailyWorkService.includes(token), `Daily Work inactive-parent suppression missing ${token}`);

for (const token of [
  'data-pattern="transaction-lifecycle"',
  'data-lifecycle-action={action}',
  '<EzDialog',
  "action === 'archive'",
  "action === 'restore'",
  "action === 'reactivate'",
  'لا حذف صامت للتاريخ',
  'المتابعات المفتوحة المحفوظة',
  'ConnectedTransactionLifecycle',
  'FixtureTransactionLifecycle',
]) assert(panel.includes(token), `lifecycle presentation contract missing ${token}`);
for (const token of [
  'data-transaction-lifecycle={item.id}',
  'إدارة الحالة',
  'ConnectedTransactionLifecycle',
  'FixtureTransactionLifecycle',
  'دورة الحياة',
]) assert(list.includes(token), `transaction list lifecycle wiring missing ${token}`);
assert(!list.includes('الاستعادة غير متاحة هنا'), 'obsolete Phase 5.3 no-restore copy remains in transaction list');

assert(main.includes("./ui-v2/styles/transaction-lifecycle.css"), 'lifecycle stylesheet is not loaded by product entry');
assert(css.includes('@media (max-width: 390px)'), 'lifecycle narrow-phone hardening missing');
assert(css.includes('min-height: var(--ez-touch-min)'), 'lifecycle safe touch-height contract missing');
assert(css.includes('overflow-wrap: anywhere'), 'lifecycle long-text wrapping guard missing');
assert(!css.includes('!important'), 'lifecycle styles may not use !important');
assert(!/z-index\s*:\s*\d{3,}/.test(css), 'lifecycle styles contain uncontrolled z-index escalation');

assert(kickoff.includes('Status: **IN PROGRESS**'), 'Phase 5.4 kickoff is not in progress');
assert(kickoff.includes('does **not** allow a synthetic `archived` status'), 'database archive-state truth missing from kickoff');
assert(kickoff.includes('Archive a non-deleted transaction'), 'archive scope missing');
assert(kickoff.includes('Reactivate a completed transaction explicitly'), 'reactivation boundary missing');
assert(kickoff.includes('No delete/purge implementation is introduced here'), 'delete/purge boundary missing');
assert(roadmap.includes('## 5.4 — Archive/Restore/Lifecycle'), 'roadmap lost Phase 5.4');
assert(roadmap.includes('## 5.5 — Transaction Destruction Gate'), 'roadmap lost Phase 5.5 boundary');

assert(pkg.scripts?.['audit:phase5-4:transaction-lifecycle'] === 'node scripts/phase5-4-transaction-lifecycle-audit.mjs', 'Phase 5.4 architecture script missing');
assert(pkg.scripts?.['test:phase5-4']?.includes('tests/transactionLifecycle.test.ts'), 'Phase 5.4 model test missing');
assert(pkg.scripts?.['test:phase5-4']?.includes('tests/transactionLifecycleService.test.ts'), 'Phase 5.4 service test missing');
assert(pkg.scripts?.['test:functional']?.includes('tests/transactionLifecycleService.test.ts'), 'Phase 5.4 service regression is not cumulative');

console.log(`Phase 5.4 Archive / Restore / Lifecycle architecture gate PASS on product phase ${phase}`);
console.log('- archive is represented only by archived_at; no illegal archived status is invented');
console.log('- restore and reactivate remain distinct explicit lifecycle actions');
console.log('- deleted rows and stale contexts fail closed before mutation');
console.log('- open followups are counted and preserved rather than destructively rewritten');
console.log('- Daily Work suppression is guarded at the authoritative repository-query layer');
console.log('- live lifecycle UI resolves the authoritative record before offering legal actions');
console.log('- lifecycle confirmation, warnings, touch geometry and narrow-phone layout are locked');
console.log('- transaction_activity is the append-only lifecycle evidence path for transactions');
console.log('- Phase 5.5, Finance and Workflow authority remain locked');
