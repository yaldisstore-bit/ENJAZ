import fs from 'node:fs/promises';

const paths = {
  root: 'src/ui-v2/runtime/UiV2Root.tsx',
  app: 'src/ui-v2/runtime/CoreApp.tsx',
  screens: 'src/ui-v2/screens/CoreScreens.tsx',
  shell: 'src/ui-v2/components/AppShell.tsx',
  css: 'src/ui-v2/styles/core.css',
  main: 'src/main.tsx',
};

const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await fs.readFile(path, 'utf8')])));

function assert(condition, message) {
  if (!condition) throw new Error(`UI-6 core audit FAIL: ${message}`);
}

assert(files.root.includes('return <CoreApp />'), 'CoreApp is not the default UI V2 runtime');
assert(files.root.includes("ui3-gallery") && files.root.includes("ui5-atlas"), 'prior regression harnesses were not preserved');
assert(files.app.includes('data-core-app="true"'), 'core app marker missing');
for (const screen of ['home','today','operations','command','finance']) {
  assert(files.screens.includes(`data-core-screen=\"${screen}\"`), `core screen missing: ${screen}`);
}
for (const overlay of ['search','notifications','create','account']) {
  assert(files.shell.includes(`data-core-overlay=\"${overlay}\"`), `core overlay missing: ${overlay}`);
}
for (const token of ['فتح مركز القيادة','العودة للعمليات','متابعة جديدة','فتح المعاملة','بدء المهمة']) {
  assert(files.screens.includes(token), `core interaction missing: ${token}`);
}
for (const token of ['aria-label="الحساب"','onClick={() => openOverlay(\'account\')}','enjaz:open-create','data-create-type="followup"']) {
  assert(files.shell.includes(token), `shell core contract missing: ${token}`);
}
for (const forbidden of ['واجهة بحث تجريبية','نتائج تجريبية','UI-6','Reality Gate','PROOF','AUDIT']) {
  assert(!files.app.includes(forbidden) && !files.screens.includes(forbidden) && !files.shell.includes(forbidden), `developer/preview terminology leaked: ${forbidden}`);
}
assert(files.main.includes("./ui-v2/styles/core.css"), 'core stylesheet is not loaded');
assert(files.css.includes('@media (max-width: 680px)'), 'core mobile layout rules missing');
assert(files.css.includes('@media (max-width: 400px)'), 'core narrow-phone rules missing');
assert(!files.app.includes('ui-rebirth') && !files.screens.includes('ui-rebirth'), 'core runtime depends on quarantined legacy UI');

console.log('UI-6 core audit PASS');
console.log('- default runtime is CoreApp');
console.log('- Home/Today/Operations/Command/Finance core surfaces exist');
console.log('- Search/Notifications/Create/Account surfaces exist');
console.log('- UI-3 and UI-5 regression harnesses remain available');
