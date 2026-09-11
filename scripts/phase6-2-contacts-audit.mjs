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
  state: 'docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json',
  kickoff: 'docs/PHASE6_2_LAWYERS_CONTACTS_KICKOFF.md',
  prior: 'docs/PHASE6_1_COMPANIES_STATE.json',
  closure: 'docs/PHASE6_2_LAWYERS_CONTACTS_CLOSURE.md',
  postMerge: 'docs/PHASE6_2_POSTMERGE_RECERTIFICATION.md',
  model: 'src/features/contacts/contactModel.ts',
  service: 'src/features/contacts/contactService.ts',
  hooks: 'src/features/contacts/useContacts.ts',
  connected: 'src/ui-r2/records/ConnectedPeople.tsx',
  portal: 'src/ui-r2/records/LivePeopleProductionPortal.tsx',
  lazyPortals: 'src/ui-r2/runtime/LazyLiveProductionPortals.tsx',
  production: 'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
  liveRoot: 'src/ui-r2/runtime/UiR2LiveRoot.tsx',
  records: 'src/ui-r2/records/RecordsRelationshipsExperience.tsx',
  data: 'src/data/createDataLayer.ts',
  modelTest: 'tests/contactModel.test.ts',
  serviceTest: 'tests/contactService.test.ts',
};
for (const [label, file] of Object.entries(paths)) {
  if (label === 'postMerge' || label === 'closure') continue;
  if (!exists(file)) errors.push(`missing Phase 6.2 ${label}: ${file}`);
}
if (errors.length) { console.error('ENJAZ PHASE 6.2 CONTACTS AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const prior = json(paths.prior);
const kickoff = read(paths.kickoff);
const model = read(paths.model);
const service = read(paths.service);
const hooks = read(paths.hooks);
const connected = read(paths.connected);
const portal = read(paths.portal);
const lazyPortals = read(paths.lazyPortals);
const production = read(paths.production);
const liveRoot = read(paths.liveRoot);
const records = read(paths.records);
const data = read(paths.data);

if (state.phase !== '6.2' || state.name !== 'Lawyers / Contacts') errors.push('Phase 6.2 canonical identity drifted');
if (!['ACTIVE', 'CLOSED'].includes(state.status)) errors.push('Phase 6.2 state must be ACTIVE or CLOSED');
if (state.baseCommit !== '6a9b940cc267e5fdd59774faed5a976804dff74b') errors.push('Phase 6.2 must remain anchored to the certified Phase 6.1 recertification main');
if (state.priorPhase !== '6.1' || state.priorPhaseRecertified !== true) errors.push('Phase 6.2 requires recertified Phase 6.1');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.phase6_2Allowed !== true || prior.nextPhase !== '6.2' || prior.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.1 canonical state does not authorize Phase 6.2');
if (state.safeContactSourceLimit !== 5000) errors.push('Phase 6.2 contact source ceiling must remain 5000');

if (state.status === 'ACTIVE') {
  if (state.exitGatePassed !== false || state.phase6_3Allowed !== false) errors.push('ACTIVE Phase 6.2 must fail closed and keep Phase 6.3 locked');
  requireMarker(kickoff, 'Status: **ACTIVE / NOT CLOSED**', 'kickoff');
}

if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) errors.push('CLOSED Phase 6.2 requires exitGatePassed and zero unresolved defects');
  if (!state.closureEvidence || state.closureEvidence !== paths.closure || !exists(paths.closure)) errors.push('CLOSED Phase 6.2 requires canonical closure evidence');
  if (state.implementationHead !== 'd11875962963fb0c734fe1695ca4bd9c7de081b1') errors.push('Phase 6.2 closure must preserve the certified implementation head');
  if (state.preClosure?.workflowCount !== 21 || state.preClosure?.successCount !== 21 || state.preClosure?.failureCount !== 0) errors.push('Phase 6.2 closure requires 21/21 pre-closure workflows with zero failures');
  if (state.preClosure?.phase62Run !== 34033060491 || state.preClosure?.phase61Run !== 34033060435 || state.preClosure?.qualityRun !== 34033060464 || state.preClosure?.governanceRun !== 34033060493 || state.preClosure?.wcagRun !== 34033060442 || state.preClosure?.destructionRun !== 34033060638 || state.preClosure?.realBrowserRun !== 34033060495) errors.push('Phase 6.2 key pre-closure run evidence drifted');
  const recert = state.postMergeRecertification;
  if (recert?.required !== true || !['PENDING', 'COMPLETE'].includes(recert?.status)) errors.push('CLOSED Phase 6.2 requires an explicit post-merge recertification state');
  const closure = exists(paths.closure) ? read(paths.closure) : '';
  for (const marker of ['d11875962963fb0c734fe1695ca4bd9c7de081b1','21/21 pull-request workflows SUCCESS','669889/670000','unresolvedDefectCount=0','Phase 6.3 — Company / Lawyer 360°']) requireMarker(closure, marker, 'Phase 6.2 closure evidence');
  if (recert?.status === 'PENDING') {
    if (state.phase6_3Allowed !== false) errors.push('Phase 6.3 must remain locked while Phase 6.2 post-merge recertification is pending');
    if (state.nextPhase != null) errors.push('Phase 6.2 must not publish a next phase before post-merge recertification completes');
    for (const marker of ['Status: **CLOSED — post-merge recertification pending**','phase6_3Allowed=false']) requireMarker(closure, marker, 'Phase 6.2 pending closure evidence');
  }
  if (recert?.status === 'COMPLETE') {
    if (state.phase6_3Allowed !== true || state.nextPhase !== '6.3') errors.push('Phase 6.3 may be allowed only after Phase 6.2 post-merge recertification completes');
    if (recert.mainCommit !== 'e35555237d6a631e55a0c248bea0f22d0cbd0c37') errors.push('completed Phase 6.2 recertification must preserve the certified canonical main commit');
    if (recert.workflowCount !== 8 || recert.successCount !== 8 || recert.failureCount !== 0) errors.push('completed Phase 6.2 recertification requires 8/8 workflows SUCCESS with zero failures');
    if (recert.governanceRun !== 34034618839 || recert.realBrowserRun !== 34034618747 || recert.pagesRun !== 34034638895 || recert.liveExternalRun !== 34034668227) errors.push('Phase 6.2 post-merge key run evidence drifted');
    if (!state.postMergeEvidence || state.postMergeEvidence !== paths.postMerge || !exists(paths.postMerge)) errors.push('completed Phase 6.2 recertification requires a canonical evidence file');
    for (const marker of ['Status: **CLOSED — canonical post-merge recertification COMPLETE**','e35555237d6a631e55a0c248bea0f22d0cbd0c37','8/8 post-merge workflows SUCCESS','phase6_3Allowed=true','Phase 6.3 — Company / Lawyer 360°']) requireMarker(closure, marker, 'Phase 6.2 complete closure evidence');
    const postMerge = exists(paths.postMerge) ? read(paths.postMerge) : '';
    for (const marker of ['Status: **COMPLETE**','e35555237d6a631e55a0c248bea0f22d0cbd0c37','8/8 post-merge workflows SUCCESS','34034618703','34034618764','34034618747','34034618752','34034618839','34034618000','34034638895','34034668227','Attack the actual published application','phase6_3Allowed=true','Phase 6.3 — Company / Lawyer 360°']) requireMarker(postMerge, marker, 'Phase 6.2 post-merge evidence');
  }
}

