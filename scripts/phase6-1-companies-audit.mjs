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
  model: 'src/features/companies/companyModel.ts',
  service: 'src/features/companies/companyService.ts',
  hooks: 'src/features/companies/useCompanies.ts',
  connected: 'src/ui-r2/records/ConnectedCompanies.tsx',
  portal: 'src/ui-r2/records/LiveCompaniesProductionPortal.tsx',
  records: 'src/ui-r2/records/RecordsRelationshipsExperience.tsx',
  production: 'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
  data: 'src/data/createDataLayer.ts',
  context: 'src/data/react/DataLayerContext.tsx',
  modelTest: 'tests/companyModel.test.ts',
  serviceTest: 'tests/companyService.test.ts',
  detailTest: 'tests/companyDetailService.test.ts',
};
for (const [label, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing Phase 6.1 ${label}: ${file}`);
if (errors.length) { console.error('ENJAZ PHASE 6.1 COMPANIES AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const prior = json(paths.prior);
const kickoff = read(paths.kickoff);
const model = read(paths.model);
const service = read(paths.service);
const hooks = read(paths.hooks);
const connected = read(paths.connected);
const portal = read(paths.portal);
const records = read(paths.records);
const production = read(paths.production);
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
if (state.status === 'ACTIVE' && (state.exitGatePassed !== false || state.phase6_2Allowed !== false)) errors.push('ACTIVE Phase 6.1 must fail closed and keep Phase 6.2 locked');
if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0 || state.phase6_2Allowed !== true) errors.push('CLOSED Phase 6.1 requires exitGatePassed, zero defects and explicit 6.2 unlock');
  if (!state.closureEvidence || !exists(state.closureEvidence)) errors.push('CLOSED Phase 6.1 requires closure evidence');
}

for (const marker of ['Status: **ACTIVE / NOT CLOSED**','Company list','Arabic-first search','Company create','Company edit','Related transactions','Related documents','Phase 6.2','Phase 6.3','Phase 7','Phase 10','5,000-row','stable operation UUID','stale `updated_at`','real-browser Companies acceptance']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['COMPANY_SOURCE_LIMIT = 5_000','loadCompanyListSource','loadCompanyDetailSource','layer.companies.getById','layer.companies.create','layer.companies.update','createOperationId','expectedUpdatedAt','CompanyEditConflictError','CompanyCreateReplayConflictError','companyContacts','lifecycleEvents','blockers','truncated']) requireMarker(service, marker, 'company service');
for (const marker of ['normalizeCompanySearch','buildCompanyListSnapshot','validateCompanyDraft','COMPANY_LIST_MAX_PAGE_SIZE = 50','COMPANY_SEARCH_MAX_LENGTH = 160','ARABIC_DIACRITICS','merged_into_id','deleted_at','normalizeDigits','Number.isSafeInteger']) requireMarker(model, marker, 'company model');
for (const marker of ['mutationInFlightRef','globalThis.crypto.randomUUID()','DATA_OUTCOME_UNKNOWN','useCompanyDirectory','useCompanyDetail','useCompanyEditor']) requireMarker(hooks, marker, 'company hooks');
for (const marker of ['data-phase6-1="companies"','data-company-source="workspace"','بحث الشركات','ترتيب الشركات','تصفية الشركات','شركة جديدة','تعديل البيانات','إدارة الأشخاص والعلاقات الكاملة تبقى Phase 6.2','Company/Lawyer 360° تبقى Phase 6.3','Phase 7','Phase 10','أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح']) requireMarker(connected, marker, 'connected companies UI');
for (const marker of ['عرض فقط في R2.0-6','لا تنفّذ إنشاءً أو تعديلًا أو رفع ملفات إنتاجية','data-records-domain="people"','data-records-domain="documents"']) requireMarker(records, marker, 'frozen records compatibility');
for (const marker of ['createPortal','MutationObserver','data-r2-runtime-mode="live"','data-destination','data-records-stage="R2.0-6"','data-records-domain="companies"','<ConnectedCompanies />']) requireMarker(portal, marker, 'production Companies portal');
for (const marker of ['<LiveCompaniesProductionPortal />','<DataLayerProvider','<CurrentUserIdProvider','<UiR2Root runtimeMode="live"']) requireMarker(production, marker, 'production Companies mount');
for (const marker of ["companies: MutableRepository<'companies'>","companyContacts: ReadRepository<'company_contacts'>"]) requireMarker(data, marker, 'data layer');
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
  console.log(`ENJAZ PHASE 6.1 COMPANIES AUDIT PASS — ${state.status}; canonical workspace data only; frozen R2 previews remain isolated; Phase 6.2 remains ${state.phase6_2Allowed ? 'allowed' : 'locked'}.`);
}
