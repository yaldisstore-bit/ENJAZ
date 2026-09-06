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
  model: 'src/features/contacts/contactModel.ts',
  service: 'src/features/contacts/contactService.ts',
  hooks: 'src/features/contacts/useContacts.ts',
  connected: 'src/ui-r2/records/ConnectedPeople.tsx',
  portal: 'src/ui-r2/records/LivePeopleProductionPortal.tsx',
  production: 'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
  records: 'src/ui-r2/records/RecordsRelationshipsExperience.tsx',
  data: 'src/data/createDataLayer.ts',
  modelTest: 'tests/contactModel.test.ts',
  serviceTest: 'tests/contactService.test.ts',
};
for (const [label, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing Phase 6.2 ${label}: ${file}`);
if (errors.length) { console.error('ENJAZ PHASE 6.2 CONTACTS AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const prior = json(paths.prior);
const kickoff = read(paths.kickoff);
const model = read(paths.model);
const service = read(paths.service);
const hooks = read(paths.hooks);
const connected = read(paths.connected);
const portal = read(paths.portal);
const production = read(paths.production);
const records = read(paths.records);
const data = read(paths.data);

if (state.phase !== '6.2' || state.name !== 'Lawyers / Contacts' || state.status !== 'ACTIVE') errors.push('Phase 6.2 must begin ACTIVE with the canonical identity');
if (state.baseCommit !== '6a9b940cc267e5fdd59774faed5a976804dff74b') errors.push('Phase 6.2 must remain anchored to the certified Phase 6.1 recertification main');
if (state.priorPhase !== '6.1' || state.priorPhaseRecertified !== true) errors.push('Phase 6.2 requires recertified Phase 6.1');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.phase6_2Allowed !== true || prior.nextPhase !== '6.2' || prior.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.1 canonical state does not authorize Phase 6.2');
if (state.exitGatePassed !== false || state.phase6_3Allowed !== false) errors.push('ACTIVE Phase 6.2 must fail closed and keep Phase 6.3 locked');
if (state.safeContactSourceLimit !== 5000) errors.push('Phase 6.2 contact source ceiling must remain 5000');

for (const marker of ['Status: **ACTIVE / NOT CLOSED**','lawyer/contact list','company relationships','transaction relationships','Phase 6.3','Phase 7','5,000 rows','Real Chromium acceptance']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['CONTACT_LIST_MAX_PAGE_SIZE = 50','CONTACT_SEARCH_MAX_LENGTH = 160','normalizeContactSearch','buildContactListSnapshot','validateContactDraft','isLawyerContactType','deleted_at','merged_into_id']) requireMarker(model, marker, 'contact model');
for (const marker of ['CONTACT_SOURCE_LIMIT = 5_000','loadContactListSource','loadContactProfileSource','saveContact','addCompanyContactRelationship','endCompanyContactRelationship','assignTransactionPrimaryContact','layer.contacts.create','layer.contacts.update','layer.companyContacts.create','layer.companyContacts.update','primary_contact_id','isCurrentCompanyRelation','ContactCreateReplayConflictError','ContactEditConflictError','TransactionContactConflictError']) requireMarker(service, marker, 'contact service');
for (const marker of ['mutationInFlightRef','globalThis.crypto.randomUUID()','useContactDirectory','useContactProfile','useContactEditor','useContactRelationshipActions','DATA_OUTCOME_UNKNOWN']) requireMarker(hooks, marker, 'contact hooks');
for (const marker of ['data-phase6-2="lawyers-contacts"','data-contact-source="workspace"','بحث الأشخاص','المحامون','جهة اتصال جديدة','إضافة علاقة مع شركة','company_contacts','primary_contact_id','Phase 6.3','Phase 7']) requireMarker(connected, marker, 'connected people UI');
for (const marker of ['createPortal','data-r2-runtime-mode="live"','data-destination','data-records-domain="people"','<ConnectedPeople />']) requireMarker(portal, marker, 'live people portal');
for (const marker of ['<LiveCompaniesProductionPortal />','<LivePeopleProductionPortal />','<DataLayerProvider','<UiR2Root runtimeMode="live"']) requireMarker(production, marker, 'production root');
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
  console.log('ENJAZ PHASE 6.2 CONTACTS AUDIT PASS — ACTIVE; workspace Data Layer only; company and transaction relationships are canonical; Phase 6.3 remains locked.');
}
