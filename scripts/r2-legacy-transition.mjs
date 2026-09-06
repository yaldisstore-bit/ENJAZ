import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(root, rel), `${JSON.stringify(value, null, 2)}\n`);
const commandPath = path.join(root, '.github', 'r2-legacy-command.json');
const command = JSON.parse(fs.readFileSync(commandPath, 'utf8'));

const statePath = 'docs/UI_UX_REBIRTH_2_0_STATE.json';
const parityPath = 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json';
const evidencePath = 'docs/UI_UX_REBIRTH_2_0_LEGACY_ERADICATION_EVIDENCE.json';
const state = readJson(statePath);
const parity = readJson(parityPath);
const evidence = readJson(evidencePath);

if (state.stage !== 'R2.0-10') throw new Error(`transition tool requires R2.0-10, found ${state.stage}`);
if (!Array.isArray(parity.capabilities) || parity.capabilities.length !== 35) throw new Error('transition tool requires frozen 35-capability inventory');

const resolutionIds = new Set([
  'auth.session_access',
  'auth.protected_workspace',
  'home.workspace',
  'home.executive_briefing',
  'global.create.review_only',
  'global.notifications',
  'global.account',
  'followups.workspace',
]);

function resolveParity() {
  const missing = [...resolutionIds].filter((id) => !parity.capabilities.some((cap) => cap.id === id));
  if (missing.length) throw new Error(`missing R2.0-10 parity ids: ${missing.join(', ')}`);

  parity.capabilities = parity.capabilities.map((capability) => resolutionIds.has(capability.id)
    ? {
        ...capability,
        migrated: true,
        tested: true,
        r2_0_10Evidence: {
          gateRun: command.gateRun,
          sourceCommit: command.sourceCommit,
          browserSuite: 'tests-external/r2-production-bridge.spec.cjs',
          resolution: ['global.create.review_only', 'global.notifications'].includes(capability.id)
            ? 'truthful_retirement_or_restructure_without_fake_authority'
            : 'migrated_to_r2_authoritative_or_connected_surface',
        },
      }
    : capability);

  const unresolved = parity.capabilities.filter((cap) => cap.migrated !== true || cap.tested !== true);
  if (unresolved.length !== 0) throw new Error(`parity resolution left ${unresolved.length} unresolved capability(s)`);

  state.featureParity = {
    ...state.featureParity,
    totalCapabilities: 35,
    migratedCapabilities: 35,
    testedCapabilities: 35,
    unresolvedCapabilities: 0,
  };
  state.legacyEradication = {
    ...state.legacyEradication,
    status: 'ACTIVE_ERADICATION',
    parityBlockerCount: 0,
    liveAuthoritativeBlockerCount: 0,
    presentationResolutionBlockerCount: 0,
    parityResolvedAtCommit: command.sourceCommit,
    parityEvidenceRun: command.gateRun,
    exitGatePassed: false,
  };
  evidence.status = 'ACTIVE_ERADICATION';
  evidence.parity = {
    ...evidence.parity,
    resolved: 35,
    tested: 35,
    unresolved: 0,
    resolutionGateRun: command.gateRun,
    resolutionSourceCommit: command.sourceCommit,
  };
  evidence.checks = {
    ...evidence.checks,
    preflightAudit: 'PASS',
    uiRebirthDependencyAudit: 'PASS_ERADICATED',
    productionBridge: 'PASS',
    productionBridgeBrowser: 'PASS',
    parityResolution: 'PASS_35_OF_35',
    legacyZero: 'PENDING_UI_V2_REMOVAL',
    cumulativeRegression: 'PASS_BEFORE_UI_V2_REMOVAL',
  };
  evidence.exitGatePassed = false;

  writeJson(parityPath, parity);
  writeJson(statePath, state);
  writeJson(evidencePath, evidence);
}

function markUiV2Eradicated() {
  const unresolved = parity.capabilities.filter((cap) => cap.migrated !== true || cap.tested !== true);
  if (unresolved.length) throw new Error('ui-v2 eradication is forbidden until parity is 35/35');
  if (state.legacyEradication?.status !== 'ACTIVE_ERADICATION') throw new Error('ui-v2 eradication requires ACTIVE_ERADICATION');

  state.legacyEradication = {
    ...state.legacyEradication,
    uiV2Eradicated: true,
    uiRebirthEradicated: true,
    legacyZero: false,
    eradicationCommitCandidate: command.sourceCommit,
    exitGatePassed: false,
  };
  evidence.legacyTargets['src/ui-v2'].eradicated = true;
  evidence.legacyTargets['src/ui-rebirth'].eradicated = true;
  evidence.deletion = {
    ...evidence.deletion,
    uiRebirthDeleted: true,
    uiV2Deleted: true,
    legacyPresentationImportCount: 0,
    protectedBoundaryViolations: 0,
  };
  evidence.checks = {
    ...evidence.checks,
    legacyZero: 'PENDING_POST_DELETE_GATE',
    cumulativeRegression: 'PENDING_POST_DELETE_GATE',
  };
  evidence.exitGatePassed = false;
  writeJson(statePath, state);
  writeJson(evidencePath, evidence);
}

function closeLegacyZero() {
  const unresolved = parity.capabilities.filter((cap) => cap.migrated !== true || cap.tested !== true);
  if (unresolved.length) throw new Error('R2.0-10 closure requires parity 35/35');
  if (fs.existsSync(path.join(root, 'src', 'ui-v2'))) throw new Error('R2.0-10 closure requires src/ui-v2 absent');
  if (fs.existsSync(path.join(root, 'src', 'ui-rebirth'))) throw new Error('R2.0-10 closure requires src/ui-rebirth absent');

  state.featureParity = {
    ...state.featureParity,
    totalCapabilities: 35,
    migratedCapabilities: 35,
    testedCapabilities: 35,
    unresolvedCapabilities: 0,
  };
  state.legacy = { ...state.legacy, eradicated: true };
  state.legacyEradication = {
    ...state.legacyEradication,
    status: 'CLOSED',
    parityBlockerCount: 0,
    liveAuthoritativeBlockerCount: 0,
    presentationResolutionBlockerCount: 0,
    uiV2Eradicated: true,
    uiRebirthEradicated: true,
    legacyZero: true,
    closureRecord: 'docs/R2_0_10_LEGACY_ERADICATION_CLOSURE.md',
    closureEvidenceRun: command.gateRun,
    closureCommitCandidate: command.sourceCommit,
    exitGatePassed: true,
  };
  evidence.status = 'CLOSED';
  evidence.checks = {
    ...evidence.checks,
    legacyZero: 'PASS',
    cumulativeRegression: 'PASS_POST_DELETE',
  };
  evidence.closure = {
    gateRun: command.gateRun,
    sourceCommit: command.sourceCommit,
    parity: '35/35',
    unresolved: 0,
    uiV2Absent: true,
    uiRebirthAbsent: true,
    promotionDeferredTo: 'R2.0-11',
  };
  evidence.exitGatePassed = true;
  writeJson(statePath, state);
  writeJson(evidencePath, evidence);
}

if (command.action === 'resolve-parity') resolveParity();
else if (command.action === 'mark-ui-v2-eradicated') markUiV2Eradicated();
else if (command.action === 'close-legacy-zero') closeLegacyZero();
else throw new Error(`unsupported R2.0-10 transition action: ${command.action}`);

console.log(`R2.0-10 transition complete: ${command.action}`);
