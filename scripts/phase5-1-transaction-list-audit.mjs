import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.1 Transaction List & Search audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const [core, domains, model, service, hook, preview, screen, css, main, roadmap, kickoff] = await Promise.all([
  read('src/ui-v2/runtime/CoreApp.tsx'), read('src/ui-v2/screens/DomainScreens.tsx'),
  read('src/features/transactions/transactionListModel.ts'), read('src/features/transactions/transactionListService.ts'),
  read('src/features/transactions/useTransactionList.ts'), read('src/features/transactions/transactionListPreview.ts'),
  read('src/ui-v2/screens/TransactionListScreen.tsx'), read('src/ui-v2/styles/transaction-list.css'),
  read('src/main.tsx'), read('docs/ENJAZ_MASTER_ROADMAP.md'), read('docs/PHASE5_1_TRANSACTION_LIST_SEARCH_KICKOFF.md'),
]);

assert(core.includes('data-stage="ui-10"'), 'frozen UI-10 marker changed');
assert(domains.includes("props.domain === 'transactions'"), 'transaction domain route missing');
assert(domains.includes('ConnectedTransactionListScreen') && domains.includes('FixtureTransactionListScreen'), 'transaction live/fixture route boundary missing');
assert(!domains.includes('function TransactionsScreen()'), 'old static transaction showcase survived Phase 5.1');

for (const token of [
  "TransactionListView = 'current' | 'stalled' | 'archived'", 'normalizeTransactionSearch', 'classifyTransactionView',
  'TRANSACTION_LIST_MAX_PAGE_SIZE = 50', 'TRANSACTION_SEARCH_MAX_LENGTH = 120',
  "TRANSACTION_SAVED_VIEW_SCHEMA = 'enjaz.transactions.list.v1'", 'createTransactionSavedViewDefinition',
  'parseTransactionSavedViewDefinition', 'feePrecisionSafe',
]) assert(model.includes(token), `model contract missing ${token}`);
assert(!model.toLowerCase().includes('supabase'), 'transaction model directly depends on Supabase');
assert(model.includes("row.deleted_at !== null"), 'deleted transaction exclusion missing');
assert(model.includes('CLOSED_STATUSES.has(status)'), 'closed/completed archive classification missing');
assert(model.includes('STALLED_STATUSES.has(status)'), 'stalled/delayed classification missing');
const savedViewFactory = model.slice(model.indexOf('export function createTransactionSavedViewDefinition'), model.indexOf('export function parseTransactionSavedViewDefinition'));
assert(savedViewFactory.length > 0 && !/\bpage\s*:/.test(savedViewFactory), 'saved-view definition persisted ephemeral page navigation');

assert(service.includes('EnjazDataLayerFactory') && service.includes('EnjazWorkspaceDataLayer'), 'service bypasses typed Data Layer');
assert(service.includes('TRANSACTION_SOURCE_LIMIT = 5_000'), 'safe source ceiling missing');
assert(service.includes("{ column: 'deleted_at', operator: 'is', value: null }"), 'service does not exclude deleted rows at source');
assert(service.includes('TransactionListCapacityError'), 'capacity fail-closed error missing');
assert(!service.includes('createClient('), 'service creates a direct Supabase client');

for (const token of ["'loading'", "'ready'", "'error'", 'DATA_FORBIDDEN', 'DATA_UNAVAILABLE', 'TransactionListCapacityError']) {
  assert(hook.includes(token), `controller state/error contract missing ${token}`);
}

assert(preview.includes('Array.from({ length: 22 }'), 'preview does not exercise multi-page transaction data');
assert(preview.includes('MISSING_COMPANY'), 'preview malformed relation scenario missing');
assert(preview.includes('LONG_TYPE'), 'preview long mixed-content scenario missing');

for (const token of [
  'data-domain-screen="transactions"', 'data-pattern="transaction-list-search"', 'data-transaction-status={props.status}',
  'data-transaction-results="true"', 'data-transaction-empty="true"', 'data-saved-view-anchor="transactions"',
  'data-saved-view-schema={TRANSACTION_SAVED_VIEW_SCHEMA}', 'maxLength={TRANSACTION_SEARCH_MAX_LENGTH}',
  'بحث المعاملات', 'ترتيب المعاملات', 'صفحات المعاملات', 'ConnectedTransactionListScreen', 'FixtureTransactionListScreen',
]) assert(screen.includes(token), `transaction presentation contract missing ${token}`);

assert(main.includes("./ui-v2/styles/transaction-list.css"), 'transaction stylesheet is not loaded by product entry');
assert(css.includes('overflow-wrap: anywhere'), 'long transaction text wrapping guard missing');
assert(css.includes('@media (max-width: 390px)'), 'narrow-phone transaction hardening missing');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion transaction hardening missing');
assert(
  css.includes('.ez-transaction-card__actions .ez-button { width: 100%; min-height: var(--ez-control-h); }'),
  'narrow transaction edit action lost the 46px control-height margin required to survive Chromium subpixel rounding',
);
assert(!css.includes('!important'), 'transaction styles may not use !important');
assert(!/z-index\s*:\s*\d{3,}/.test(css), 'transaction styles contain uncontrolled z-index escalation');

assert(roadmap.includes('## 5.1 — Transaction List & Search'), 'roadmap lost Phase 5.1');
assert(kickoff.includes('Status: **IN PROGRESS'), 'Phase 5.1 kickoff contract missing in-progress state');
assert(kickoff.includes('Creation/editing remains Phase 5.2'), 'Phase 5.1 scope leaked into Phase 5.2');

let closure = null;
try { closure = await read('docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md'); } catch { /* stage remains open */ }
if (closure) {
  const phase = Number(core.match(/data-product-phase="([0-9]+(?:\.[0-9]+)?)"/)?.[1]);
  assert(Number.isFinite(phase) && phase >= 5.1, 'closed Phase 5.1 runtime marker is below 5.1');
  assert(roadmap.includes('## 5.1 — Transaction List & Search ✅'), 'closed roadmap marker missing');
  assert(closure.includes('Phase 5.1 — Transaction List & Search ✅'), 'closure document does not certify Phase 5.1');
}

console.log('Phase 5.1 Transaction List & Search architecture gate PASS');
console.log('- canonical transaction domain uses live Data Layer and isolated preview paths');
console.log('- current/stalled/archived classification, Arabic search, sorting and bounded pagination are locked');
console.log('- deleted rows, missing relations, unsafe money and source-capacity failures are fail-safe');
console.log('- stable saved-view v1 definition excludes ephemeral page navigation');
console.log('- narrow edit actions retain a 46px tokenized margin against Chromium subpixel rounding');
console.log('- mobile, long-text, reduced-motion and frozen UI V2 boundaries remain protected');
