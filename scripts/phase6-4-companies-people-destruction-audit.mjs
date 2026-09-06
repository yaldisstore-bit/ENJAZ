import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];
const state = JSON.parse(read('docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json'));
const prior = JSON.parse(read('docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json'));
const kickoff = read('docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const packageJson = JSON.parse(read('package.json'));
const testSource = read('tests/companiesPeopleDestructionGate.test.ts');
const contactService = read('src/features/contacts/contactService.ts');
const workflowPath = '.github/workflows/phase6-4-companies-people-destruction.yml';
const workflow = exists(workflowPath) ? read(workflowPath) : '';
const browserPath = 'tests-external/phase6-4-companies-people-destruction.spec.cjs';
const browser = exists(browserPath) ? read(browserPath) : '';
const closurePath = 'docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_CLOSURE.md';
const closure = exists(closurePath) ? read(closurePath) : '';

if (state.phase !== '6.4' || state.name !== 'Companies & People Destruction Gate') errors.push('Phase 6.4 canonical identity drifted');
if (!['ACTIVE', 'CLOSED'].includes(state.status)) errors.push('Phase 6.4 state must be ACTIVE or CLOSED');
if (state.baseCommit !== 'ce47fb2123608371139953496fdb95f4c82f2a63') errors.push('Phase 6.4 must remain anchored to the certified Phase 6.3 closure main');
if (state.productionJavaScriptBudget !== 670000) errors.push('Phase 6.4 must preserve the 670000-byte production JavaScript budget');
if (state.phase7Allowed !== false) errors.push('Phase 7 must remain locked until canonical Phase 6.4 post-merge recertification completes');
if (prior.status !== 'CLOSED' || prior.exitGatePassed !== true || prior.unresolvedDefectCount !== 0 || prior.postMergeRecertification?.status !== 'COMPLETE' || prior.phase6_4Allowed !== true || prior.nextPhase !== '6.4') errors.push('Phase 6.3 canonical state does not authorize Phase 6.4');

const requiredScope = ['missingRelations','duplicates','hugeNames','mixedLanguageData','largeRelationGraphs','invalidLegacyMappings','cumulativePhase6Regression','realBrowserCompaniesPeopleDestruction'];
for (const item of requiredScope) if (!state.scope?.includes(item)) errors.push(`Phase 6.4 state missing scope: ${item}`);

if (state.status === 'ACTIVE') {
  if (state.exitGatePassed !== false || state.nextPhase !== null) errors.push('ACTIVE Phase 6.4 must fail closed');
  if (exists(closurePath)) errors.push('ACTIVE Phase 6.4 cannot have closure evidence');
}
if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) errors.push('CLOSED Phase 6.4 requires exit gate and zero unresolved defects');
  if (!exists(closurePath)) errors.push('CLOSED Phase 6.4 requires closure evidence');
  if (state.postMergeRecertification?.required !== true || !['PENDING','COMPLETE'].includes(state.postMergeRecertification?.status)) errors.push('CLOSED Phase 6.4 requires explicit post-merge recertification state');
  if (state.postMergeRecertification?.status === 'PENDING' && state.phase7Allowed !== false) errors.push('Phase 7 must stay locked while recertification is pending');
  if (state.postMergeRecertification?.status === 'COMPLETE' && state.nextPhase !== '7.1') errors.push('Completed Phase 6.4 recertification must point to Phase 7.1');
  for (const marker of ['Status: **CLOSED**','unresolved destructive defects: **0**','post-merge recertification']) if (!closure.includes(marker)) errors.push(`Phase 6.4 closure missing marker: ${marker}`);
}

for (const marker of ['Status: **ACTIVE / NOT CLOSED**','missing relations','duplicates','huge names','mixed-language data','large relation graphs','invalid legacy mappings','P6-4-RELATION-INVALID-DATE','Phase 7 — Finance remains locked','670000']) if (!kickoff.includes(marker)) errors.push(`Phase 6.4 kickoff missing marker: ${marker}`);
if (!roadmap.includes('## 6.4 — Companies & People Destruction Gate')) errors.push('Master roadmap no longer contains Phase 6.4');

for (const script of ['test:phase6-4','audit:phase6-4:companies-people-destruction']) if (!packageJson.scripts?.[script]) errors.push(`package.json missing ${script}`);
if (!String(packageJson.scripts?.['test:functional'] ?? '').includes('companiesPeopleDestructionGate.test.ts')) errors.push('full functional regression must include Phase 6.4 destruction tests');
if (!String(packageJson.scripts?.['verify:extreme'] ?? '').includes('audit:phase6-4:companies-people-destruction')) errors.push('verify:extreme must preserve Phase 6.4 audit');

for (const marker of ['invalid legacy relationship dates fail closed','duplicate legacy mappings','huge company and person names','mixed Arabic Latin and digit search','large relationship graphs','missing relation targets']) if (!testSource.includes(marker)) errors.push(`Phase 6.4 destructive test missing marker: ${marker}`);
for (const marker of ['row.valid_from === null ? null : Date.parse(row.valid_from)','row.valid_to === null ? null : Date.parse(row.valid_to)','Number.isFinite(from) && from <= now','Number.isFinite(to) && to > now']) if (!contactService.includes(marker)) errors.push(`malformed relationship fail-closed fix missing: ${marker}`);

if (!browser) errors.push('Phase 6.4 requires a dedicated Real Chromium destruction spec');
for (const marker of ['long mixed company/person search','repeated company and people filter pressure','relationship end remains historical','assertNoHorizontalOverflow','assertTouchTargets']) if (!browser.includes(marker)) errors.push(`Phase 6.4 browser destruction spec missing marker: ${marker}`);

if (!workflow) errors.push('Phase 6.4 requires a dedicated GitHub Actions gate');
for (const marker of ['audit:phase6-4:companies-people-destruction','test:phase6-4','test:phase6-1','test:phase6-2','phase6-3-entity-360-audit.mjs','entity360Service.test.ts','test:functional','db:audit','audit:roadmap','typecheck','build -- --base=/','audit:dist:budget','phase6-3-preview','phase6-4-companies-people-destruction.spec.cjs','Real Chromium companies/people destruction']) if (!workflow.includes(marker)) errors.push(`Phase 6.4 workflow missing gate command: ${marker}`);

if (errors.length) {
  console.error(`ENJAZ PHASE 6.4 COMPANIES PEOPLE DESTRUCTION AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ PHASE 6.4 COMPANIES PEOPLE DESTRUCTION AUDIT PASS — ${state.status}; unresolved=${state.unresolvedDefectCount}; Phase 7 locked.`);
}
