import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const fail = (message) => { throw new Error(`Phase 9.2 Search/Saved Views audit: ${message}`); };
const must = (text, marker, label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };
const forbid = (text, marker, label) => { if (text.includes(marker)) fail(`${label} contains forbidden ${marker}`); };

for (const path of [
  'docs/PHASE9_1_STATE.json',
  'docs/PHASE9_2_STATE.json',
  'docs/PHASE9_2_KICKOFF.md',
  'src/features/searchIntelligence/searchSavedViewContract.ts',
  'src/features/transactions/transactionListModel.ts',
  'tests/phase9-2-search-saved-views-foundation.test.ts',
]) if (!exists(path)) fail(`required file missing: ${path}`);

const predecessor = JSON.parse(read('docs/PHASE9_1_STATE.json'));
const state = JSON.parse(read('docs/PHASE9_2_STATE.json'));
const kickoff = read('docs/PHASE9_2_KICKOFF.md');
const contract = read('src/features/searchIntelligence/searchSavedViewContract.ts');
const transactionModel = read('src/features/transactions/transactionListModel.ts');
const tests = read('tests/phase9-2-search-saved-views-foundation.test.ts');

if (predecessor.phase !== '9.1' || predecessor.status !== 'CLOSED' || predecessor.exitGatePassed !== true || predecessor.phase9_2Allowed !== true || predecessor.nextPhase !== '9.2' || predecessor.successorStatus !== 'AUTHORIZED') {
  fail('Phase 9.1 must remain CLOSED and authorize only Phase 9.2');
}

if (state.phase !== '9.2' || state.name !== 'Smart Saved Views & Cross-domain Search Intelligence') fail('identity drift');
if (!['IN_PROGRESS', 'CLOSED'].includes(state.status)) fail('unsupported lifecycle status');
if (state.baseCommit !== '158b3c383509d99edab0bddb3fe676b17b4e7051') fail('base commit drift');
if (state.implementationBranch !== 'phase9-2-smart-saved-views-search-intelligence') fail('implementation branch drift');
if (state.predecessor?.phase !== '9.1' || state.predecessor?.requiredStatus !== 'CLOSED' || state.predecessor?.requiredAuthorization !== 'phase9_2Allowed=true') fail('predecessor contract drift');
if (state.javascriptBudgetBytes !== 670000 || state.budgetIncreaseAllowed !== false) fail('JavaScript budget drift');
if (state.realCloudRequired !== true || state.realBrowserRequired !== true || state.publishedLiveVerificationRequired !== true) fail('required verification weakened');

const authority = state.authority ?? {};
for (const [key, expected] of Object.entries({
  savedViewsPersistence: 'DATABASE_RLS_REQUIRED',
  globalSearchAuthority: 'PERMISSION_SCOPED_AUTHORITATIVE_READS_ONLY',
  sourceBusinessEntityWriteAuthority: 'none',
})) if (authority[key] !== expected) fail(`authority.${key} drift`);
for (const key of ['shadowEntityStoreAllowed', 'savedResultRowsAllowed', 'unauthorizedSearchFallbackAllowed', 'crossWorkspaceSearchAllowed', 'externalDeepLinksAllowed']) {
  if (authority[key] !== false) fail(`authority.${key} must remain false`);
}

const domains = ['transactions', 'companies', 'people', 'procedures', 'documents'];
if (JSON.stringify(state.domains) !== JSON.stringify(domains)) fail('domain set/order drift');
if (state.savedViews?.schema !== 'enjaz.saved-view.v1' || state.savedViews?.defaultVisibility !== 'personal' || state.savedViews?.sharedVisibilityRequiresExplicitPermission !== true || state.savedViews?.definitionOnlyPersistence !== true || state.savedViews?.reuseTransactionSchema !== 'enjaz.transactions.list.v1' || state.savedViews?.ephemeralPageNavigationPersisted !== false) fail('saved-view contract drift');
if (JSON.stringify(state.savedViews?.sharedVisibilities) !== JSON.stringify(['team', 'workspace'])) fail('shared visibility drift');
if (state.globalSearch?.resultSchema !== 'enjaz.global-search-result.v1' || state.globalSearch?.permissionAwareGroupingRequired !== true || state.globalSearch?.exactInternalDeepLinkRequired !== true || state.globalSearch?.missingDomainAuthorityBehavior !== 'OMIT_DOMAIN_FAIL_CLOSED' || state.globalSearch?.unauthorizedEntityBehavior !== 'NO_RESULT_NO_METADATA_LEAK') fail('global-search contract drift');

