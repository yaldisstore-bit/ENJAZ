import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const json = (p) => JSON.parse(read(p));
const errors = [];
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];
const contractPath='docs/UI_UX_REBIRTH_2_0_GLOBAL_VISUAL_POLISH_CONTRACT.json';
const statePath='docs/UI_UX_REBIRTH_2_0_STATE.json';
const cssPath='src/ui-r2/golden/golden.css';
const previewPath='src/ui-r2/preview-main.tsx';
const mainPath='src/main.tsx';
for (const file of [contractPath,statePath,cssPath,previewPath,mainPath,'docs/R2_0_4_GOLDEN_EXPERIENCE_KICKOFF.md']) if (!exists(file)) errors.push(`missing Golden polish artifact: ${file}`);
if (errors.length) { console.error('ENJAZ R2.0-4 GLOBAL VISUAL POLISH GUARD FAIL'); errors.forEach((e)=>console.error(`- ${e}`)); process.exit(1); }

const contract=json(contractPath); const state=json(statePath); const css=read(cssPath); const preview=read(previewPath); const main=read(mainPath); const stageIndex=stageOrder.indexOf(state.stage); const golden=state.goldenExperience??{};
if (contract.schemaVersion!==1 || contract.status!=='LOCKED' || contract.appliesFrom!=='R2.0-4' || contract.scope!=='all-r2-presentation' || contract.goldenFirst!==true) errors.push('global visual polish contract drifted');
for (const key of ['preserveCurrentIdentity','noFullRedesign','noLegacyDnaReintroduction','noPaletteDrift','noBusinessLogicChange','noFeatureRemoval']) if (contract.preservation?.[key]!==true) errors.push(`preservation.${key} must remain true`);
for (const key of ['hierarchy','depth','layerSeparation','softCorners','composition','coherentSinglePage','avoidFlatSingleSurfacePages','restrainedEffects','avoidCardWall']) if (contract.requiredQualities?.[key]!==true) errors.push(`requiredQualities.${key} must remain true`);
if (JSON.stringify(contract.layerModel)!==JSON.stringify(['identity','title','body','status','actions'])) errors.push('visual layer model drifted');
if (stageIndex<4) errors.push(`Golden visual guard requires R2.0-4+, found ${state.stage}`);
if (stageIndex<11 && state.runtime!=='ui-v2') errors.push('machine canonical runtime label stays ui-v2 until R2.0-11');
if (state.phase55Locked!==true) errors.push('Phase 5.5 must remain locked');
if (golden.status!=='APPROVED' || golden.userApproved!==true || golden.visualPolishContract!==contractPath || golden.visualPolishContractLocked!==true) errors.push('approved Golden identity/polish lock drifted');
if (stageIndex<11 && (state.promotion?.requested!==false || state.promotion?.allowed!==false)) errors.push('promotion must remain blocked before R2.0-11');
if (!preview.includes('./golden/golden.css')) errors.push('R2 preview must load Golden polish layer');
for (const [selector,rule] of [['.r2-hero__signal','border-radius: var(--ez-r2-radius-xl)'],['.r2-section-heading--hero','border-radius: var(--ez-r2-radius-xl)'],['.r2-destination-placeholder > p:not(.r2-eyebrow)','border-radius: var(--ez-r2-radius-lg)'],['.r2-record-list','border-radius: var(--ez-r2-radius-xl)'],['.r2-launcher-group','border-radius: var(--ez-r2-radius-xl)'],['.r2-context-preview','border-radius: var(--ez-r2-radius-xl)']]) { if(!css.includes(selector)) errors.push(`missing Golden selector ${selector}`); if(!css.includes(rule)) errors.push(`missing Golden polish rule ${rule}`); }
for (const marker of ['--r2-golden-shadow-soft','--r2-golden-shadow-tight','linear-gradient','var(--ez-r2-surface-warm)','var(--ez-r2-structure)','@media (max-width: 42rem)','@media (prefers-reduced-motion: reduce)']) if(!css.includes(marker)) errors.push(`Golden CSS missing ${marker}`);
const raw=css.match(/#[0-9a-fA-F]{3,8}\b/g)??[]; if(raw.length) errors.push(`Golden CSS raw colors: ${[...new Set(raw)].join(', ')}`);
for (const forbidden of ['ui-v2','ui-rebirth','!important']) if(css.includes(forbidden)) errors.push(`Golden CSS forbidden marker ${forbidden}`);

const uiV2Exists=exists('src/ui-v2'); const mainUsesProductionR2=/ui-r2\/runtime\/UiR2ProductionRoot/.test(main); const mainUsesLegacy=/ui-v2|ui-rebirth/.test(main);
const candidate=state.stage==='R2.0-10' && ['ACTIVE_ERADICATION','CLOSED'].includes(state.legacyEradication?.status) && !uiV2Exists && !exists('src/ui-rebirth') && state.featureParity?.migratedCapabilities===state.featureParity?.totalCapabilities && state.featureParity?.testedCapabilities===state.featureParity?.totalCapabilities && state.featureParity?.unresolvedCapabilities===0 && mainUsesProductionR2 && !mainUsesLegacy && state.promotion?.requested===false && state.promotion?.allowed===false;
if (stageIndex<10 && !/ui-v2\/runtime\/UiV2Root/.test(main)) errors.push('pre-eradication stages must keep ui-v2 live');
if (state.stage==='R2.0-10' && uiV2Exists && !/ui-v2\/runtime\/UiV2Root/.test(main)) errors.push('R2.0-10 must keep ui-v2 live until physical deletion');
if (state.stage==='R2.0-10' && !uiV2Exists && !candidate) errors.push('post-delete Golden preservation requires guarded UiR2ProductionRoot candidate');

if (errors.length) { console.error(`ENJAZ R2.0-4+ GLOBAL VISUAL POLISH GUARD FAIL (${errors.length})`); errors.forEach((e)=>console.error(`- ${e}`)); process.exitCode=1; }
else console.log(`ENJAZ R2.0-4+ GLOBAL VISUAL POLISH GUARD PASS — ${state.stage}; approved identity remains locked through Legacy-Zero.`);
