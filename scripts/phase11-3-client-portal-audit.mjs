import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const json=(p)=>JSON.parse(read(p));
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m)=>req(s.includes(m),`missing marker: ${m}`);

const state=json('docs/PHASE11_3_STATE.json');
const predecessor=json('docs/PHASE11_2_STATE.json');
const systems=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE11_3_KICKOFF.md');
const m3=systems.systems.find((x)=>x.id==='M3');
const m4=systems.systems.find((x)=>x.id==='M4');

req(state.phase==='11.3'&&state.name==='Client Portal — M3'&&state.status==='IN_PROGRESS','Phase 11.3 must be the active lifecycle');
req(state.baseCommit==='232086905c7df82738e55a5dd6ef9893ed11e9e1','Phase 11.3 base must be the formal Phase 11.2 closure merge');
req(predecessor.phase==='11.2'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase11_3Allowed===true,'Phase 11.2 must remain formally closed and authorize 11.3');
req(predecessor.closureEvidence==='docs/PHASE11_2_CLOSURE.md','Phase 11.2 closure evidence link drifted');
req(m3?.status==='ACTIVE'&&m3?.anchors?.join(',')==='11'&&m3?.closureEvidence===null,'M3 must be ACTIVE at its Phase 11 anchor without premature closure evidence');
req(m4?.status==='PLANNED','M4 must remain PLANNED while Phase 11.3 is open');
req(state.systemId==='M3'&&state.systemStatus==='ACTIVE','Phase 11.3 machine state must activate M3');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','Phase 11.4 must remain locked');
req(state.exitGatePassed===false,'Phase 11.3 cannot be closed during A/B/C/D delivery');

for(const [field,value] of [
  ['portalPrincipalMayBecomeWorkspaceMember',false],
  ['portalPrincipalMayBecomeOrganizationMember',false],
  ['objectScopeRequired',true],
  ['denyByDefault',true],
  ['directWorkspaceWideReadAllowed',false],
  ['directCoreTablePortalDmlAllowed',false],
  ['internalNotesVisible',false],
  ['riskSignalsVisible',false],
  ['staffOnlyFinanceVisible',false],
  ['unrelatedWorkspaceDataVisible',false],
  ['shadowCompanyStoreAllowed',false],
  ['shadowTransactionStoreAllowed',false],
  ['shadowDocumentStoreAllowed',false],
  ['shadowFinanceStoreAllowed',false],
  ['editableUserMetadataAuthorizationAllowed',false],
  ['serviceRoleInBrowserAllowed',false],
  ['externalWriteAuditRequired',true],
  ['revocationMustFailClosed',true],
  ['databaseAuthorityExtensionRequired',true],
  ['databaseAuthorityExtensionApplied',false],
  ['authorityContractAdded',true],
  ['authorityContractTestsAdded',true],
  ['destructiveLeakageTestsAdded',true]
]) req(state[field]===value,`Phase 11.3 authority invariant drifted: ${field}`);

req(state.authorityContractPath==='src/features/client-portal/clientPortalAuthority.ts'&&exists(state.authorityContractPath),'authority contract file is missing');
req(state.authorityContractTestsPath==='tests/clientPortalAuthority.test.ts'&&exists(state.authorityContractTestsPath),'authority contract destruction tests are missing');
req(Array.isArray(state.authorityContractVerifiedScenarios)&&state.authorityContractVerifiedScenarios.length>=10,'authority contract verified scenario ledger is incomplete');
req(state.crossWorkspaceLeakageTolerance==='ZERO'&&state.crossClientLeakageTolerance==='ZERO','portal leakage tolerance must remain ZERO');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'governed budgets drifted');
req(state.knownCriticalBlockers===0&&state.knownHighBlockers===0&&state.knownFunctionalBlockers===0,'blocker ledger must remain zero');

for(const marker of [
  'separate from ENJAZ staff authority',
  'must never gain workspace-wide trust',
  '`workspace_memberships` remains the owner-only workspace trust root',
  'client accounts must not be inserted there',
  'must not depend on editable `user_metadata`',
  '`TO authenticated` by itself is never sufficient authorization',
  'No service-role/secret key may appear in client code',
  'Cross-workspace and cross-client leakage is a Critical blocker',
  'Phase 11.4 — Omnichannel Communications Hub — M4 remains LOCKED'
]) has(kickoff,marker);

const contract=read(state.authorityContractPath);
const tests=read(state.authorityContractTestsPath);
for(const marker of [
  "status === 'active'",
  'grant.workspaceId !== principal.workspaceId',
  'grant.principalId !== principal.id',
  'grant.revokedAt !== null',
  'fact.staffOnly === true',
  'fact.clientVisible !== true',
  'CLIENT_PORTAL_FORBIDDEN_DOMAINS',
  'CLIENT_SAFE_REQUEST_FIELDS',
  'assertClientSafeProjection'
]) has(contract,marker);
for(const marker of [
  'company access never silently grants transaction access',
  'cross-client grants are ignored',
  'cross-workspace grants are ignored',
  'revoked portal membership fails closed immediately',
  'revoked, future and expired grants fail closed',
  'internal domains remain categorically forbidden',
  'client-safe company projection rejects internal fields',
  'transaction projection uses canonical transaction fields',
  'document projection never exposes storage, checksum or OCR intelligence',
  'receipt projection excludes staff-only finance metadata',
  'request projection exposes action queue only and hides authority/audit metadata',
  'no user_metadata or workspace membership inference input'
]) has(tests,marker);

req(state.currentSlice==='11.3-B'&&state.currentSliceName==='Client-Safe Read Model','canonical current slice must be 11.3-B');
req(state.mode==='CLIENT_SAFE_READ_MODEL_COMPLETION','11.3-B completion mode drifted');
req(state.currentSliceBaseCommit==='f855d2f5128d2905954a5615f3b6a0f54b1e9cfd','11.3-B completion must be based on merged read-model foundation');
for(const p of [
  state.clientSafeReadModelMigrationPath,
  state.clientSafeReadModelHardeningPath,
  state.clientSafeReadModelAuditPath,
  state.governedClientRequestSourceMigrationPath,
]) req(typeof p==='string'&&exists(p),`11.3-B evidence path missing: ${p}`);
req(state.clientSafeReadModelFoundationAdded===true,'11.3-B foundation must remain recorded');
req(state.governedClientRequestSourceAdded===true&&state.governedClientRequestSourceStatus==='IMPLEMENTED_PENDING_REAL_CLOUD','governed request source must be implemented but not falsely live-certified');
req(state.clientSafeReadModelAdded===true&&state.clientSafeReadModelStatus==='IMPLEMENTED_PENDING_REAL_CLOUD','client-safe read model must be code-complete but not falsely live-certified');
req(state.clientSafeReadModelCompletionBlocker===null,'11.3-B code completion blocker must be cleared');
req(state.databaseAuthorityExtensionApplied===false,'Real Cloud database apply remains pending');
req(state.realCloudAuthenticatedVerification==='PENDING','Real Cloud verification remains pending');
req(state.governedClientWriteBoundaryAdded===false,'11.3-C client write authority must not be claimed by 11.3-B');
req(state.portalUiAdded===false,'11.3-D portal UI must not be claimed by 11.3-B');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','Phase 11.4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3 CLIENT PORTAL AUDIT FAIL (${errors.length})`);
  for(const e of errors) console.error(`- ${e}`);
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3 CLIENT PORTAL AUDIT PASS — M3 lifecycle valid; external identity remains isolated; canonical 11.3-B read model and governed request source are code-complete without false Real Cloud claims; M4 stays locked.');
}
