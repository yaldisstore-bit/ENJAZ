import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];
const requireValue = (condition, message) => { if (!condition) errors.push(message); };
const requireMarker = (source, marker, label) => requireValue(source.includes(marker), `${label} missing marker: ${marker}`);

const phase93 = json('docs/PHASE9_3_STATE.json');
const phase94 = json('docs/PHASE9_4_STATE.json');
const major = json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const contract = read('src/features/regulatory/regulatoryKnowledgeContract.ts');
const tests = read('tests/phase9-4-regulatory-knowledge-foundation.test.ts');
const kickoff = read('docs/PHASE9_4_KICKOFF.md');
const lifecycleOpen = phase94.status === 'IN_PROGRESS' || phase94.status === 'ACTIVE';
const lifecycleClosed = phase94.status === 'CLOSED';

requireValue(phase93.status === 'CLOSED' && phase93.exitGatePassed === true && phase93.phase9_4Allowed === true && phase93.nextPhase === '9.4' && phase93.successorStatus === 'AUTHORIZED', 'Phase 9.3 must remain CLOSED and authorize only Phase 9.4');
requireValue(phase94.phase === '9.4' && (lifecycleOpen || lifecycleClosed), 'Phase 9.4 lifecycle must be open or CLOSED');
requireValue(phase94.baseCommit === 'c81cc8fa3732ac97248fdaaabc72cc5f7f26b29f', 'Phase 9.4 must start from the formal Phase 9.3 closure merge');
requireValue(phase94.javascriptBudgetBytes === 670000 && phase94.budgetIncreaseAllowed === false, '670000-byte startup budget must remain unchanged');
requireValue(phase94.authority?.officialSourceProvenance === 'REQUIRED', 'official source provenance must be mandatory');
requireValue(phase94.authority?.regulatoryTruth === 'APPEND_VERSIONED_EFFECTIVE_DATED', 'regulatory truth must be append/version/effective-dated');
requireValue(phase94.authority?.aiOutputAuthority === 'NEVER_AUTHORITATIVE' && phase94.authority?.editorialInterpretationAuthority === 'NEVER_AUTHORITATIVE', 'derived knowledge may never become authoritative');
requireValue(phase94.authority?.directBrowserSensitiveDmlAllowed === false && phase94.authority?.destructiveHistoryOverwriteAllowed === false, 'sensitive direct DML/history overwrite must remain forbidden');
requireValue(phase94.authority?.crossWorkspaceCuratedAccessAllowed === false, 'workspace-curated knowledge must remain isolated');

const tracks = phase94.projectQualityConstitution?.tracks ?? {};
requireValue(phase94.projectQualityConstitution?.closureRequiresAllFourPass === true, 'closure must require Product + UI/UX + Engineering + Certification');
if (lifecycleOpen) {
  const productLifecycle = new Set(['IN_PROGRESS', 'IMPLEMENTED_PENDING_CERTIFICATION', 'IMPLEMENTED_PENDING_LIVE_CERTIFICATION']);
  const uiUxLifecycle = new Set(['IN_PROGRESS', 'IMPLEMENTED_PENDING_REAL_BROWSER', 'REAL_BROWSER_PASS']);
  const engineeringLifecycle = new Set(['IN_PROGRESS', 'STATIC_GATE_PASS']);
  const certificationLifecycle = new Set(['IN_PROGRESS', 'PENDING_PUBLISHED_LIVE']);
  requireValue(productLifecycle.has(tracks.product), 'Product track must be explicitly active or implemented pending certification');
  requireValue(uiUxLifecycle.has(tracks.uiUx), 'UI/UX track must be explicitly active, pending Real Browser, or Real Browser certified');
  requireValue(engineeringLifecycle.has(tracks.engineering), 'Engineering track must be explicitly active or static-gate certified');
  requireValue(certificationLifecycle.has(tracks.certification), 'Certification must remain incomplete until published-live closure');
  requireValue(tracks.certification !== 'PASS', 'open Phase 9.4 cannot be pre-certified');
  requireValue(phase94.phase9_5Allowed === false && phase94.exitGatePassed === false && phase94.successorStatus === 'LOCKED', 'Phase 9.5 must remain locked while Phase 9.4 is open');
  if (tracks.uiUx === 'REAL_BROWSER_PASS') {
    requireValue(phase94.runtime?.realBrowserVerification === 'PASS' && Number.isInteger(phase94.runtime?.realBrowserRunId) && Array.isArray(phase94.runtime?.realBrowserViewports) && phase94.runtime.realBrowserViewports.join(',') === '1280,430,390,360,320', 'REAL_BROWSER_PASS must carry exact runtime browser evidence');
    requireValue(phase94.runtime?.publishedLiveVerification === 'PENDING', 'Real Browser pass must not impersonate published-live certification');
  }
}
if (lifecycleClosed) {
  requireValue(tracks.product === 'PASS' && tracks.uiUx === 'PASS' && tracks.engineering === 'PASS' && tracks.certification === 'PASS', 'closed Phase 9.4 requires all four quality tracks PASS');
  requireValue(phase94.exitGatePassed === true, 'closed Phase 9.4 requires exitGatePassed=true');
  requireValue(phase94.phase9_5Allowed === true && phase94.nextPhase === '9.5' && phase94.successorStatus === 'AUTHORIZED', 'closed Phase 9.4 must authorize Phase 9.5 only');
  requireValue(phase94.unresolvedDefectCount === 0 && phase94.criticalDefectCount === 0 && phase94.highDefectCount === 0 && phase94.functionalBlockerCount === 0, 'closed Phase 9.4 requires zero blocker ledger');
  requireValue(phase94.certifiedMainCommit === 'b72dbff8bb1dfb1afbce82ececd265bf2d5544ed', 'Phase 9.4 closure must bind to the exact certified main implementation merge');
  requireValue(phase94.runtime?.status === 'PUBLISHED_LIVE_PASS' && phase94.runtime?.publishedLiveVerification === 'PASS', 'closed Phase 9.4 requires published-live runtime PASS');
  requireValue(phase94.runtimeCertification?.status === 'PASS' && phase94.runtimeCertification?.mainCommit === phase94.certifiedMainCommit && phase94.runtimeCertification?.phaseGateRunId === 34677681118 && phase94.runtimeCertification?.realBrowserRunId === 34677681129, 'closed Phase 9.4 requires exact-main gate + Real Browser certification');
  requireValue(phase94.publishedLiveCertification?.status === 'PASS' && phase94.publishedLiveCertification?.pagesPreviewRunId === 34677705458 && phase94.publishedLiveCertification?.liveExternalRunId === 34677729775, 'closed Phase 9.4 requires Pages + Live External certification');
  requireValue(phase94.postMergeRecertification?.status === 'COMPLETE' && phase94.postMergeRecertification?.mainCommit === phase94.certifiedMainCommit && phase94.postMergeRecertification?.workflowCount === 23 && phase94.postMergeRecertification?.successCount === 23 && phase94.postMergeRecertification?.failureCount === 0, 'closed Phase 9.4 requires exact-main 23/23 push recertification');
  requireValue(phase94.closureEvidence === 'docs/PHASE9_4_CLOSURE.md' && exists(phase94.closureEvidence), 'closed Phase 9.4 requires canonical closure evidence');
  requireValue(phase94.postMergeEvidence === 'docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md' && exists(phase94.postMergeEvidence), 'closed Phase 9.4 requires post-merge recertification evidence');
}

