import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const errors = [];
const paths = { state:'docs/UI_UX_REBIRTH_2_0_STATE.json', parity:'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json', evidence:'docs/UI_UX_REBIRTH_2_0_LEGACY_ERADICATION_EVIDENCE.json', kickoff:'docs/R2_0_10_LEGACY_ERADICATION_KICKOFF.md', main:'src/main.tsx' };
for (const [name,file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-10 ${name}: ${file}`);
for (const p of ['src/core','src/data','src/features','src/shared','src/ui-r2','database']) if (!exists(p)) errors.push(`protected boundary missing: ${p}`);
if (errors.length) { console.error('ENJAZ R2.0-10 LEGACY ERADICATION AUDIT FAIL'); errors.forEach((e)=>console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state); const parity = json(paths.parity); const evidence = json(paths.evidence); const kickoff = read(paths.kickoff); const main = read(paths.main);
if (state.stage !== 'R2.0-10') errors.push(`requires R2.0-10, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.runtime !== 'ui-v2') errors.push('machine canonical runtime label stays ui-v2 until R2.0-11');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('promotion must remain blocked during R2.0-10');
if (state.destructionRealityQa?.status !== 'CLOSED' || state.destructionRealityQa?.exitGatePassed !== true) errors.push('R2.0-9 must remain CLOSED');
if (state.noMaze?.validated !== true || state.noMaze?.scenarioCount < 15 || state.noMaze?.passedCount !== state.noMaze?.scenarioCount) errors.push('No-Maze proof must remain complete');
if (evidence.schemaVersion !== 1 || evidence.stage !== 'R2.0-10' || state.legacyEradication?.status !== evidence.status) errors.push('R2.0-10 state/evidence mismatch');

const capabilities = Array.isArray(parity.capabilities) ? parity.capabilities : [];
if (capabilities.length !== 35) errors.push(`frozen inventory must contain 35 capabilities, found ${capabilities.length}`);
const unresolved = capabilities.filter((cap) => cap?.migrated !== true || cap?.tested !== true);
const liveAuthoritative = unresolved.filter((cap) => String(cap?.deliveryStatus ?? '').startsWith('live_authoritative'));
const presentationResolution = unresolved.filter((cap) => !String(cap?.deliveryStatus ?? '').startsWith('live_authoritative'));
if (state.featureParity?.totalCapabilities !== capabilities.length) errors.push('state parity total drifted');
if (state.featureParity?.migratedCapabilities !== capabilities.filter((c)=>c.migrated===true).length || state.featureParity?.testedCapabilities !== capabilities.filter((c)=>c.tested===true).length || state.featureParity?.unresolvedCapabilities !== unresolved.length) errors.push('state parity counts drifted');
if (state.legacyEradication?.parityBlockerCount !== unresolved.length || state.legacyEradication?.liveAuthoritativeBlockerCount !== liveAuthoritative.length || state.legacyEradication?.presentationResolutionBlockerCount !== presentationResolution.length) errors.push('legacy blocker counts drifted');

const uiV2Exists = exists('src/ui-v2'); const uiRebirthExists = exists('src/ui-rebirth');
if (!uiV2Exists && liveAuthoritative.length) errors.push('ui-v2 deleted before authoritative parity completed');
if (state.legacyEradication?.uiV2Eradicated === uiV2Exists) errors.push('uiV2Eradicated flag must match filesystem');
if (state.legacyEradication?.uiRebirthEradicated === uiRebirthExists) errors.push('uiRebirthEradicated flag must match filesystem');
for (const marker of ['src/ui-rebirth','src/ui-v2','35 / 35','Canonical promotion belongs only to R2.0-11','broken intermediate canonical `main` must never be merged']) if (!kickoff.includes(marker)) errors.push(`kickoff missing marker: ${marker}`);

const mainUsesProductionR2 = /ui-r2\/runtime\/UiR2ProductionRoot/.test(main);
const mainUsesLegacy = /ui-v2|ui-rebirth/.test(main);
if (!uiV2Exists) {
  if (unresolved.length !== 0) errors.push('post-delete candidate requires 35/35 parity');
  if (!mainUsesProductionR2) errors.push('post-delete candidate must boot UiR2ProductionRoot');
  if (mainUsesLegacy) errors.push('post-delete main may not reference legacy presentation');
  if (!['ACTIVE_ERADICATION','CLOSED'].includes(state.legacyEradication?.status)) errors.push('post-delete state must be ACTIVE_ERADICATION or CLOSED');
}
if (uiV2Exists && mainUsesProductionR2) errors.push('R2 production candidate may not boot while ui-v2 still exists');

if (state.legacyEradication?.status === 'ACTIVE_ERADICATION' && liveAuthoritative.length !== 0) errors.push('ACTIVE_ERADICATION requires zero authoritative blockers');
if (state.legacyEradication?.status === 'CLOSED') {
  if (unresolved.length !== 0 || uiV2Exists || uiRebirthExists) errors.push('CLOSED requires 35/35 and both legacy generations absent');
  if (state.legacy?.eradicated !== true) errors.push('CLOSED requires legacy.eradicated=true');
  if (state.legacyEradication?.legacyZero !== true || state.legacyEradication?.exitGatePassed !== true || evidence.exitGatePassed !== true) errors.push('CLOSED requires Legacy-Zero PASS');
  if (!mainUsesProductionR2 || mainUsesLegacy) errors.push('CLOSED requires clean UiR2ProductionRoot candidate');
  if (!state.legacyEradication?.closureRecord || !exists(state.legacyEradication.closureRecord)) errors.push('CLOSED requires closure record');
}

if (errors.length) {
  console.error(`ENJAZ R2.0-10 LEGACY ERADICATION AUDIT FAIL (${errors.length})`);
  errors.forEach((error)=>console.error(`- ${error}`));
  process.exitCode = 1;
} else console.log(`ENJAZ R2.0-10 LEGACY ERADICATION AUDIT PASS — ${state.legacyEradication?.status}; blockers=${unresolved.length}; ui-v2=${uiV2Exists?'present':'absent'}; ui-rebirth=${uiRebirthExists?'present':'absent'}.`);
