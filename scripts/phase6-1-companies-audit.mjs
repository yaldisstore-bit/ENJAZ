import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const errors = [];
const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };

const paths = {
  state: 'docs/PHASE6_1_COMPANIES_STATE.json',
  kickoff: 'docs/PHASE6_1_COMPANIES_KICKOFF.md',
  prior: 'docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json',
  closure: 'docs/PHASE6_1_COMPANIES_CLOSURE.md',
  postMerge: 'docs/PHASE6_1_POSTMERGE_RECERTIFICATION.md',
  phase62State: 'docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json',
  model: 'src/features/companies/companyModel.ts',
  service: 'src/features/companies/companyService.ts',
  hooks: 'src/features/companies/useCompanies.ts',
  connected: 'src/ui-r2/records/ConnectedCompanies.tsx',
  portal: 'src/ui-r2/records/LiveCompaniesProductionPortal.tsx',
  lazyPortals: 'src/ui-r2/runtime/LazyLiveProductionPortals.tsx',
  records: 'src/ui-r2/records/RecordsRelationshipsExperience.tsx',
  production: 'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
  liveRoot: 'src/ui-r2/runtime/UiR2LiveRoot.tsx',
  data: 'src/data/createDataLayer.ts',
  context: 'src/data/react/DataLayerContext.tsx',
  modelTest: 'tests/companyModel.test.ts',
  serviceTest: 'tests/companyService.test.ts',
  detailTest: 'tests/companyDetailService.test.ts',
};
for (const [label, file] of Object.entries(paths)) {
  if (label === 'postMerge' || label === 'phase62State') continue;
  if (!exists(file)) errors.push(`missing Phase 6.1 ${label}: ${file}`);
}
if (errors.length) { console.error('ENJAZ PHASE 6.1 COMPANIES AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const prior = json(paths.prior);
const phase62 = exists(paths.phase62State) ? json(paths.phase62State) : null;
const kickoff = read(paths.kickoff);
const model = read(paths.model);
const service = read(paths.service);
const hooks = read(paths.hooks);
const connected = read(paths.connected);
const portal = read(paths.portal);
const lazyPortals = read(paths.lazyPortals);
const records = read(paths.records);
const production = read(paths.production);
const liveRoot = read(paths.liveRoot);
const data = read(paths.data);
const context = read(paths.context);

if (state.phase !== '6.1' || state.name !== 'Companies') errors.push('Phase 6.1 state identity drifted');
if (!['ACTIVE', 'CLOSED'].includes(state.status)) errors.push('Phase 6.1 state must be ACTIVE or CLOSED');
if (state.baseCommit !== '3381dfdb3d85f36836052e6611d5d14e12cfb7f7') errors.push('Phase 6.1 must remain anchored to the certified Phase 5 post-recertification main');
if (state.priorPhase !== '5.5' || state.priorPhaseRecertified !== true) errors.push('Phase 6.1 requires the closed/re-certified Phase 5.5 transition');
if (state.safeCompanySourceLimit !== 5000) errors.push('Phase 6.1 company source ceiling must remain 5000');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.phase6Allowed !== true || prior.nextPhase !== '6.1' || prior.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 5.5 canonical state no longer authorizes Phase 6.1');

const expectedScope = ['companyList','companySearch','companyFilters','companyCreate','companyEdit','companyDetails','relatedTransactions','relatedDocuments','financeContext','contactContext','companyActivity','companyRisk'];
if (JSON.stringify(state.scope) !== JSON.stringify(expectedScope)) errors.push('Phase 6.1 scope drifted');
if (state.boundaries?.peopleRelationshipManagement !== '6.2' || state.boundaries?.companyLawyer360 !== '6.3' || state.boundaries?.fullFinance !== '7' || state.boundaries?.documentOperations !== '10') errors.push('Phase 6.1 later-phase boundaries drifted');

if (state.status === 'ACTIVE') {
  if (state.exitGatePassed !== false || state.phase6_2Allowed !== false) errors.push('ACTIVE Phase 6.1 must fail closed and keep Phase 6.2 locked');
  requireMarker(kickoff, 'Status: **ACTIVE / NOT CLOSED**', 'kickoff');
}

if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) errors.push('CLOSED Phase 6.1 requires exitGatePassed and zero unresolved defects');
  if (!state.closureEvidence || !exists(state.closureEvidence)) errors.push('CLOSED Phase 6.1 requires closure evidence');
  if (state.implementationHead !== '9397131afab3688749d57bcaa721e6eb858aef30') errors.push('Phase 6.1 closure must preserve the certified 20/20 implementation head');
  if (state.preClosure?.workflowCount !== 20 || state.preClosure?.successCount !== 20 || state.preClosure?.failureCount !== 0) errors.push('Phase 6.1 closure requires 20/20 pre-closure workflows with zero failures');
  const recert = state.postMergeRecertification;
  if (recert?.required !== true || !['PENDING', 'COMPLETE'].includes(recert?.status)) errors.push('CLOSED Phase 6.1 requires an explicit post-merge recertification state');
  const closure = read(paths.closure);
  if (recert?.status === 'PENDING') {
    if (state.phase6_2Allowed !== false) errors.push('Phase 6.2 must remain locked while Phase 6.1 post-merge recertification is pending');
    for (const marker of ['Status: **CLOSED — post-merge recertification pending**','9397131afab3688749d57bcaa721e6eb858aef30','20/20 pull-request workflows SUCCESS','unresolvedDefectCount=0']) requireMarker(closure, marker, 'Phase 6.1 closure evidence');
  }
  if (recert?.status === 'COMPLETE') {
    if (state.phase6_2Allowed !== true || state.nextPhase !== '6.2') errors.push('Phase 6.2 may be allowed only after Phase 6.1 post-merge recertification completes');
    if (recert.mainCommit !== '6d70069995164500b3c05b027145bcdfed96e877') errors.push('completed Phase 6.1 recertification must preserve the certified canonical main commit');
    if (recert.workflowCount !== 8 || recert.successCount !== 8 || recert.failureCount !== 0) errors.push('completed Phase 6.1 recertification requires 8/8 workflows SUCCESS with zero failures');
    if (!state.postMergeEvidence || state.postMergeEvidence !== paths.postMerge || !exists(paths.postMerge)) errors.push('completed Phase 6.1 recertification requires a canonical evidence file');
    for (const marker of ['Status: **CLOSED — canonical post-merge recertification COMPLETE**','6d70069995164500b3c05b027145bcdfed96e877','8/8 post-merge workflows SUCCESS','phase6_2Allowed=true','Phase 6.2 — Lawyers / Contacts']) requireMarker(closure, marker, 'Phase 6.1 closure evidence');
    const postMerge = read(paths.postMerge);
    for (const marker of ['Status: **COMPLETE**','6d70069995164500b3c05b027145bcdfed96e877','8','34028184381','34028184482','34028207523','Attack the actual published application','phase6_2Allowed=true','Phase 6.2 — Lawyers / Contacts']) requireMarker(postMerge, marker, 'Phase 6.1 post-merge evidence');
  }
}

