import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const errors = [];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_ZERO_LOST_EVIDENCE.json',
  parity: 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  navigation: 'src/ui-r2/architecture/navigation-contract.ts',
  model: 'src/ui-r2/find-anything/find-anything-model.ts',
  connected: 'src/ui-r2/find-anything/FindAnythingConnected.ts',
  root: 'src/ui-r2/runtime/UiR2Root.tsx',
  browser: 'tests-external/r2-zero-lost.spec.cjs',
  connectedTest: 'tests/findAnythingConnected.test.ts',
  main: 'src/main.tsx',
};

for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-8 ${name}: ${file}`);
if (errors.length) {
  console.error('ENJAZ R2.0-8 ZERO-LOST AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json(paths.state);
const evidence = json(paths.evidence);
const parity = json(paths.parity);
const navigation = read(paths.navigation);
const model = read(paths.model);
const connected = read(paths.connected);
const uiRoot = read(paths.root);
const browser = read(paths.browser);
const connectedTest = read(paths.connectedTest);
const main = read(paths.main);

if (state.stage !== 'R2.0-8') errors.push(`Zero-Lost guard requires stage R2.0-8, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 during R2.0-8');
if (state.goldenExperience?.status !== 'APPROVED') errors.push('Golden Experience must remain approved');
if (state.coreWorkMigration?.status !== 'CLOSED') errors.push('R2.0-5 must remain CLOSED');
if (state.recordsRelationships?.status !== 'CLOSED') errors.push('R2.0-6 must remain CLOSED');
if (state.operationalIntelligence?.status !== 'CLOSED') errors.push('R2.0-7 must remain CLOSED before R2.0-8');
if (!['ACTIVE', 'CLOSED'].includes(state.findAnythingZeroLost?.status)) errors.push('findAnythingZeroLost status must be ACTIVE or CLOSED');
if (state.findAnythingZeroLost?.canonicalRuntimeChanged !== false) errors.push('R2.0-8 cannot change canonical runtime');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('canonical promotion must remain blocked');
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx must not boot UiR2Root before R2.0-11');

const expectedScope = [
  'featureAliases',
  'recordDiscovery',
  'canonicalDestinationNavigation',
  'maxThreeActionReachability',
  'hiddenDoorElimination',
  'duplicateHomeElimination',
  'searchBackRestoration',
];
if (evidence.stage !== 'R2.0-8' || evidence.status !== state.findAnythingZeroLost?.status) errors.push('R2.0-8 evidence status/stage must mirror state');
if (JSON.stringify(evidence.scope) !== JSON.stringify(expectedScope)) errors.push('R2.0-8 scope drifted');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify([1280, 430, 390, 360, 320])) errors.push('R2.0-8 hard widths drifted');
if (JSON.stringify(evidence.targetCapabilities) !== JSON.stringify(['global.search'])) errors.push('R2.0-8 must target global.search capability');
if (evidence.truthfulness?.canonicalRuntimeChanged !== false || evidence.truthfulness?.phase55Locked !== true) errors.push('R2.0-8 truthfulness boundary drifted');
if (evidence.truthfulness?.previewRecordsClaimedAsProduction !== false) errors.push('preview records may never be claimed as production');
if (evidence.truthfulness?.adHocPersistenceAllowed !== false || evidence.truthfulness?.adHocNetworkFetchAllowed !== false) errors.push('R2.0-8 may not introduce ad-hoc persistence/network channels');

if (state.noMaze?.maxMajorCapabilityActions !== 3 || evidence.zeroLost?.maxMajorCapabilityActions !== 3) errors.push('major capability reachability ceiling must remain exactly 3 actions');
if (state.noMaze?.hiddenPrimaryNavigationCount !== 0 || evidence.zeroLost?.hiddenPrimaryNavigationCount !== 0) errors.push('hidden primary navigation count must remain zero');
if (state.noMaze?.duplicateCanonicalHomesCount !== 0 || evidence.zeroLost?.duplicateCanonicalHomesCount !== 0) errors.push('duplicate canonical homes count must remain zero');
if (state.noMaze?.backPathFailures !== 0 || evidence.zeroLost?.backPathFailures !== 0) errors.push('back-path failures must remain zero');

for (const marker of [
  'R2_MAX_MAJOR_ACTIONS_FROM_HOME = 3',
  'R2_PRIMARY_NAVIGATION',
  'R2_SEARCH_ALIASES',
  "searchResult: 'return_to_query_and_results'",
]) if (!navigation.includes(marker)) errors.push(`navigation contract missing Zero-Lost marker: ${marker}`);

