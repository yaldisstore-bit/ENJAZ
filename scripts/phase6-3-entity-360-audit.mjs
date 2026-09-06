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
  state: 'docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json',
  kickoff: 'docs/PHASE6_3_COMPANY_LAWYER_360_KICKOFF.md',
  closure: 'docs/PHASE6_3_COMPANY_LAWYER_360_CLOSURE.md',
  postMerge: 'docs/PHASE6_3_POSTMERGE_RECERTIFICATION.md',
  prior: 'docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json',
  service: 'src/features/entity360/entity360Service.ts',
  panel: 'src/ui-r2/records/Entity360Panel.tsx',
  test: 'tests/entity360Service.test.ts',
};
for (const [label, file] of Object.entries(paths)) {
  if (label === 'closure' || label === 'postMerge') continue;
  if (!exists(file)) errors.push(`missing Phase 6.3 ${label}: ${file}`);
}
if (errors.length) { console.error('ENJAZ PHASE 6.3 ENTITY 360 AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state), prior = json(paths.prior), kickoff = read(paths.kickoff), service = read(paths.service), panel = read(paths.panel), testSource = read(paths.test);
if (state.phase !== '6.3' || state.name !== 'Company / Lawyer 360°' || !['ACTIVE','CLOSED'].includes(state.status)) errors.push('Phase 6.3 canonical identity/status drifted');
if (state.baseCommit !== '57d7a3614e2d04add7fd47ae683509f69e1ca662') errors.push('Phase 6.3 must remain anchored to the certified Phase 6.2 transition main');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.phase6_3Allowed !== true || prior.nextPhase !== '6.3' || prior.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.2 canonical state does not authorize Phase 6.3');
if (state.productionJavaScriptBudget !== 670000) errors.push('Phase 6.3 must preserve the 670000-byte production JavaScript budget');
if (state.phase7Allowed !== false) errors.push('Phase 7 must remain locked throughout Phase 6.3 closure');

if (state.status === 'ACTIVE') {
  if (state.exitGatePassed !== false || state.phase6_4Allowed !== false || state.nextPhase != null) errors.push('ACTIVE Phase 6.3 must fail closed and keep Phase 6.4 locked');
  requireMarker(kickoff, 'Status: **ACTIVE / NOT CLOSED**', 'kickoff');
}

if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) errors.push('CLOSED Phase 6.3 requires exitGatePassed and zero unresolved defects');
  if (state.closureEvidence !== paths.closure || !exists(paths.closure)) errors.push('CLOSED Phase 6.3 requires canonical closure evidence');
  if (state.implementationHead !== 'c3d8d886424c52113b8bf78bdace95528f429c5f') errors.push('Phase 6.3 closure must preserve the certified implementation head');
  if (state.preClosure?.workflowCount !== 22 || state.preClosure?.successCount !== 22 || state.preClosure?.failureCount !== 0) errors.push('Phase 6.3 closure requires 22/22 pre-closure workflows with zero failures');
  if (state.preClosure?.phase63Run !== 34037876673 || state.preClosure?.phase62Run !== 34037876628 || state.preClosure?.phase61Run !== 34037876709 || state.preClosure?.qualityRun !== 34037876624 || state.preClosure?.governanceRun !== 34037876746 || state.preClosure?.wcagRun !== 34037876654 || state.preClosure?.destructionRun !== 34037876794 || state.preClosure?.realBrowserRun !== 34037876774) errors.push('Phase 6.3 key pre-closure run evidence drifted');
  if (state.preClosure?.productionJavaScriptBytes !== 669997) errors.push('Phase 6.3 certified production JavaScript size drifted');
  const recert = state.postMergeRecertification;
  if (recert?.required !== true || !['PENDING','COMPLETE'].includes(recert?.status)) errors.push('CLOSED Phase 6.3 requires explicit post-merge recertification state');
  const closure = read(paths.closure);
  for (const marker of ['c3d8d886424c52113b8bf78bdace95528f429c5f','22/22 pull-request workflows SUCCESS','669997/670000','Real Chromium 7/7','34037876673','34037876628','34037876709','34037876774','unresolvedDefectCount=0']) requireMarker(closure, marker, 'closure evidence');
  if (recert?.status === 'PENDING') {
    if (state.phase6_4Allowed !== false || state.nextPhase != null) errors.push('Phase 6.4 must stay locked while Phase 6.3 post-merge recertification is pending');
    for (const marker of ['Status: **CLOSED — post-merge recertification pending**','phase6_4Allowed=false','post-merge recertification: **PENDING**']) requireMarker(closure, marker, 'pending closure evidence');
  }
  if (recert?.status === 'COMPLETE') {
    if (state.phase6_4Allowed !== true || state.nextPhase !== '6.4') errors.push('Phase 6.4 may be authorized only after Phase 6.3 post-merge recertification completes');
    if (recert.mainCommit !== '46165bfc9f3237b7ff77e7ca11baed3272910831') errors.push('Phase 6.3 canonical recertified main commit drifted');
    if (recert.workflowCount !== 9 || recert.successCount !== 9 || recert.failureCount !== 0) errors.push('completed Phase 6.3 recertification requires 9/9 final workflows SUCCESS');
    if (recert.supersededCancelledCount !== 1 || recert.supersededLiveExternalRun !== 34039399127) errors.push('Phase 6.3 must preserve the single superseded Live External cancellation evidence');
    if (recert.canonicalPromotionRun !== 34039348365 || recert.qualityRun !== 34039348403 || recert.realBrowserRun !== 34039348382 || recert.wcagRun !== 34039348388 || recert.governanceRun !== 34039348417 || recert.pagesPushRun !== 34039348376 || recert.pagesBuildDeploymentRun !== 34039347689 || recert.pagesWorkflowRun !== 34039414219 || recert.liveExternalRun !== 34039447623) errors.push('Phase 6.3 key post-merge run evidence drifted');
    if (state.postMergeEvidence !== paths.postMerge || !exists(paths.postMerge)) errors.push('completed Phase 6.3 recertification requires canonical post-merge evidence');
    const postMerge = exists(paths.postMerge) ? read(paths.postMerge) : '';
    for (const marker of ['Status: **COMPLETE**','9/9 post-merge workflows SUCCESS','46165bfc9f3237b7ff77e7ca11baed3272910831','34039347689','34039447623','34039399127','Attack the actual published application','phase6_4Allowed=true','Phase 6.4 — Companies & People Destruction Gate']) requireMarker(postMerge, marker, 'post-merge evidence');
  }
}