for (const marker of ['Company list','Arabic-first search','Company create','Company edit','Related transactions','Related documents','Phase 6.2','Phase 6.3','Phase 7','Phase 10','5,000-row','stable operation UUID','stale `updated_at`','real-browser Companies acceptance']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['COMPANY_SOURCE_LIMIT = 5_000','loadCompanyListSource','loadCompanyDetailSource','layer.companies.getById','layer.companies.create','layer.companies.update','createOperationId','expectedUpdatedAt','CompanyEditConflictError','CompanyCreateReplayConflictError','companyContacts','lifecycleEvents','blockers','truncated']) requireMarker(service, marker, 'company service');
for (const marker of ['normalizeCompanySearch','buildCompanyListSnapshot','validateCompanyDraft','COMPANY_LIST_MAX_PAGE_SIZE = 50','COMPANY_SEARCH_MAX_LENGTH = 160','ARABIC_DIACRITICS','merged_into_id','deleted_at','normalizeDigits','Number.isSafeInteger']) requireMarker(model, marker, 'company model');
for (const marker of ['mutationInFlightRef','globalThis.crypto.randomUUID()','DATA_OUTCOME_UNKNOWN','useCompanyDirectory','useCompanyDetail','useCompanyEditor']) requireMarker(hooks, marker, 'company hooks');
for (const marker of ['data-phase6-1="companies"','data-company-source="workspace"','بحث الشركات','ترتيب الشركات','تصفية الشركات','شركة جديدة','تعديل البيانات','buildCompany360Source','<Entity360Panel','<CompanyGovernancePanel','حوكمة 9.3 تدير الملكية','تغييره بعد التأسيس يتم من مركز الحوكمة فقط','أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح']) requireMarker(connected, marker, 'connected companies UI');
for (const marker of ['عرض فقط في R2.0-6','لا تنفّذ إنشاءً أو تعديلًا أو رفع ملفات إنتاجية','data-records-domain="people"','data-records-domain="documents"']) requireMarker(records, marker, 'frozen records compatibility');
for (const marker of ['createPortal','MutationObserver','data-r2-runtime-mode="live"','data-destination','data-records-stage="R2.0-6"','data-records-domain="companies"','<ConnectedCompanies />']) requireMarker(portal, marker, 'production Companies portal');
for (const marker of ['<DataLayerProvider','<CurrentUserIdProvider','<UiR2LiveRoot','<LazyLiveProductionPortals',"import { LazyLiveProductionPortals } from './LazyLiveProductionPortals.tsx';"]) requireMarker(production, marker, 'production Companies mount');
for (const marker of ["import('../records/LiveCompaniesProductionPortal.tsx')",'module.LiveCompaniesProductionPortal',"destination === 'companies' ? <CompaniesPortal />"]) requireMarker(lazyPortals, marker, 'lazy Companies production router');
requireMarker(liveRoot, 'data-r2-runtime-mode="live"', 'live-only production shell');
if (production.includes("from './UiR2Root.tsx'")) errors.push('production Companies mount must not import preview UiR2Root');
if (liveRoot.includes('RecordsRelationshipsExperience')) errors.push('live-only production shell must not import records preview implementation');
requireMarker(data, "companies: MutableRepository<'companies'>", 'data layer');
if (phase62) {
  if (phase62.phase !== '6.2' || phase62.priorPhase !== '6.1' || phase62.priorPhaseRecertified !== true) errors.push('Phase 6.2 state cannot authorize the mutable companyContacts evolution');
  requireMarker(data, "companyContacts: MutableRepository<'company_contacts'>", 'Phase 6.2 data layer');
  requireMarker(data, "companyContacts: createMutableRepository(gateway, scope, 'company_contacts')", 'Phase 6.2 data layer factory');
} else {
  requireMarker(data, "companyContacts: ReadRepository<'company_contacts'>", 'Phase 6.1 data layer');
}
requireMarker(context, 'useOptionalDataLayerFactory', 'data context');

