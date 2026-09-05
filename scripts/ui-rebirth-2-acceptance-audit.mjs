import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
const errors = [];

const stageOrder = [
  'R2.0-0',
  'R2.0-1',
  'R2.0-2',
  'R2.0-3',
  'R2.0-4',
  'R2.0-5',
  'R2.0-6',
  'R2.0-7',
  'R2.0-8',
  'R2.0-9',
  'R2.0-10',
  'R2.0-11',
];

for (const required of [
  'docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md',
  'docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md',
  'docs/UI_UX_REBIRTH_2_0_STATE.json',
  'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
]) {
  if (!exists(required)) errors.push(`missing required Rebirth 2.0 governance artifact: ${required}`);
}

if (errors.length) {
  console.error('ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const plan = read('docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md');
const contract = read('docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md');
const state = readJson('docs/UI_UX_REBIRTH_2_0_STATE.json');
const parity = readJson('docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json');
const main = read('src/main.tsx');

for (const marker of [
  'Beauty Gate',
  'Professional UX / No-Maze Gate',
  'Golden Experience',
  'Legacy-Zero',
  'Feature Parity',
  'R2.0-11',
]) {
  if (!plan.includes(marker) && !contract.includes(marker)) {
    errors.push(`governance is missing hard acceptance marker: ${marker}`);
  }
}

if (state.schemaVersion !== 1) errors.push('unsupported UI_UX_REBIRTH_2_0_STATE schemaVersion');
if (!stageOrder.includes(state.stage)) errors.push(`unknown Rebirth stage: ${state.stage}`);
const stageIndex = stageOrder.indexOf(state.stage);

if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during Rebirth 2.0');
if (state.noMaze?.maxMajorCapabilityActions !== 3) errors.push('No-Maze max major capability actions must remain exactly 3');
if (state.legacy?.presentationIsolationEnforced !== true) errors.push('presentation isolation must remain enforced');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// New UI is isolated from old presentation DNA from the first line of implementation.
const uiR2 = path.join(root, 'src', 'ui-r2');
for (const file of walk(uiR2)) {
  if (!/\.(?:ts|tsx|js|jsx|mjs|css)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  if (/from\s+['"][^'"]*ui-v2|import\s+['"][^'"]*ui-v2|from\s+['"][^'"]*ui-rebirth|import\s+['"][^'"]*ui-rebirth/i.test(text)) {
    errors.push(`${rel}: Rebirth 2.0 may not import old presentation generations`);
  }
  for (const forbidden of ['ez-domain-rail', 'domain-explorer', 'onBrandAction']) {
    if (text.includes(forbidden)) errors.push(`${rel}: forbidden legacy presentation DNA marker: ${forbidden}`);
  }
}

// R2.0-0 must produce the complete inventory before R2.0-1 may begin.
if (stageIndex >= 1) {
  if (parity.inventoryComplete !== true || state.featureParity?.inventoryComplete !== true) {
    errors.push('cannot advance beyond R2.0-0 before feature inventory is complete');
  }
  if (!Array.isArray(parity.capabilities) || parity.capabilities.length === 0) {
    errors.push('completed feature inventory must contain at least one capability');
  }
  const ids = new Set();
  for (const cap of parity.capabilities ?? []) {
    if (!cap?.id || typeof cap.id !== 'string') errors.push('every parity capability requires a stable string id');
    else if (ids.has(cap.id)) errors.push(`duplicate capability id: ${cap.id}`);
    else ids.add(cap.id);
    if (!cap?.oldEntryPoint) errors.push(`${cap?.id ?? 'unknown capability'} missing oldEntryPoint`);
    if (!cap?.newCanonicalHome) errors.push(`${cap?.id ?? 'unknown capability'} missing newCanonicalHome`);
    if (!cap?.dataBoundary) errors.push(`${cap?.id ?? 'unknown capability'} missing dataBoundary`);
  }
  if (state.featureParity.totalCapabilities !== parity.capabilities.length) {
    errors.push('state totalCapabilities must equal parity capability count');
  }
}

// The Design System must be frozen before shell work is declared complete / Golden work begins.
if (stageIndex >= 3) {
  const manifestPath = 'docs/UI_UX_REBIRTH_2_0_DESIGN_SYSTEM_MANIFEST.json';
  if (!exists(manifestPath)) errors.push(`stage ${state.stage} requires ${manifestPath}`);
  else {
    const manifest = readJson(manifestPath);
    if (manifest.status !== 'FROZEN') errors.push('Rebirth 2.0 Design System manifest must be FROZEN before shell completion');
  }
}

// Golden Experience cannot be declared until the parallel R2 runtime exists.
if (stageIndex >= 4 && !exists('src/ui-r2/runtime/UiR2Root.tsx')) {
  errors.push(`stage ${state.stage} requires a real parallel src/ui-r2/runtime/UiR2Root.tsx`);
}

// No broad migration after Golden without explicit approval and evidence.
if (stageIndex >= 5) {
  const g = state.goldenExperience ?? {};
  if (g.implemented !== true) errors.push('Golden Experience must be implemented before broad migration');
  if (g.visualEvidenceReady !== true) errors.push('Beauty Gate visual evidence must be ready before broad migration');
  if (g.professionalUxEvidenceReady !== true) errors.push('Golden Professional UX evidence must be ready before broad migration');
  if (g.userApproved !== true) errors.push('explicit user approval is required before broad migration');
  if (!g.approvedCommit || typeof g.approvedCommit !== 'string') errors.push('Golden approval must be pinned to a concrete commit');
  if (!g.approvalRecord || !exists(g.approvalRecord)) errors.push('Golden approval record file is missing');
  if (!g.evidenceManifest || !exists(g.evidenceManifest)) errors.push('Golden evidence manifest file is missing');
}

// Full No-Maze proof must be complete before legacy eradication begins.
if (stageIndex >= 10) {
  const n = state.noMaze ?? {};
  if (n.validated !== true) errors.push('No-Maze must be validated before Legacy Eradication');
  if (n.scenarioCount < 15) errors.push('No-Maze requires at least 15 real task scenarios');
  if (n.passedCount !== n.scenarioCount) errors.push('all No-Maze scenarios must pass');
  if (n.hiddenPrimaryNavigationCount !== 0) errors.push('hidden primary navigation count must be zero');
  if (n.duplicateCanonicalHomesCount !== 0) errors.push('duplicate canonical homes count must be zero');
  if (n.backPathFailures !== 0) errors.push('back-path failures must be zero');
  if (!n.evidenceManifest || !exists(n.evidenceManifest)) errors.push('No-Maze evidence manifest file is missing');
}

const mainUsesR2 = /ui-r2\/runtime\/UiR2Root/.test(main);
const mainUsesLegacyPresentation = /ui-v2|ui-rebirth/.test(main);

// Canonical runtime cutover is fail-closed. The main entrypoint may not move early.
if (mainUsesR2) {
  if (state.stage !== 'R2.0-11') errors.push('src/main.tsx may boot UiR2Root only at R2.0-11 canonical promotion');
  if (state.promotion?.requested !== true || state.promotion?.allowed !== true) {
    errors.push('UiR2Root canonical runtime requires promotion.requested=true and promotion.allowed=true');
  }
}

if (state.runtime === 'ui-r2' && !mainUsesR2) errors.push('state runtime=ui-r2 but src/main.tsx does not boot UiR2Root');
if (state.runtime === 'ui-v2' && mainUsesR2) errors.push('state runtime=ui-v2 but src/main.tsx already boots UiR2Root');

// Final promotion = Beauty + UX + 100% parity + physical legacy deletion.
if (state.stage === 'R2.0-11' || state.promotion?.requested === true || state.promotion?.allowed === true) {
  const g = state.goldenExperience ?? {};
  const f = state.featureParity ?? {};
  const n = state.noMaze ?? {};

  if (g.userApproved !== true || g.visualEvidenceReady !== true || g.professionalUxEvidenceReady !== true) {
    errors.push('promotion requires approved Beauty + Professional UX Golden Experience');
  }
  if (f.inventoryComplete !== true || f.totalCapabilities <= 0) errors.push('promotion requires complete non-empty feature inventory');
  if (f.migratedCapabilities !== f.totalCapabilities) errors.push('promotion requires 100% migrated feature parity');
  if (f.testedCapabilities !== f.totalCapabilities) errors.push('promotion requires 100% tested feature parity');
  if (f.unresolvedCapabilities !== 0) errors.push('promotion requires zero unresolved capabilities');
  if (n.validated !== true || n.scenarioCount < 15 || n.passedCount !== n.scenarioCount) errors.push('promotion requires full No-Maze proof');
  if (state.legacy?.eradicated !== true) errors.push('promotion requires Legacy-Zero eradicated=true');
  if (exists('src/ui-v2')) errors.push('promotion forbidden while src/ui-v2 still exists');
  if (exists('src/ui-rebirth')) errors.push('promotion forbidden while src/ui-rebirth still exists');
  if (mainUsesLegacyPresentation) errors.push('promotion forbidden while src/main.tsx imports legacy presentation');
  if (!mainUsesR2) errors.push('promotion requires src/main.tsx to boot UiR2Root');
}

// Before final promotion, current canonical UI remains the live runtime.
if (stageIndex < 11 && state.runtime !== 'ui-v2') {
  errors.push('canonical runtime must remain ui-v2 until R2.0-11 promotion');
}

if (errors.length) {
  console.error('ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT PASS — ${state.stage}; Beauty + Professional UX + parity + Legacy-Zero promotion locks are fail-closed.`);
}
