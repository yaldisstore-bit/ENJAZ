import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const errors = [];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json',
  parity: 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_LEGACY_ERADICATION_EVIDENCE.json',
  kickoff: 'docs/R2_0_10_LEGACY_ERADICATION_KICKOFF.md',
  main: 'src/main.tsx',
};

for (const [name, rel] of Object.entries(paths)) {
  if (!exists(rel)) errors.push(`missing R2.0-10 ${name}: ${rel}`);
}

const protectedBoundaries = ['src/core', 'src/data', 'src/features', 'src/shared', 'src/ui-r2', 'database'];
for (const rel of protectedBoundaries) {
  if (!exists(rel)) errors.push(`protected business/data boundary is missing: ${rel}`);
}

if (errors.length) {
  console.error('ENJAZ R2.0-10 LEGACY ERADICATION AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json(paths.state);
const parity = json(paths.parity);
const evidence = json(paths.evidence);
const kickoff = read(paths.kickoff);
const main = read(paths.main);

if (state.stage !== 'R2.0-10') errors.push(`R2.0-10 guard requires state.stage R2.0-10, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during R2.0-10');
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 during R2.0-10');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('promotion must remain blocked during R2.0-10');
if (state.destructionRealityQa?.status !== 'CLOSED' || state.destructionRealityQa?.exitGatePassed !== true) errors.push('R2.0-9 must remain CLOSED with exit gate PASS');
if (state.noMaze?.validated !== true || state.noMaze?.scenarioCount < 15 || state.noMaze?.passedCount !== state.noMaze?.scenarioCount) errors.push('full No-Maze proof must remain preserved before legacy deletion');
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx may not boot UiR2Root before R2.0-11');

if (evidence.schemaVersion !== 1 || evidence.stage !== 'R2.0-10') errors.push('R2.0-10 evidence schema/stage mismatch');
if (!['ACTIVE_PREFLIGHT', 'ACTIVE_ERADICATION', 'CLOSED'].includes(evidence.status)) errors.push(`unsupported R2.0-10 evidence status: ${evidence.status}`);
if (state.legacyEradication?.status !== evidence.status) errors.push('state/evidence R2.0-10 status mismatch');

const capabilities = Array.isArray(parity.capabilities) ? parity.capabilities : [];
if (capabilities.length !== 35) errors.push(`R2.0-10 requires frozen 35-capability inventory, found ${capabilities.length}`);
const unresolved = capabilities.filter((cap) => cap?.migrated !== true || cap?.tested !== true);
const liveAuthoritative = unresolved.filter((cap) => String(cap?.deliveryStatus ?? '').startsWith('live_authoritative'));
const presentationResolution = unresolved.filter((cap) => !String(cap?.deliveryStatus ?? '').startsWith('live_authoritative'));

if (state.featureParity?.totalCapabilities !== capabilities.length) errors.push('state feature-parity total must match inventory');
if (state.legacyEradication?.parityBlockerCount !== unresolved.length) errors.push(`state parityBlockerCount must match actual unresolved count ${unresolved.length}`);
if (state.legacyEradication?.liveAuthoritativeBlockerCount !== liveAuthoritative.length) errors.push(`state liveAuthoritativeBlockerCount must match actual ${liveAuthoritative.length}`);
if (state.legacyEradication?.presentationResolutionBlockerCount !== presentationResolution.length) errors.push(`state presentationResolutionBlockerCount must match actual ${presentationResolution.length}`);

const uiV2Exists = exists('src/ui-v2');
const uiRebirthExists = exists('src/ui-rebirth');

// The current canonical ui-v2 must not be physically deleted while authoritative capability parity is incomplete.
if (!uiV2Exists && liveAuthoritative.length > 0) {
  errors.push(`src/ui-v2 was deleted while ${liveAuthoritative.length} live-authoritative parity blocker(s) remain`);
}
if (state.legacyEradication?.uiV2Eradicated === uiV2Exists) errors.push('state uiV2Eradicated flag does not match filesystem reality');
if (state.legacyEradication?.uiRebirthEradicated === uiRebirthExists) errors.push('state uiRebirthEradicated flag does not match filesystem reality');

for (const marker of [
  'src/ui-rebirth',
  'src/ui-v2',
  '35 / 35',
  'Canonical promotion belongs only to R2.0-11',
  'broken intermediate canonical `main` must never be merged',
]) {
  if (!kickoff.includes(marker)) errors.push(`kickoff missing hard Legacy Eradication marker: ${marker}`);
}

if (state.legacyEradication?.status === 'ACTIVE_ERADICATION') {
  if (liveAuthoritative.length !== 0) errors.push('physical eradication cannot start while live-authoritative parity blockers remain');
}

if (state.legacyEradication?.status === 'CLOSED') {
  if (unresolved.length !== 0) errors.push('closed R2.0-10 requires all 35 capabilities migrated and tested');
  if (uiV2Exists) errors.push('closed R2.0-10 requires physical removal of src/ui-v2');
  if (uiRebirthExists) errors.push('closed R2.0-10 requires physical removal of src/ui-rebirth');
  if (state.featureParity?.migratedCapabilities !== capabilities.length) errors.push('closed R2.0-10 requires 100% migrated feature parity');
  if (state.featureParity?.testedCapabilities !== capabilities.length) errors.push('closed R2.0-10 requires 100% tested feature parity');
  if (state.featureParity?.unresolvedCapabilities !== 0) errors.push('closed R2.0-10 requires zero unresolved capabilities');
  if (state.legacy?.eradicated !== true) errors.push('closed R2.0-10 requires legacy.eradicated=true');
  if (state.legacyEradication?.legacyZero !== true || state.legacyEradication?.exitGatePassed !== true || evidence.exitGatePassed !== true) errors.push('closed R2.0-10 requires Legacy-Zero exit gate PASS');
}

if (errors.length) {
  console.error(`ENJAZ R2.0-10 LEGACY ERADICATION AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0-10 LEGACY ERADICATION AUDIT PASS — ${state.legacyEradication?.status}; blockers=${unresolved.length}, live-authoritative=${liveAuthoritative.length}, ui-rebirth=${uiRebirthExists ? 'present' : 'absent'}, ui-v2=${uiV2Exists ? 'present' : 'absent'}.`);
}
