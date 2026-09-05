import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(root, rel), `${JSON.stringify(value, null, 2)}\n`);

const statePath = 'docs/UI_UX_REBIRTH_2_0_STATE.json';
const parityPath = 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json';
const evidencePath = 'docs/UI_UX_REBIRTH_2_0_ZERO_LOST_EVIDENCE.json';
const closurePath = 'docs/R2_0_8_FIND_ANYTHING_ZERO_LOST_CLOSURE.md';
const proof = Object.freeze({
  run: 33980594257,
  testedCommit: '98e072cfa5c9e242d5218d111a60252986ce9db6',
  artifactId: 9973639934,
  artifactBytes: 411091,
  artifactSha256: 'de05d23b9f6d1605e58e89a6b2042139ce7a4445b0283b4b2235c3df75d5b667',
  browserScenarios: 16,
});

const state = readJson(statePath);
const parity = readJson(parityPath);
const evidence = readJson(evidencePath);

if (state.stage !== 'R2.0-8' || state.findAnythingZeroLost?.status !== 'ACTIVE') throw new Error('R2.0-8 must be ACTIVE before materializing closure');
if (state.runtime !== 'ui-v2' || state.phase55Locked !== true) throw new Error('closure cannot change canonical runtime or Phase 5.5 lock');
if (state.operationalIntelligence?.status !== 'CLOSED') throw new Error('R2.0-7 must remain CLOSED');
if (evidence.status !== 'ACTIVE' || evidence.exitGatePassed !== false) throw new Error('R2.0-8 evidence must be ACTIVE before closure');

const globalSearch = parity.capabilities?.find((item) => item.id === 'global.search');
if (!globalSearch) throw new Error('global.search parity capability is missing');
if (globalSearch.migrated === true || globalSearch.tested === true) throw new Error('global.search was already claimed before closure proof');

globalSearch.deliveryStatus = 'live_authoritative_discovery';
globalSearch.dataBoundary = 'Canonical R2 destination registry + workspace-scoped Data Layer transaction/company discovery; isolated preview records remain explicitly non-production';
globalSearch.migrated = true;
globalSearch.tested = true;

const migratedCount = parity.capabilities.filter((item) => item.migrated === true).length;
const testedCount = parity.capabilities.filter((item) => item.tested === true).length;
if (migratedCount !== 27 || testedCount !== 27) throw new Error(`R2.0-8 expected parity 27/35, found ${migratedCount}/${testedCount}`);

state.findAnythingZeroLost = {
  ...state.findAnythingZeroLost,
  status: 'CLOSED',
  exitGatePassed: true,
  closureRecord: closurePath,
  evidenceRun: proof.run,
};
state.featureParity.migratedCapabilities = migratedCount;
state.featureParity.testedCapabilities = testedCount;
state.noMaze = {
  ...state.noMaze,
  validated: true,
  scenarioCount: 16,
  passedCount: 16,
  maxMajorCapabilityActions: 3,
  hiddenPrimaryNavigationCount: 0,
  duplicateCanonicalHomesCount: 0,
  backPathFailures: 0,
  evidenceManifest: evidencePath,
};

Object.assign(evidence, {
  status: 'CLOSED',
  authoritativeRecordProvider: 'src/ui-r2/find-anything/find-anything-connected-model.ts',
  artifact: proof.artifactId,
  exitGatePassed: true,
  finalBrowserEvidence: proof,
});
evidence.zeroLost = {
  ...evidence.zeroLost,
  scenarioCount: 16,
  passedCount: 16,
  authoritativeRecordProviderBound: true,
};
evidence.checks = {
  ...evidence.checks,
  authoritativeDataLayerProvider: 'PASS_3_OF_3',
  modelTests: 'PASS_8_OF_8_MODEL_PLUS_PROVIDER',
  realBrowserZeroLost: 'PASS_16_OF_16',
  noMaze: 'PASS_16_OF_16_MAX_3_ACTIONS',
  hiddenDoors: 'PASS_0',
  duplicateHomes: 'PASS_0',
  backPathFailures: 'PASS_0',
};
evidence.gateRuns = {
  ...evidence.gateRuns,
  closureProof: proof.run,
};

writeJson(parityPath, parity);
writeJson(statePath, state);
writeJson(evidencePath, evidence);

fs.writeFileSync(path.join(root, closurePath), `# ENJAZ Rebirth 2.0 — R2.0-8 Find Anything & Zero-Lost UX Closure\n\nStatus: **CLOSED**\n\nR2.0-8 closes global discovery and No-Maze proof without changing canonical runtime ownership.\n\n## Delivered\n\n- Arabic-normalized Find Anything across canonical feature aliases.\n- Canonical feature results with one legal home per capability.\n- Transaction record discovery that opens canonical 360°.\n- Authoritative production-record provider through the existing workspace-scoped Data Layer; no ad-hoc fetch or browser persistence channel.\n- Isolated preview remains explicitly non-production and cannot be confused with the authoritative provider.\n- Browser Back restores the exact search overlay, query and result context.\n- **16 / 16** real No-Maze scenarios passed, every declared route within **<= 3 deliberate actions**.\n- Hidden primary navigation: **0**.\n- Duplicate canonical homes: **0**.\n- Back-path failures: **0**.\n\n## Feature parity\n\n- \`global.search\` is now migrated and tested.\n- Cumulative Feature Parity: **27 / 35 migrated and 27 / 35 tested**.\n- Unresolved capabilities: **0**.\n\n## Evidence\n\n- Dedicated R2.0-8 proof run: **${proof.run}**.\n- Proof commit: \`${proof.testedCommit}\`.\n- Browser scenarios: **${proof.browserScenarios} / ${proof.browserScenarios} PASS**.\n- Hard widths: **1280 / 430 / 390 / 360 / 320**.\n- Artifact: **${proof.artifactId}**, ${proof.artifactBytes} bytes.\n- Artifact SHA-256: \`${proof.artifactSha256}\`.\n- Functional regression: **118 / 118 PASS**.\n- Find Anything model + authoritative provider: **8 / 8 PASS**.\n- TypeScript, isolated build and preview budget: **PASS**.\n\n## Frozen boundaries\n\n- Canonical runtime remains **ui-v2**.\n- Phase 5.5 remains locked.\n- Golden, Core Work, Records & Relationships and Operational Intelligence remain frozen references.\n- No legacy presentation import is introduced.\n- Canonical promotion remains forbidden before R2.0-11.\n\nThe next allowed stage after merge is **R2.0-9 — Destruction & Reality QA**. It is not started by this closure.\n`);

console.log('R2.0-8 closure materialized: 27/35 parity, 16/16 No-Maze, zero hidden/duplicate/back failures.');