for (const marker of ['lawyer/contact list','company relationships','transaction relationships','Phase 6.3','Phase 7','5,000 rows','Real Chromium acceptance']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['CONTACT_LIST_MAX_PAGE_SIZE = 50','CONTACT_SEARCH_MAX_LENGTH = 160','normalizeContactSearch','buildContactListSnapshot','validateContactDraft','isLawyerContactType','deleted_at','merged_into_id']) requireMarker(model, marker, 'contact model');
for (const marker of ['CONTACT_SOURCE_LIMIT = 5_000','loadContactListSource','loadContactProfileSource','saveContact','addCompanyContactRelationship','endCompanyContactRelationship','assignTransactionPrimaryContact','layer.contacts.create','layer.contacts.update','layer.companyContacts.create','layer.companyContacts.update','primary_contact_id','isCurrentCompanyRelation','ContactCreateReplayConflictError','ContactEditConflictError','TransactionContactConflictError']) requireMarker(service, marker, 'contact service');
for (const marker of ['mutationInFlightRef','globalThis.crypto.randomUUID()','useContactDirectory','useContactProfile','useContactEditor','useContactRelationshipActions','DATA_OUTCOME_UNKNOWN']) requireMarker(hooks, marker, 'contact hooks');
for (const marker of ['data-phase6-2="lawyers-contacts"','data-contact-source="workspace"','بحث الأشخاص','المحامون','جهة اتصال جديدة','إضافة علاقة مع شركة','company_contacts','primary_contact_id','Phase 6.3','Phase 7']) requireMarker(connected, marker, 'connected people UI');
for (const marker of ['createPortal','data-r2-runtime-mode="live"','data-destination','data-records-domain="people"','<ConnectedPeople />']) requireMarker(portal, marker, 'live people portal');
for (const marker of ['<DataLayerProvider','<UiR2LiveRoot','<LazyLiveProductionPortals />',"import { LazyLiveProductionPortals } from './LazyLiveProductionPortals.tsx';"]) requireMarker(production, marker, 'production root');
for (const marker of ["import('../records/LiveCompaniesProductionPortal.tsx')",'module.LiveCompaniesProductionPortal',"import('../records/LivePeopleProductionPortal.tsx')",'module.LivePeopleProductionPortal',"destination === 'companies' ? <CompaniesPortal />","destination === 'people' ? <PeoplePortal />"]) requireMarker(lazyPortals, marker, 'lazy records production router');
requireMarker(liveRoot, 'data-r2-runtime-mode="live"', 'live-only production shell');
if (production.includes("from './UiR2Root.tsx'")) errors.push('production root must not import preview UiR2Root');
if (liveRoot.includes('RecordsRelationshipsExperience')) errors.push('live-only production shell must not import records preview implementation');
for (const marker of ["contacts: MutableRepository<'contacts'>","companyContacts: MutableRepository<'company_contacts'>","transactions: MutableRepository<'transactions'>"]) requireMarker(data, marker, 'data layer');

