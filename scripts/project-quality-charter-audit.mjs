import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];

const requiredFiles = [
  'ENJAZ_NON_NEGOTIABLE_RULES.md',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'README.md',
  'docs/PHASE9_3_KICKOFF.md',
  'docs/PHASE9_3_STATE.json',
];
for (const path of requiredFiles) if (!exists(path)) errors.push(`missing governing file: ${path}`);

if (!errors.length) {
  const charter = read('ENJAZ_NON_NEGOTIABLE_RULES.md');
  const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
  const readme = read('README.md');
  const kickoff = read('docs/PHASE9_3_KICKOFF.md');
  const state = JSON.parse(read('docs/PHASE9_3_STATE.json'));

  const requireMarker = (source, marker, label) => {
    if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`);
  };

  for (const marker of [
    'QUALITY_CONSTITUTION_VERSION=1',
    'PHASE_CLOSURE_REQUIRES_ALL_FOUR_PASS=true',
    'PRODUCT_COMPLETENESS_REQUIRED=true',
    'PREMIUM_UI_UX_REQUIRED=true',
    'ENGINEERING_QUALITY_REQUIRED=true',
    'CERTIFICATION_REQUIRED=true',
    'NO_FEATURE_CUT_FOR_BUNDLE_BUDGET=true',
    'NO_LEGACY_DNA=true',
    'NO_PATCHWORK_RELEASES=true',
    'PRODUCT → UI/UX → ENGINEERING → CERTIFICATION',
    'Product=`PASS`, UI/UX=`PASS`, Engineering=`PASS`, Certification=`PASS`',
    'A JavaScript/performance budget is a quality guard, not permission to delete approved capability',
    'production behavior, not preview confidence, is the closure authority',
  ]) requireMarker(charter, marker, 'quality constitution');

  requireMarker(roadmap, '1. `ENJAZ_NON_NEGOTIABLE_RULES.md`', 'master roadmap source-of-truth hierarchy');
  requireMarker(readme, 'ENJAZ_NON_NEGOTIABLE_RULES.md', 'README governance sources');
  requireMarker(readme, 'Product → UI/UX → Engineering → Certification', 'README quality law');
  requireMarker(kickoff, 'ENJAZ_NON_NEGOTIABLE_RULES.md', 'Phase 9.3 kickoff');
  requireMarker(kickoff, 'Product / UI/UX / Engineering / Certification', 'Phase 9.3 four-track gate');

  const q = state.projectQualityConstitution;
  if (!q || q.version !== 1 || q.authority !== 'ENJAZ_NON_NEGOTIABLE_RULES.md' || q.closureRequiresAllFourPass !== true) {
    errors.push('Phase 9.3 state is not bound to quality constitution v1');
  } else {
    for (const track of ['product', 'uiUx', 'engineering', 'certification']) {
      if (!['PENDING', 'IN_PROGRESS', 'PASS', 'FAILED', 'LOCKED'].includes(q.tracks?.[track])) errors.push(`Phase 9.3 invalid quality track state: ${track}`);
    }
    if (state.status === 'CLOSED' && Object.values(q.tracks).some((value) => value !== 'PASS')) {
      errors.push('Phase 9.3 cannot be CLOSED unless all four quality tracks are PASS');
    }
  }
}

if (errors.length) {
  console.error(`ENJAZ PROJECT QUALITY CONSTITUTION AUDIT FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ENJAZ PROJECT QUALITY CONSTITUTION AUDIT PASS — Product + UI/UX + Engineering + Certification remain mandatory; no feature-cut-for-budget, no legacy DNA, no patchwork closure.');