for (const marker of ['Status: **ACTIVE / NOT CLOSED**','unified contextual 360° view','source-of-truth','Phase 6.4','Phase 7','670000']) requireMarker(kickoff, marker, 'kickoff');
for (const marker of ['loadCompanyDetailSource','loadContactProfileSource','loadEntity360Source','buildCompany360Source','buildContact360Source','truncatedScopes','openBlockers','safeMoney']) requireMarker(service, marker, '360 service');
for (const marker of ['Entity360Panel','data-phase6-3="company-lawyer-360"','data-entity360-kind','السياق المالي','مصادر الحقيقة محفوظة','Phase 7']) requireMarker(panel, marker, '360 panel');
for (const marker of ['company 360','contact 360','fails safe']) requireMarker(testSource, marker, '360 tests');
for (const [label, source] of [['service', service], ['panel', panel]]) for (const forbidden of ['@supabase/supabase-js','createEnjazSupabaseClient','localStorage','sessionStorage','fetch(']) if (source.includes(forbidden)) errors.push(`Phase 6.3 ${label} creates forbidden parallel data channel: ${forbidden}`);
if (/\.create\s*\(|\.update\s*\(|\.delete\s*\(/.test(service)) errors.push('Phase 6.3 360 composition service must remain read-only');

if (errors.length) {
  console.error(`ENJAZ PHASE 6.3 ENTITY 360 AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const recert = state.postMergeRecertification?.status ?? 'N/A';
  console.log(`ENJAZ PHASE 6.3 ENTITY 360 AUDIT PASS — ${state.status}; recert=${recert}; authoritative Phase 6.1/6.2 composition only; Phase 6.4 is ${state.phase6_4Allowed ? 'allowed' : 'locked'}; Phase 7 locked; 670000-byte budget preserved.`);
}
