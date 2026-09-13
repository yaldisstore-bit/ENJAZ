import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));
const errors = [];
const req = (value, message) => { if (!value) errors.push(message); };
const marker = (text, value, label) => req(text.includes(value), `${label} missing marker: ${value}`);

const md = read('docs/ENJAZ_PHASE18_20_GOVERNING_AMENDMENT.md');
const state = json('docs/ENJAZ_PHASE18_20_GOVERNING_AMENDMENT.json');
const major = json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');

req(state.schemaVersion === 1, 'amendment schemaVersion must remain 1');
req(state.status === 'GOVERNING_AMENDMENT', 'amendment must remain GOVERNING_AMENDMENT');
req(state.effectiveFromPhase === '18' && state.preservesPhasesThrough === '17', 'amendment may change only Phase 18+ future delivery');
req(state.closedPhasesReopened === false && state.historicalEvidenceInvalidated === false, 'amendment must not reopen certified historical phases');
req(state.finalDeliveryPhase === '20' && state.finalState === 'ENJAZ 1.0 — Delivered', 'final delivery must remain Phase 20');
req(state.phase17Role === 'PRODUCTION_BASELINE_AND_RELEASE_REHEARSAL', 'Phase 17 role drifted');

req(state.phase18?.name === 'Advanced Office & Productivity Suite' && state.phase18?.kind === 'CAPABILITY', 'Phase 18 identity drifted');
req(state.phase18?.minimumSubphases === 15 && state.phase18?.requiredCapabilities?.length >= 15, 'Phase 18 must remain a substantial capability phase');
req(state.phase19?.name === 'Digital Office, Correspondence & Mobile Capture' && state.phase19?.kind === 'CAPABILITY', 'Phase 19 identity drifted');
req(state.phase19?.minimumSubphases === 17 && state.phase19?.requiredCapabilities?.length >= 17, 'Phase 19 must remain a substantial capability phase');
req(state.phase20?.name === 'Grand Final Zero-Escape & Reality Certification' && state.phase20?.kind === 'FINAL_CERTIFICATION', 'Phase 20 identity drifted');
req(state.phase20?.minimumSubphases === 20 && state.phase20?.featureFreeze === true, 'Phase 20 must remain the expanded final certification phase');
req(state.phase20?.requiresFullUiUxDestruction === true, 'Phase 20 must include full UI/UX destruction');
req(state.phase20?.requiresRealAndroid === true && state.phase20?.requiresExactProductionSha === true, 'Phase 20 must retain real-device and exact-production proof');
req(state.phase20?.requiresBackupRestoreAcceptance === true && state.phase20?.requiresM1M18ClosureMatrix === true, 'Phase 20 final resilience/system closure proof drifted');
req(Array.isArray(state.phase20?.requiredZeroCounts) && state.phase20.requiredZeroCounts.length === 6, 'Phase 20 zero-blocker ledger drifted');
req(state.authorizationRule?.includes('predecessor'), 'future authorization must remain predecessor-gated');

for (const heading of [
  '# Phase 18 — Advanced Office & Productivity Suite',
  '# Phase 19 — Digital Office, Correspondence & Mobile Capture',
  '# Phase 20 — Grand Final Zero-Escape & Reality Certification',
  '## 20.18 — FINAL UI/UX DESTRUCTION',
  '## 20.19 — Exact Production Reality Test',
  '## 20.20 — Final Zero-Escape Acceptance & Delivery',
  '**Final state:** `ENJAZ 1.0 — Delivered`.'
]) marker(md, heading, 'governing amendment');

for (let i = 1; i <= 15; i++) marker(md, `## 18.${i} —`, 'Phase 18 sequence');
for (let i = 1; i <= 17; i++) marker(md, `## 19.${i} —`, 'Phase 19 sequence');
for (let i = 1; i <= 20; i++) marker(md, `## 20.${i} —`, 'Phase 20 sequence');

const m14 = major.systems?.find((system) => system.id === 'M14');
req(m14?.name === 'Backup, Restore & Workspace Portability', 'M14 identity drifted');
req(m14?.anchors?.join(',') === '15,20', 'M14 final acceptance anchor must be Phase 20');
req(state.majorSystemAnchorChanges?.M14?.join(',') === '15,20', 'amendment M14 anchor declaration drifted');

const phase18Index = md.indexOf('# Phase 18 —');
const phase19Index = md.indexOf('# Phase 19 —');
const phase20Index = md.indexOf('# Phase 20 —');
req(phase18Index >= 0 && phase19Index > phase18Index && phase20Index > phase19Index, 'Phase 18→19→20 order drifted');

if (errors.length) {
  console.error(`ENJAZ PHASE18-20 ROADMAP AMENDMENT AUDIT FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ENJAZ PHASE18-20 ROADMAP AMENDMENT AUDIT PASS');
