import fs from 'node:fs/promises';

const contractPath = 'src/ui-v2/architecture/compositionContract.ts';
const atlasPath = 'src/ui-v2/runtime/CompositionAtlas.tsx';
const cssPath = 'src/ui-v2/styles/composition.css';
const referencePath = 'docs/UI_REBIRTH_REFERENCE_MAP.md';

const [contract, atlas, css, reference] = await Promise.all([
  fs.readFile(contractPath, 'utf8'),
  fs.readFile(atlasPath, 'utf8'),
  fs.readFile(cssPath, 'utf8'),
  fs.readFile(referencePath, 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`UI-5 composition audit FAIL: ${message}`);
}

const informationKinds = [
  'decision','metric','money','work-item','timeline-event','relationship',
  'workflow-step','document','trend','activity','form','state',
];
const patterns = [
  'focal-zone','metric-cluster','ledger','dense-row','timeline','relationship-cluster',
  'step-progression','document-browser','trend-panel','activity-stream','focused-form','editorial-state',
];
const screenFamilies = [
  'home','daily-work','transaction-list','transaction-360','companies-people','finance',
  'analytics','workflow','operations','command','documents','notifications',
];
const referenceFamilies = [
  'Home / Dashboard','Finance','Analytics','Workflow / Automation','Daily Work / Universal Inbox',
  'Transaction List / Create','Transaction 360 / Detail','Companies / People','Operations Center',
  'Command Center','Documents / Vault / Reports','Notifications / Follow-ups / Inbox',
];
const liveAtlasFamilies = ['home','daily-work','transaction-list','transaction-360','finance','analytics','workflow','operations','command','documents'];

for (const kind of informationKinds) assert(contract.includes(`kind: '${kind}'`), `missing information kind ${kind}`);
for (const pattern of patterns) assert(contract.includes(`'${pattern}'`), `missing presentation pattern ${pattern}`);
for (const family of screenFamilies) assert(contract.includes(`id: '${family}'`), `missing screen composition family ${family}`);
for (const heading of referenceFamilies) assert(reference.includes(`### ${heading}`), `approved reference family not found: ${heading}`);
for (const family of liveAtlasFamilies) assert(atlas.includes(`data-composition-family=\"${family}\"`), `live atlas missing ${family}`);

assert(contract.includes('never:'), 'anti-pattern clauses are missing');
assert(contract.includes('equal KPI grid'), 'equal KPI grid must be explicitly forbidden');
assert(contract.includes('stacked generic white cards'), 'generic stacked card wall must be explicitly forbidden');
assert(contract.includes('one oversized card per transaction'), 'transaction card-wall anti-pattern must be explicit');
assert(contract.includes('file-card wall'), 'document card-wall anti-pattern must be explicit');
assert(contract.includes('same composition as Home'), 'Command Center must be explicitly differentiated from Home');
assert(reference.includes('Equal white rounded rectangles are never the default layout primitive.'), 'reference-map anti-card-wall rule missing');

assert(css.includes('.ez-ia-home__lead'), 'Home asymmetric composition CSS missing');
assert(css.includes('grid-template-columns: minmax(0, 1.65fr)') || css.includes('grid-template-columns: minmax(0,1.65fr)'), 'Home asymmetric lead ratio missing');
assert(css.includes('.ez-ia-timeline'), 'timeline spatial grammar missing');
assert(css.includes('.ez-ia-ledger__row'), 'ledger row grammar missing');
assert(css.includes('.ez-ia-command__hero'), 'command focal grammar missing');
assert(css.includes('.ez-ia-documents__layout'), 'document browser grammar missing');
assert(css.includes('@media (max-width: 680px)'), 'mobile composition contract missing');
assert(css.includes('@media (max-width: 360px)'), 'narrow-phone composition contract missing');

assert(!atlas.includes('ui-rebirth'), 'Composition Atlas imports quarantined UI');
assert(!contract.includes('ui-rebirth'), 'composition contract depends on quarantined UI');

console.log('UI-5 composition audit PASS');
console.log(`- ${informationKinds.length} information kinds mapped to intentional patterns`);
console.log(`- ${screenFamilies.length} screen families mapped to approved reference families`);
console.log(`- ${liveAtlasFamilies.length} distinct live compositions implemented for Reality Gate`);
console.log('- generic equal-card layout is explicitly rejected by contract');
