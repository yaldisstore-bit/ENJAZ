import fs from 'node:fs/promises';

const paths = {
  registry: 'src/ui-v2/architecture/domain-composition.ts',
  app: 'src/ui-v2/runtime/CoreApp.tsx',
  screens: 'src/ui-v2/screens/DomainScreens.tsx',
  css: 'src/ui-v2/styles/domains.css',
  main: 'src/main.tsx',
};
const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await fs.readFile(file, 'utf8')])));
const domains = ['transactions','companies','people','finance','workflow','automation','operations','command','risk','documents','followups','copilot'];
function assert(condition, message) { if (!condition) throw new Error(`UI-7 domain audit FAIL: ${message}`); }

for (const domain of domains) {
  assert(files.registry.includes(`id: '${domain}'`), `registry missing ${domain}`);
  assert(files.app.includes('data-domain-link={item.id}'), 'typed domain rail contract missing');
}
for (const domain of ['transactions','companies','people','workflow','automation','command','risk','documents','followups','copilot']) {
  assert(files.screens.includes(`data-domain-screen=\"${domain}\"`), `presentation missing ${domain}`);
}
for (const signature of ['pipeline','entity-profile','people-directory','stage-lanes','rule-stack','executive-focus','risk-map','category-list-detail','attention-inbox','context-assistant']) {
  assert(files.screens.includes(`data-pattern=\"${signature}\"`), `composition signature missing ${signature}`);
}
assert(files.app.includes('data-stage="ui-7"'), 'CoreApp was not promoted to UI-7');
assert(files.app.includes('setActiveDomain(null)'), 'core-return/domain reset contract missing');
assert(files.main.includes("./ui-v2/styles/domains.css"), 'domain stylesheet not loaded');
assert(files.css.includes('@media(max-width:430px)'), 'narrow-phone domain rules missing');
assert(!files.app.includes('ui-rebirth') && !files.screens.includes('ui-rebirth'), 'legacy UI leaked into domain runtime');
for (const forbidden of ['UI-7','Reality Gate','PROOF','AUDIT','واجهة تجريبية']) {
  assert(!files.screens.includes(forbidden), `developer terminology leaked into domain screens: ${forbidden}`);
}
console.log('UI-7 domain audit PASS');
console.log('- 12 domain destinations registered');
console.log('- distinct composition signatures present');
console.log('- UI V2 boundary and mobile styling preserved');