if (state.status === 'IN_PROGRESS') {
  if (state.exitGatePassed !== false || state.phase9_3Allowed !== false || state.nextPhase !== '9.3' || state.successorStatus !== 'LOCKED') fail('Phase 9.3 must remain locked while Phase 9.2 is in progress');
} else {
  if (state.exitGatePassed !== true || state.phase9_3Allowed !== true || state.nextPhase !== '9.3' || state.successorStatus !== 'AUTHORIZED') fail('closed Phase 9.2 must authorize only Phase 9.3');
  if (state.realCloudVerification !== 'PASS_ZERO_RESIDUE' || state.realBrowserVerification !== 'PASS' || state.pullRequestGate !== 'PASS' || state.postMergeRecertification !== 'COMPLETE') fail('Phase 9.2 cannot close without complete cloud/browser/PR/post-merge evidence');
}

for (const marker of [
  '**Status: IN PROGRESS**',
  'Phase 9.3 remains LOCKED',
  'database-backed + RLS required',
  'permission-scoped authoritative reads only',
  'enjaz.transactions.list.v1',
  'NO',
  'Real Cloud',
  'Real Chromium',
  '670000 bytes',
]) must(kickoff, marker, 'kickoff');

for (const marker of [
  "ENJAZ_SAVED_VIEW_SCHEMA = 'enjaz.saved-view.v1'",
  "ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA = 'enjaz.global-search-result.v1'",
  "SavedViewDomain = 'transactions' | 'companies' | 'people' | 'procedures' | 'documents'",
  "SavedViewVisibility = 'personal' | 'team' | 'workspace'",
  'createEnjazSavedViewDefinition',
  'parseEnjazSavedViewDefinition',
  'createSavedViewDraft',
  'fromTransactionSavedView',
  'toTransactionSavedView',
  'parseGlobalSearchResultReference',
  'TRANSACTION_SAVED_VIEW_SCHEMA',
  "destination.startsWith('/app/')",
]) must(contract, marker, 'foundation contract');

for (const forbidden of [
  'localStorage', 'sessionStorage', '.insert(', '.update(', '.delete(', '.upsert(', '.rpc(', 'fetch(',
  'export function createTransaction(', 'export function updateTransaction(', 'export function deleteTransaction(', 'export function postPayment(',
]) forbid(contract, forbidden, 'foundation contract');

for (const marker of [
  "TRANSACTION_SAVED_VIEW_SCHEMA = 'enjaz.transactions.list.v1'",
  'createTransactionSavedViewDefinition',
  'parseTransactionSavedViewDefinition',
]) must(transactionModel, marker, 'canonical transaction saved-view model');

for (const marker of [
  'unknown saved-view schema and domain fail closed',
  'unsafe filter shapes, invalid ranges and unsafe page sizes fail closed',
  'transaction saved-view adapter reuses canonical transaction schema without semantic drift',
  'transaction adapter rejects incompatible source schema, view and sort instead of silently defaulting',
  'global search result is a canonical deep-link reference and rejects unauthorized shapes',
  'foundation exposes no mutation authority over source business entities',
]) must(tests, marker, 'foundation destruction tests');

console.log(`ENJAZ PHASE 9.2 SEARCH/SAVED VIEWS AUDIT PASS — status=${state.status}; persistence=RLS_REQUIRED; source writes=none; successor=${state.successorStatus === 'AUTHORIZED' ? '9.3 AUTHORIZED' : '9.3 LOCKED'}.`);
