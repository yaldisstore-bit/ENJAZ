import fs from 'node:fs/promises';
import path from 'node:path';

function assert(condition, message) { if (!condition) throw new Error(`UI-10 freeze audit FAIL: ${message}`); }
async function read(file) { return fs.readFile(file, 'utf8'); }
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const productFiles = {
  core: await read('src/ui-v2/runtime/CoreApp.tsx'),
  shell: await read('src/ui-v2/components/AppShell.tsx'),
  coreScreens: await read('src/ui-v2/screens/CoreScreens.tsx'),
  domainScreens: await read('src/ui-v2/screens/DomainScreens.tsx'),
  quickCreate: await read('src/ui-v2/components/QuickCreateFlow.tsx'),
  states: await read('src/ui-v2/components/state-patterns.tsx'),
  domains: await read('src/ui-v2/architecture/domain-composition.ts'),
  main: await read('src/main.tsx'),
};

assert(productFiles.core.includes('data-stage="ui-10"'), 'CoreApp is not frozen at UI-10');
assert(productFiles.shell.includes('data-stage="ui-10"'), 'AppShell is not frozen at UI-10');
assert(productFiles.main.includes("./ui-v2/runtime/UiV2Root.tsx"), 'application entry no longer mounts UI V2');

const uiFiles = await walk('src/ui-v2');
for (const file of uiFiles) {
  const source = await read(file);
  assert(!source.includes('ui-rebirth'), `legacy ui-rebirth dependency leaked into ${file}`);
}
assert(!productFiles.main.includes('ui-rebirth'), 'legacy ui-rebirth leaked into application entry');

const domainIds = ['transactions','companies','people','finance','workflow','automation','operations','command','risk','documents','followups','copilot'];
for (const id of domainIds) assert(productFiles.domains.includes(`id: '${id}'`), `domain destination disappeared: ${id}`);

for (const label of ['الرئيسية','اليوم','العمليات','المالية','إجراء جديد','بحث','الإشعارات','الحساب','مجالات إنجاز']) {
  assert(productFiles.shell.includes(label) || productFiles.core.includes(label), `global destination/action disappeared: ${label}`);
}

const forbiddenVisibleTerms = ['UI-10','UI-9','Reality Gate','PROOF','AUDIT','Rebirth','Preview','pipeline+','معاينة','تجريبية'];
const visibleSource = [productFiles.core, productFiles.shell, productFiles.coreScreens, productFiles.domainScreens, productFiles.quickCreate, productFiles.states].join('\n');
for (const term of forbiddenVisibleTerms) assert(!visibleSource.includes(term), `developer/legacy terminology present in product source: ${term}`);

for (const marker of ['rebirth-root','r4-root','r6-root','v7-root','v8-root']) {
  assert(!visibleSource.includes(marker), `legacy DOM marker present: ${marker}`);
}

console.log('UI-10 freeze audit PASS');
console.log(`- clean UI V2 source boundary across ${uiFiles.length} TS/TSX/CSS files`);
console.log(`- ${domainIds.length} domain destinations preserved`);
console.log('- core navigation and global actions preserved');
console.log('- user-visible product sources contain no stage/developer/legacy terminology');
console.log('- runtime and shell are promoted to UI-10');