for (const forbidden of ['ConnectedCompanies', 'LiveCompaniesExperienceContext', 'LiveCompaniesProductionPortal', 'useOptionalDataLayerFactory']) {
  if (records.includes(forbidden)) errors.push(`frozen R2 records preview must not import live Phase 6.1 implementation: ${forbidden}`);
}
for (const [label, source] of [['model', model], ['service', service], ['hooks', hooks], ['connected UI', connected]]) {
  for (const forbidden of ['@supabase/supabase-js', 'createEnjazSupabaseClient', 'localStorage', 'sessionStorage']) if (source.includes(forbidden)) errors.push(`${label} creates forbidden direct persistence/runtime channel: ${forbidden}`);
}
if (/\bfetch\s*\(/.test(service) || /\bfetch\s*\(/.test(connected)) errors.push('Phase 6.1 may not create ad-hoc fetch channels');

for (const marker of ['Arabic search','deleted records','Arabic/Persian digit capital','legal name']) requireMarker(read(paths.modelTest), marker, 'company model tests');
for (const marker of ['fabricate a workspace','5000-row safety ceiling','idempotent','stale updated_at']) requireMarker(read(paths.serviceTest), marker, 'company service tests');
for (const marker of ['composes relations','truncation']) requireMarker(read(paths.detailTest), marker, 'company detail tests');

if (errors.length) {
  console.error(`ENJAZ PHASE 6.1 COMPANIES AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const recert = state.postMergeRecertification?.status ?? 'N/A';
  console.log(`ENJAZ PHASE 6.1 COMPANIES AUDIT PASS — ${state.status}; recert=${recert}; canonical workspace data only; frozen R2 previews remain isolated; Phase 6.2 is ${state.phase6_2Allowed ? 'allowed' : 'locked'}.`);
}