const m8 = major.systems?.find((system) => system.id === 'M8');
requireValue(m8?.name === 'Regulatory / Knowledge Base Engine' && m8?.status === 'ACTIVE', 'M8 must remain ACTIVE because Phase 12 is still an open governing anchor');
requireValue(Array.isArray(m8?.anchors) && m8.anchors.includes('9') && m8.anchors.includes('12'), 'M8 must preserve Phase 9 + Phase 12 anchors');
requireValue(m8?.closureEvidence === null, 'Phase 9.4 closure must not fabricate global M8 closure before Phase 12');

for (const path of [
  'docs/PHASE9_4_STATE.json',
  'docs/PHASE9_4_KICKOFF.md',
  'src/features/regulatory/regulatoryKnowledgeContract.ts',
  'tests/phase9-4-regulatory-knowledge-foundation.test.ts',
  '.github/workflows/phase9-4-regulatory-knowledge.yml',
]) requireValue(exists(path), `missing Phase 9.4 artifact: ${path}`);

for (const marker of [
  "'official_global' | 'workspace_curated'",
  "'editorial_interpretation' | 'ai_summary'",
  'authoritative: true',
  'authoritative: false',
  'assertDeterministicRegulatoryLineage',
  'resolveRegulatoryVersionAsOf',
  'buildRegulatoryCitation',
  'normalizeArabicRegulatorySearchText',
  'sourceHash',
  'supersedesVersionId',
]) requireMarker(contract, marker, 'regulatory contract');

for (let index = 1; index <= 12; index += 1) requireMarker(tests, `9.4 foundation ${String(index).padStart(2, '0')}`, 'foundation tests');
requireMarker(kickoff, 'AI summaries are derived artifacts only', 'kickoff');
requireMarker(kickoff, 'Phase 9.5 remains **LOCKED**', 'kickoff historical entry law');

if (errors.length) {
  console.error(`PHASE 9.4 REGULATORY KNOWLEDGE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else if (lifecycleClosed) {
  console.log('PHASE 9.4 REGULATORY KNOWLEDGE AUDIT PASS — CLOSED; exact-main + Real Browser + Pages + Live External certified; provenance/version/effective history/AI separation preserved; M8 stays globally ACTIVE for Phase 12; Phase 9.5 authorized.');
} else {
  console.log('PHASE 9.4 REGULATORY KNOWLEDGE AUDIT PASS — predecessor closed; M8 active; four-track quality lifecycle enforced through Real Browser and published-live pending state; provenance/version/effective history/AI separation enforced; 9.5 locked.');
}