for (const forbidden of ['ConnectedPeople', 'LivePeopleProductionPortal', 'useContactDirectory']) if (records.includes(forbidden)) errors.push(`frozen R2 records preview must not import Phase 6.2 live code: ${forbidden}`);
for (const [label, source] of [['model', model], ['service', service], ['hooks', hooks], ['connected UI', connected]]) {
  for (const forbidden of ['@supabase/supabase-js', 'createEnjazSupabaseClient', 'localStorage', 'sessionStorage']) if (source.includes(forbidden)) errors.push(`${label} creates forbidden direct persistence/runtime channel: ${forbidden}`);
}
if (/\bfetch\s*\(/.test(service) || /\bfetch\s*\(/.test(connected)) errors.push('Phase 6.2 may not create ad-hoc fetch channels');

for (const marker of ['Arabic search','deleted records','contact draft']) requireMarker(read(paths.modelTest), marker, 'contact model tests');
for (const marker of ['5000-row safety ceiling','idempotent','stale updated_at','company-contact relationship','transaction primary contact']) requireMarker(read(paths.serviceTest), marker, 'contact service tests');

if (errors.length) {
  console.error(`ENJAZ PHASE 6.2 CONTACTS AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const recert = state.postMergeRecertification?.status ?? 'N/A';
  console.log(`ENJAZ PHASE 6.2 CONTACTS AUDIT PASS — ${state.status}; recert=${recert}; workspace Data Layer only; company and transaction relationships are canonical; Phase 6.3 is ${state.phase6_3Allowed ? 'allowed' : 'locked'}.`);
}
