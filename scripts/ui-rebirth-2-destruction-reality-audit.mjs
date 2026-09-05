import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));
const errors = [];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_DESTRUCTION_REALITY_EVIDENCE.json',
  kickoff: 'docs/R2_0_9_DESTRUCTION_REALITY_QA_KICKOFF.md',
  browser: 'tests-external/r2-destruction-reality.spec.cjs',
  wave2: 'tests-external/r2-destruction-reality-wave2.spec.cjs',
  workflow: '.github/workflows/ui-rebirth-2-destruction-reality.yml',
  main: 'src/main.tsx',
};

for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-9 ${name}: ${file}`);
if (errors.length) {
  console.error('ENJAZ R2.0-9 DESTRUCTION REALITY AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json(paths.state);
const evidence = json(paths.evidence);
const kickoff = read(paths.kickoff);
const browser = read(paths.browser);
const wave2 = read(paths.wave2);
const workflow = read(paths.workflow);
const main = read(paths.main);

const expectedScope = [
  'keyboardFocus',
  'rtl',
  'mixedArabicLatin',
  'longContent',
  'denseDatasets',
  'emptyStates',
  'failures',
  'permissionMutationTruthfulness',
  'backStack',
  'deepLinks',
  'overlays',
  'orientation',
  'reducedMotion',
  'touchGeometry44px',
  'horizontalOverflow',
];
const hardWidths = [1280, 430, 390, 360, 320];
const closedScenarioCount = 30;
const closurePath = 'docs/R2_0_9_DESTRUCTION_REALITY_QA_CLOSURE.md';
const laterStages = new Set(['R2.0-10', 'R2.0-11']);
const preservingLaterStage = laterStages.has(state.stage);

if (state.stage !== 'R2.0-9' && !preservingLaterStage) errors.push(`R2.0-9 guard supports R2.0-9 or later preservation stages, found ${state.stage}`);
if (!['ACTIVE', 'CLOSED'].includes(state.destructionRealityQa?.status)) errors.push('destructionRealityQa status must be ACTIVE or CLOSED');
if (preservingLaterStage && state.destructionRealityQa?.status !== 'CLOSED') errors.push(`${state.stage} requires R2.0-9 to remain CLOSED`);

if (state.stage !== 'R2.0-11') {
  if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 before R2.0-11');
  if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('promotion must remain blocked before R2.0-11');
  if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx may not boot UiR2Root before R2.0-11');
}

if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.goldenExperience?.status !== 'APPROVED') errors.push('Golden Experience must remain APPROVED');
if (state.coreWorkMigration?.status !== 'CLOSED') errors.push('R2.0-5 must remain CLOSED');
if (state.recordsRelationships?.status !== 'CLOSED') errors.push('R2.0-6 must remain CLOSED');
if (state.operationalIntelligence?.status !== 'CLOSED') errors.push('R2.0-7 must remain CLOSED');
if (state.findAnythingZeroLost?.status !== 'CLOSED' || state.findAnythingZeroLost?.exitGatePassed !== true) errors.push('R2.0-8 must remain CLOSED with exit gate PASS');
if (state.noMaze?.validated !== true || state.noMaze?.scenarioCount !== 16 || state.noMaze?.passedCount !== 16) errors.push('R2.0-8 16/16 No-Maze proof must remain preserved');
if (state.noMaze?.maxMajorCapabilityActions !== 3) errors.push('No-Maze action ceiling must remain exactly 3');
if (state.noMaze?.hiddenPrimaryNavigationCount !== 0) errors.push('hidden primary navigation must remain zero');
if (state.noMaze?.duplicateCanonicalHomesCount !== 0) errors.push('duplicate canonical homes count must remain zero');
if (state.noMaze?.backPathFailures !== 0) errors.push('back-path failures must remain zero');

if (evidence.schemaVersion !== 1 || evidence.stage !== 'R2.0-9') errors.push('R2.0-9 evidence schema/stage mismatch');
if (evidence.status !== state.destructionRealityQa?.status) errors.push('R2.0-9 evidence status must mirror state');
if (JSON.stringify(evidence.scope) !== JSON.stringify(expectedScope)) errors.push('R2.0-9 attack scope drifted');
if (JSON.stringify(state.destructionRealityQa?.scope) !== JSON.stringify(expectedScope)) errors.push('state destruction scope drifted');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify(hardWidths)) errors.push('R2.0-9 evidence hard widths drifted');
if (JSON.stringify(state.destructionRealityQa?.hardWidths) !== JSON.stringify(hardWidths)) errors.push('state R2.0-9 hard widths drifted');
if (evidence.minimumScenarioCount !== 15 || state.destructionRealityQa?.minimumScenarioCount !== 15) errors.push('R2.0-9 minimum scenario count drifted');
if (evidence.truthfulness?.canonicalRuntimeChanged !== false || evidence.truthfulness?.phase55Locked !== true) errors.push('R2.0-9 truthfulness runtime/freeze boundary drifted');
if (evidence.truthfulness?.productionPersistenceClaimed !== false) errors.push('R2.0-9 preview may not claim production persistence');
if (evidence.truthfulness?.adHocPersistenceAllowed !== false || evidence.truthfulness?.adHocNetworkFetchAllowed !== false) errors.push('R2.0-9 may not introduce ad-hoc persistence/network channels');
if (evidence.truthfulness?.previewMutationRequestsAllowed !== false) errors.push('R2.0-9 preview mutation requests must remain forbidden');

for (const marker of ['Reproduce before repair', 'No smoke-test substitution', '44 px', 'horizontal-overflow', 'R2.0-10']) {
  if (!kickoff.includes(marker)) errors.push(`kickoff missing hard methodology marker: ${marker}`);
}

for (const width of hardWidths) if (!browser.includes(String(width))) errors.push(`browser destruction suite missing hard width ${width}`);
for (const marker of [
  'DESTRUCTION_SCENARIOS',
  'minimum 15 destructive scenarios',
  'keyboard and focus survive overlay ownership',
  'RTL root remains first-class',
  'mixed Arabic Latin numeric search remains usable',
  'extreme long content does not create horizontal overflow',
  'dense launcher stress remains bounded',
  'empty transaction search is truthful',
  'invalid destination fails safely to Home',
  'preview emits no mutation network requests',
  'browser Back restores the logical prior level',
  'direct deep links resolve without hidden navigation',
  'overlay layering remains inside viewport',
  'landscape orientation remains usable',
  'reduced motion settles without active animations',
  'all visible primary controls preserve 44px touch geometry',
  'horizontal overflow attack remains contained',
  'assertNoHorizontalOverflow',
  'assertTouchTargets',
  'assertNoMutationRequests',
]) if (!browser.includes(marker)) errors.push(`browser destruction suite missing required attack marker: ${marker}`);

for (const marker of [
  'WAVE2_SCENARIOS',
  'search modal keeps keyboard focus contained',
  'account modal traps focus and restores its opener',
  'repeated overlay ownership never stacks dialogs',
  'tiny-height viewport can reach final More action above bottom navigation',
  'transaction 360 contains extreme real copy across every tab',
  'malformed transaction deep links fail safely without crashing shell',
  'rapid search navigation and Back repeatedly restore query context',
  'keyboard navigation retains visible focus at 320px',
]) if (!wave2.includes(marker)) errors.push(`browser destruction wave 2 missing required attack marker: ${marker}`);

for (const marker of [
  'ui-rebirth-2-destruction-reality-audit.mjs',
  'ui-rebirth-2-zero-lost-audit.mjs',
  'test:functional',
  'db:audit',
  'db:audit:selftest',
  'typecheck',
  'vite.r2-preview.config.ts',
  'r2-destruction-reality.spec.cjs',
  'r2-destruction-reality-wave2.spec.cjs',
  '@playwright/test@1.55.0',
  'chromium',
  '1280 + 430 + 390 + 360 + 320',
]) if (!workflow.includes(marker)) errors.push(`R2.0-9 workflow missing cumulative/reality marker: ${marker}`);

if (state.destructionRealityQa?.status === 'CLOSED') {
  const declared = state.destructionRealityQa?.declaredScenarioCount;
  const passed = state.destructionRealityQa?.passedScenarioCount;
  if (declared !== closedScenarioCount) errors.push(`closed R2.0-9 requires exactly ${closedScenarioCount} declared destructive scenarios`);
  if (passed !== declared) errors.push('closed R2.0-9 requires every declared destructive scenario to pass');
  if (state.destructionRealityQa?.unresolvedDefectCount !== 0) errors.push('closed R2.0-9 requires zero unresolved defects');
  if (state.destructionRealityQa?.exitGatePassed !== true || evidence.exitGatePassed !== true) errors.push('closed R2.0-9 requires exit gate PASS');
  if (evidence.destruction?.declaredScenarioCount !== declared || evidence.destruction?.passedScenarioCount !== declared) errors.push('closed R2.0-9 evidence counts must match state');
  if (!Array.isArray(evidence.destruction?.unresolvedDefects) || evidence.destruction.unresolvedDefects.length !== 0) errors.push('closed R2.0-9 requires empty unresolved-defect evidence');
  if (JSON.stringify(evidence.destruction?.attackClassesCovered) !== JSON.stringify(expectedScope)) errors.push('closed R2.0-9 requires every attack class to be covered');
  if (!Array.isArray(evidence.resolvedAppDefects) || evidence.resolvedAppDefects.length < 3) errors.push('closed R2.0-9 requires pinned resolved app defects');
  if (!Array.isArray(evidence.correctedTestDefects) || evidence.correctedTestDefects.length < 2) errors.push('closed R2.0-9 requires corrected false-positive test defects');
  if (!evidence.finalEvidence?.run || !evidence.finalEvidence?.artifactId || !evidence.finalEvidence?.testedCommit || !evidence.finalEvidence?.artifactSha256) errors.push('closed R2.0-9 requires pinned final browser evidence');
  if (evidence.finalEvidence?.destructiveScenarios !== closedScenarioCount || evidence.finalEvidence?.cumulativeZeroLostScenarios !== 16 || evidence.finalEvidence?.totalBrowserValidations !== 46) errors.push('closed R2.0-9 final browser counts must be 30 destructive + 16 cumulative = 46');
  const expectedChecks = {
    structuralAudit: 'PASS',
    functionalRegression: 'PASS_118_OF_118',
    typescript: 'PASS',
    previewBuild: 'PASS',
    previewBudget: 'PASS',
    realChromiumDestruction: 'PASS_30_OF_30',
    cumulativeRealBrowser: 'PASS_46_OF_46_WITH_16_ZERO_LOST',
  };
  for (const [name, value] of Object.entries(expectedChecks)) if (evidence.checks?.[name] !== value) errors.push(`closed R2.0-9 check ${name} must equal ${value}`);
  if (!exists(closurePath)) errors.push(`closed R2.0-9 requires closure record: ${closurePath}`);
  else {
    const closure = read(closurePath);
    for (const marker of ['Status: **CLOSED**', '30 / 30', '46 / 46', 'R2.0-10']) if (!closure.includes(marker)) errors.push(`R2.0-9 closure missing marker: ${marker}`);
  }
}

if (errors.length) {
  console.error(`ENJAZ R2.0-9 DESTRUCTION REALITY AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0-9 DESTRUCTION REALITY AUDIT PASS — preserved at ${state.stage}; ${state.destructionRealityQa?.status}; real-browser attack scope and cumulative locks remain fail-closed.`);
}
