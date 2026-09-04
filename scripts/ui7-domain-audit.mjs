import fs from 'node:fs/promises';

const paths = {
  registry: 'src/ui-v2/architecture/domain-composition.ts',
  app: 'src/ui-v2/runtime/CoreApp.tsx',
  shell: 'src/ui-v2/components/AppShell.tsx',
  screens: 'src/ui-v2/screens/DomainScreens.tsx',
  css: 'src/ui-v2/styles/domains.css',
  explorerCss: 'src/ui-v2/styles/domain-explorer.css',
  main: 'src/main.tsx',
};
const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await fs.readFile(file, 'utf8')])));
const domains = ['transactions','companies','people','finance','workflow','automation','operations','command','risk','documents','followups','copilot'];
function assert(condition, message) { if (!condition) throw new Error(`UI-7 domain audit FAIL: ${message}`); }

for (const domain of domains) {
  assert(files.registry.includes(`id: '${domain}'`), `registry missing ${domain}`);
}
for (const domain of ['transactions','companies','people','workflow','automation','command','risk','documents','followups','copilot']) {
  assert(files.screens.includes(`data-domain-screen=\"${domain}\"`), `presentation missing ${domain}`);
}
for (const signature of ['pipeline','entity-profile','people-directory','stage-lanes','rule-stack','executive-focus','risk-map','category-list-detail','attention-inbox','context-assistant']) {
  assert(files.screens.includes(`data-pattern=\"${signature}\"`), `composition signature missing ${signature}`);
}

assert(files.app.includes('data-stage="ui-7"'), 'CoreApp was not promoted to UI-7');
assert(files.app.includes('data-domain-explorer="true"'), 'domain explorer contract missing');
assert(files.app.includes('data-domain-explorer-link={id}'), 'typed explorer destinations missing');
assert(files.app.includes('activeDomain ? ('), 'domain-only rail guard missing');
assert(files.app.includes('data-domain-rail="true"'), 'in-domain rail contract missing');
assert(files.app.includes('setActiveDomain(null)'), 'core-return/domain reset contract missing');
assert(files.shell.includes('onBrandAction?(): void;'), 'brand action adapter missing');
assert(files.shell.includes('aria-label="مجالات إنجاز"'), 'brand domain explorer trigger missing');
assert(files.main.includes("./ui-v2/styles/domains.css"), 'domain stylesheet not loaded');
assert(files.main.includes("./ui-v2/styles/domain-explorer.css"), 'domain explorer stylesheet not loaded');
assert(files.css.includes('@media(max-width:430px)'), 'narrow-phone domain rules missing');
assert(files.explorerCss.includes('.ez-domain-explorer'), 'domain explorer presentation missing');
assert(files.explorerCss.includes('min-height: 44px'), 'brand mobile touch contract missing');
assert(files.explorerCss.includes('@media (max-width: 430px)'), 'narrow-phone explorer rules missing');
assert(files.explorerCss.includes('.ez-sheet:has(.ez-domain-explorer)'), 'explorer-scoped sheet contract missing');
assert(files.explorerCss.includes('box-sizing: border-box'), 'explorer sheet must include padding inside viewport max-height');
assert(files.explorerCss.includes('var(--ez-visual-viewport-height, 100dvh)'), 'explorer sheet is not tied to visual viewport height');
assert(files.explorerCss.includes('overflow-y: auto'), 'explorer body must scroll internally instead of escaping viewport');
assert(files.explorerCss.includes('grid-template-rows: auto auto minmax(0,1fr)'), 'explorer sticky chrome/body grid contract missing');
assert(!files.app.includes('ui-rebirth') && !files.screens.includes('ui-rebirth') && !files.shell.includes('ui-rebirth'), 'legacy UI leaked into domain runtime');
for (const forbidden of ['UI-7','Reality Gate','PROOF','AUDIT','واجهة تجريبية']) {
  assert(!files.screens.includes(forbidden), `developer terminology leaked into domain screens: ${forbidden}`);
}

console.log('UI-7 domain audit PASS');
console.log('- 12 domain destinations registered');
console.log('- core surfaces stay rail-free and enter domains through the brand explorer');
console.log('- explorer sheet is viewport-bounded with internal body scrolling');
console.log('- in-domain rail and distinct composition signatures are preserved');
console.log('- UI V2 boundary and narrow-phone contracts remain enforced');
