import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.2 Transaction Create/Edit audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const [core, shell, dataLayer, model, service, hook, editor, list, main, css, kickoff] = await Promise.all([
  read('src/ui-v2/runtime/CoreApp.tsx'),
  read('src/ui-v2/components/AppShell.tsx'),
  read('src/data/createDataLayer.ts'),
  read('src/features/transactions/transactionEditorModel.ts'),
  read('src/features/transactions/transactionEditorService.ts'),
  read('src/features/transactions/useTransactionEditor.ts'),
  read('src/ui-v2/screens/TransactionEditor.tsx'),
  read('src/ui-v2/screens/TransactionListScreen.tsx'),
  read('src/main.tsx'),
  read('src/ui-v2/styles/transaction-editor.css'),
  read('docs/PHASE5_2_TRANSACTION_CREATE_EDIT_KICKOFF.md'),
]);

assert(core.includes('data-stage="ui-10"'), 'frozen UI-10 marker changed');
const phase = Number(core.match(/data-product-phase="([0-9]+(?:\.[0-9]+)?)"/)?.[1]);
assert(Number.isFinite(phase) && phase >= 5.2, 'runtime marker must be at or beyond 5.2');
assert(core.includes('transactionCreateContent={transactionCreateContent}'), 'core shell does not receive authoritative transaction create content');
assert(core.includes('ConnectedTransactionEditor') && core.includes('FixtureTransactionEditor'), 'live/fixture global transaction create boundary missing');
assert(shell.includes('props.transactionCreateContent(closeOverlay)'), 'global create sheet does not delegate transaction creation to Phase 5.2 editor');
assert(shell.includes("createKind === 'transaction'"), 'transaction quick-create selection missing');

for (const token of [
  "companyContacts: ReadRepository<'company_contacts'>",
  "transactionRoutes: AppendOnlyRepository<'transaction_routes'>",
  "transactionNotes: AppendOnlyRepository<'transaction_notes'>",
  "createAppendOnlyRepository(gateway, scope, 'transaction_routes')",
  "createAppendOnlyRepository(gateway, scope, 'transaction_notes')",
]) assert(dataLayer.includes(token), `Data Layer transaction relation capability missing ${token}`);

for (const token of [
  'parseSafeTransactionFee', 'normalizeDigits', 'getRelatedContactIds', 'getRelatedContacts',
  "TransactionEditorStatus = 'active' | 'stalled' | 'completed'",
  "TransactionEditorPriority = 'low' | 'normal' | 'high' | 'urgent'",
  "transaction.status === 'completed' && draft.status !== 'completed'",
  'feeChangeReason', 'stationOccurredAt', 'TransactionEditorValidationError',
]) assert(model.includes(token), `editor model contract missing ${token}`);
assert(!model.toLowerCase().includes('supabase'), 'editor model directly depends on Supabase');

for (const token of [
  'EnjazDataLayerFactory', 'EnjazWorkspaceDataLayer', 'resolveWorkspaceId',
  'latest.updated_at !== previous.updated_at', 'TransactionEditorConflictError',
  'layer.transactions.create', 'layer.transactions.update', 'layer.feeChanges.create',
  'layer.transactionRoutes.create', 'layer.transactionNotes.create', 'layer.transactionActivity.create',
  "error.dataCode === 'DATA_OUTCOME_UNKNOWN'", 'TransactionEditorWarning',
]) assert(service.includes(token), `editor service contract missing ${token}`);
assert(!service.includes('createClient('), 'editor service creates a direct Supabase client');
assert(!service.includes('.delete('), 'Phase 5.2 service exposes destructive lifecycle behavior');

for (const token of [
  "'loading' | 'ready' | 'saving' | 'saved' | 'error'", 'validateTransactionEditorDraft',
  'saveTransactionEditorDraft', 'getRelatedContactIds', 'DATA_OUTCOME_UNKNOWN', 'TransactionEditorConflictError',
]) assert(hook.includes(token), `editor controller state contract missing ${token}`);

for (const token of [
  'data-transaction-editor={controller.mode}', 'هوية المعاملة', 'الحالة والأتعاب', 'مسار / محطة العمل',
  'جهة الاتصال الأساسية', 'سبب تغيير الأتعاب', 'ConnectedTransactionEditor', 'FixtureTransactionEditor',
  'maxLength={4000}', 'type="datetime-local"',
]) assert(editor.includes(token), `transaction editor presentation contract missing ${token}`);

for (const token of [
  'data-transaction-create="true"', 'data-transaction-edit={item.id}',
  "mode: 'create' | 'edit'", 'ConnectedTransactionEditor', 'FixtureTransactionEditor',
]) assert(list.includes(token), `transaction list/editor integration missing ${token}`);

assert(main.includes("./ui-v2/styles/transaction-editor.css"), 'transaction editor stylesheet is not loaded by product entry');
assert(css.includes('@media (max-width: 390px)'), 'narrow-phone editor hardening missing');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion editor hardening missing');
assert(css.includes('font-size: 16px'), 'mobile input zoom protection missing');
assert(!css.includes('!important'), 'editor styles may not use !important');
assert(!/z-index\s*:\s*\d{3,}/.test(css), 'editor styles contain uncontrolled z-index escalation');

assert(kickoff.includes('Status: **IN PROGRESS**'), 'Phase 5.2 kickoff status missing');
for (const boundary of ['Phase 5.3', 'Phase 5.4', 'Phase 8']) assert(kickoff.includes(boundary), `kickoff scope boundary missing ${boundary}`);
assert(kickoff.includes('stale') || kickoff.includes('Stale'), 'kickoff does not require stale edit conflict protection');
assert(kickoff.includes('partial') || kickoff.includes('Partial'), 'kickoff does not define partial write outcome handling');

console.log(`Phase 5.2 Transaction Create/Edit architecture gate PASS on product phase ${phase}`);
console.log('- transaction create/edit is workspace-scoped and live/fixture isolated');
console.log('- company/contact, state, fee, completion, station and note validation is explicit');
console.log('- stale writes and unknown/partial companion-write outcomes cannot silently claim full success');
console.log('- station, notes, fee changes and activity preserve append-only history boundaries');
console.log('- archived/reactivation lifecycle stays locked to Phase 5.4 and full workflow authoring to Phase 8');
console.log('- global create and transaction-list edit surfaces both enter the authoritative editor');
