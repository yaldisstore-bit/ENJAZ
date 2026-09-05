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
  parity: 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_OPERATIONAL_INTELLIGENCE_EVIDENCE.json',
  component: 'src/ui-r2/operational-intelligence/OperationalIntelligenceExperience.tsx',
  css: 'src/ui-r2/operational-intelligence/operational-intelligence.css',
  root: 'src/ui-r2/runtime/UiR2Root.tsx',
  preview: 'src/ui-r2/preview-main.tsx',
  main: 'src/main.tsx',
};

for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-7 ${name}: ${file}`);
if (errors.length) {
  console.error('ENJAZ R2.0-7 OPERATIONAL INTELLIGENCE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json(paths.state);
const parity = json(paths.parity);
const evidence = json(paths.evidence);
const component = read(paths.component);
const css = read(paths.css);
const uiRoot = read(paths.root);
const preview = read(paths.preview);
const main = read(paths.main);

if (state.stage !== 'R2.0-7') errors.push(`operational guard requires stage R2.0-7, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 during R2.0-7');
if (state.goldenExperience?.status !== 'APPROVED' || state.goldenExperience?.userApproved !== true) errors.push('R2.0-7 requires approved Golden identity');
if (state.coreWorkMigration?.status !== 'CLOSED' || state.coreWorkMigration?.exitGatePassed !== true) errors.push('R2.0-5 must remain closed');
if (state.recordsRelationships?.status !== 'CLOSED' || state.recordsRelationships?.exitGatePassed !== true) errors.push('R2.0-6 must remain closed before R2.0-7');
if (!['ACTIVE', 'CLOSED'].includes(state.operationalIntelligence?.status)) errors.push('operationalIntelligence status must be ACTIVE or CLOSED');
if (state.operationalIntelligence?.taskAppropriateComposition !== true) errors.push('R2.0-7 requires task-appropriate composition');
if (state.operationalIntelligence?.canonicalRuntimeChanged !== false) errors.push('R2.0-7 cannot change canonical runtime');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('canonical promotion must remain blocked');
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx must not boot UiR2Root before R2.0-11');

const expectedScope = ['finance', 'operations', 'workflow', 'automation', 'command', 'risk', 'copilot'];
const expectedCapabilities = ['finance.workspace', 'operations.workspace', 'workflow.workspace', 'automation.workspace', 'command.workspace', 'risk.workspace', 'copilot.workspace'];
if (evidence.stage !== 'R2.0-7') errors.push('operational evidence stage must be R2.0-7');
if (JSON.stringify(evidence.scope) !== JSON.stringify(expectedScope)) errors.push('R2.0-7 scope drifted');
if (JSON.stringify(evidence.targetCapabilities) !== JSON.stringify(expectedCapabilities)) errors.push('R2.0-7 target capabilities drifted');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify([1280, 430, 390, 360, 320])) errors.push('R2.0-7 hard widths drifted');
if (evidence.composition?.taskAppropriate !== true || evidence.composition?.universalDashboardForbidden !== true) errors.push('task-appropriate composition contract drifted');
if (evidence.truthfulness?.canonicalRuntimeChanged !== false || evidence.truthfulness?.phase55Locked !== true) errors.push('R2.0-7 truthfulness boundary drifted');
for (const key of ['productionWritesClaimedByPreview', 'generatedIntelligenceClaimedByPreview', 'automationMutationClaimedByPreview', 'financialMutationClaimedByPreview', 'aiExecutionClaimedByPreview']) if (evidence.truthfulness?.[key] !== false) errors.push(`R2.0-7 truthfulness flag must remain false: ${key}`);

const parityById = new Map((parity.capabilities ?? []).map((item) => [item.id, item]));
for (const id of expectedCapabilities) if (!parityById.has(id)) errors.push(`unknown parity capability: ${id}`);

for (const marker of [
  'data-operational-domain="finance"',
  'data-operational-domain="operations"',
  'data-operational-domain="workflow"',
  'data-operational-domain="automation"',
  'data-operational-domain="command"',
  'data-operational-domain="risk"',
  'data-operational-domain="copilot"',
  'دفتر اليوم',
  'ما يحتاج حركة الآن',
  'مراحل سير العمل',
  'مشغّل',
  'قرار اليوم',
  'لماذا ظهرت؟',
  'لا يدّعي استدعاء نموذج',
  'لا تدّعي بيانات إنتاج',
]) if (!component.includes(marker)) errors.push(`operational component missing required marker: ${marker}`);

for (const forbidden of ['ui-v2', 'ui-rebirth']) if (component.includes(forbidden)) errors.push(`operational component references legacy presentation marker: ${forbidden}`);
if (/\b(?:fetch|localStorage|sessionStorage)\s*\(/.test(component)) errors.push('operational presentation may not create ad-hoc persistence/data channels');

for (const marker of [
  "../operational-intelligence/OperationalIntelligenceExperience.tsx",
  "id === 'finance' || id === 'operations' || id === 'workflow' || id === 'automation' || id === 'command' || id === 'risk' || id === 'copilot'",
  'data-operational-stage="R2.0-7"',
  'R2.0-7 Operational',
]) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing R2.0-7 integration marker: ${marker}`);
if (!preview.includes("'./operational-intelligence/operational-intelligence.css'")) errors.push('preview must load R2.0-7 operational CSS');

for (const marker of ['.r2-ledger-list', '.r2-operations-pulse', '.r2-workflow-lanes', '.r2-automation-flow', '.r2-command-focus', '.r2-risk-map', '.r2-copilot-thread', 'border-radius', 'box-shadow', '@media (max-width: 42rem)', '@media (max-width: 22rem)', '@media (prefers-reduced-motion: reduce)']) if (!css.includes(marker)) errors.push(`operational CSS missing composition/resilience marker: ${marker}`);
const rawColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColors.length) errors.push(`operational CSS contains raw color literals: ${[...new Set(rawColors)].join(', ')}`);
if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(css)) errors.push('operational CSS contains forbidden functional color syntax');
if (css.includes('!important')) errors.push('operational CSS may not use !important');

if (state.operationalIntelligence?.status === 'CLOSED') {
  if (state.operationalIntelligence?.exitGatePassed !== true || evidence.exitGatePassed !== true || evidence.status !== 'CLOSED') errors.push('closed R2.0-7 requires closed evidence and exit gate PASS');
  const migrated = new Set((parity.capabilities ?? []).filter((item) => item.migrated === true).map((item) => item.id));
  const tested = new Set((parity.capabilities ?? []).filter((item) => item.tested === true).map((item) => item.id));
  for (const id of expectedCapabilities) {
    if (!migrated.has(id)) errors.push(`closed R2.0-7 capability not marked migrated: ${id}`);
    if (!tested.has(id)) errors.push(`closed R2.0-7 capability not marked tested: ${id}`);
  }
}

if (errors.length) {
  console.error(`ENJAZ R2.0-7 OPERATIONAL INTELLIGENCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0-7 OPERATIONAL INTELLIGENCE AUDIT PASS — ${state.operationalIntelligence?.status}; seven task-specific workspaces stay truthful, responsive and isolated.`);
}