for (const marker of [
  'normalizeR2Search',
  'buildR2FindAnythingResults',
  'buildR2PreviewSearchRecords',
  'buildTransactionListPreviewSource',
  "source: 'preview-record'",
  "destinationId: 'transactions.detail'",
  'slice(0, 80)',
]) if (!model.includes(marker)) errors.push(`Find Anything model missing required marker: ${marker}`);
if (/\b(?:fetch|localStorage|sessionStorage)\s*\(/.test(model)) errors.push('Find Anything model may not create ad-hoc fetch or browser persistence channels');
for (const forbidden of ['ui-v2', 'ui-rebirth']) if (model.includes(forbidden)) errors.push(`Find Anything model references legacy presentation marker: ${forbidden}`);

for (const marker of [
  'EnjazDataLayerFactory',
  'useDataLayerFactory',
  'useCurrentUserId',
  'resolveWorkspaceId',
  'forWorkspace',
  'data.transactions.list',
  'data.companies.list',
  'loadR2WorkspaceSearchRecords',
  'buildR2ConnectedFindAnythingResults',
  "'workspace-record'",
  'بيانات مساحة العمل',
  'limit: 80',
  'limit: 100',
]) if (!connected.includes(marker)) errors.push(`authoritative Find Anything provider missing Data Layer marker: ${marker}`);
if (/\b(?:fetch|localStorage|sessionStorage)\s*\(/.test(connected)) errors.push('authoritative Find Anything provider may not create ad-hoc fetch or browser persistence channels');
for (const forbidden of ['ui-v2', 'ui-rebirth']) if (connected.includes(forbidden)) errors.push(`authoritative Find Anything provider references legacy presentation marker: ${forbidden}`);
for (const marker of ['loadR2WorkspaceSearchRecords', 'workspace-record', 'بيانات مساحة العمل', 'resolveWorkspaceId']) if (!connectedTest.includes(marker)) errors.push(`connected Find Anything tests missing truthfulness marker: ${marker}`);

for (const marker of [
  "from '../find-anything/find-anything-model.ts'",
  'buildR2FindAnythingResults',
  'data-zero-lost-stage="R2.0-8"',
  'data-zero-lost-search="R2.0-8"',
  'data-find-kind={item.kind}',
  'openTransaction={openTransaction}',
  'R2.0-8 Find Anything',
]) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing active R2.0-8 integration marker: ${marker}`);

for (const width of [1280, 430, 390, 360, 320]) if (!browser.includes(String(width))) errors.push(`R2.0-8 browser proof missing hard width ${width}`);
for (const marker of [
  'NO_MAZE_SCENARIOS',
  'NO_MAZE_SCENARIOS.length !== 16',
  'actions > 3',
  'canonical feature alias navigation restores exact search state on back',
  'transaction record discovery opens canonical 360 and back restores query',
  'Arabic normalization survives hamza, tatweel and mixed input',
  'No-Maze reaches Transactions from Home in 1 action',
  'No-Maze reaches Today from Home in 1 action',
  'No-Maze reaches More from Home in 1 action',
  'No-Maze reaches Create from Home in 1 action',
  'No-Maze reaches Companies through More in 2 actions',
  'No-Maze reaches People by lawyer alias in 2 actions',
  'No-Maze reaches Finance by payment alias in 2 actions',
  'No-Maze reaches Command Center by command alias in 2 actions',
  'data-find-kind="transaction"',
  'data-find-source="preview-record"',
  'assertNoHorizontalOverflow',
  'assertTouchTargets',
]) if (!browser.includes(marker)) errors.push(`R2.0-8 browser proof missing scenario marker: ${marker}`);

const globalSearch = (parity.capabilities ?? []).find((item) => item.id === 'global.search');
if (!globalSearch) errors.push('Feature Parity is missing global.search');

if (state.findAnythingZeroLost?.status === 'CLOSED') {
  if (state.findAnythingZeroLost?.exitGatePassed !== true || evidence.exitGatePassed !== true) errors.push('closed R2.0-8 requires exit gate PASS');
  if (state.noMaze?.validated !== true || state.noMaze?.scenarioCount < 15 || state.noMaze?.passedCount !== state.noMaze?.scenarioCount) errors.push('closed R2.0-8 requires full No-Maze scenario proof');
  if (state.noMaze?.scenarioCount !== 16 || state.noMaze?.passedCount !== 16) errors.push('R2.0-8 closure is pinned to the 16-scenario browser proof');
  if (evidence.zeroLost?.scenarioCount !== 16 || evidence.zeroLost?.passedCount !== 16) errors.push('closed evidence must pin all 16 No-Maze scenarios');
  if (evidence.authoritativeRecordProvider !== paths.connected) errors.push('closed R2.0-8 evidence must pin the authoritative Data Layer provider');
  if (globalSearch?.migrated !== true || globalSearch?.tested !== true) errors.push('closed R2.0-8 requires global.search migrated and tested');
}

if (errors.length) {
  console.error(`ENJAZ R2.0-8 ZERO-LOST AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0-8 ZERO-LOST AUDIT PASS — ${state.findAnythingZeroLost?.status}; authoritative discovery, canonical-home and 16-scenario No-Maze locks are fail-closed.`);
}
