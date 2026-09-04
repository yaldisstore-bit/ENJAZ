import fs from 'node:fs/promises';

const paths = {
  root: 'src/ui-v2/runtime/UiV2Root.tsx',
  production: 'src/ui-v2/runtime/ProductionUiV2Runtime.tsx',
  app: 'src/ui-v2/runtime/CoreApp.tsx',
  screens: 'src/ui-v2/screens/CoreScreens.tsx',
  daily: 'src/ui-v2/screens/DailyWorkScreen.tsx',
  shell: 'src/ui-v2/components/AppShell.tsx',
  css: 'src/ui-v2/styles/core.css',
  dailyCss: 'src/ui-v2/styles/daily-work.css',
  main: 'src/main.tsx',
};

const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await fs.readFile(path, 'utf8')])));

function assert(condition, message) {
  if (!condition) throw new Error(`UI-6 core audit FAIL: ${message}`);
}

assert(files.root.includes('<ProductionUiV2Runtime />'), 'production UI V2 wrapper is not reachable');
assert(files.root.includes('<CoreApp dailyWorkMode="preview" />'), 'safe non-live CoreApp path is not preserved');
assert(files.production.includes('<CoreApp dailyWorkMode="live" />'), 'live production wrapper does not reach CoreApp');
assert(files.root.includes("ui3-gallery") && files.root.includes("ui5-atlas"), 'prior regression harnesses were not preserved');
assert(files.app.includes('data-core-app="true"'), 'core app marker missing');
assert(files.app.includes('data-stage="ui-10"'), 'frozen core app stage marker missing');
for (const screen of ['home','operations','command','finance']) {
  assert(files.screens.includes(`data-core-screen=\"${screen}\"`), `core screen missing: ${screen}`);
}
assert(files.daily.includes('data-core-screen="today"'), 'Daily Work replacement no longer owns the Today core destination');
for (const overlay of ['search','notifications','create','account']) {
  assert(files.shell.includes(`data-core-overlay=\"${overlay}\"`), `core overlay missing: ${overlay}`);
}
for (const token of ['فتح مركز القيادة','العودة للعمليات','فتح المعاملة']) {
  assert(files.screens.includes(token), `core interaction missing: ${token}`);
}
for (const token of ['متابعة جديدة','فتح السياق']) {
  assert(files.daily.includes(token), `Daily Work core interaction missing: ${token}`);
}
for (const token of ['aria-label="الحساب"','onClick={() => openOverlay(\'account\')}','enjaz:open-create','data-create-type="followup"']) {
  assert(files.shell.includes(token), `shell core contract missing: ${token}`);
}
for (const forbidden of ['واجهة بحث تجريبية','نتائج تجريبية','UI-6','Reality Gate','PROOF','AUDIT']) {
  assert(!files.app.includes(forbidden) && !files.screens.includes(forbidden) && !files.daily.includes(forbidden) && !files.shell.includes(forbidden), `developer terminology leaked: ${forbidden}`);
}
assert(files.main.includes("./ui-v2/styles/core.css"), 'core stylesheet is not loaded');
assert(files.main.includes("./ui-v2/styles/daily-work.css"), 'Daily Work stylesheet is not loaded');
assert(files.css.includes('@media (max-width: 680px)'), 'core mobile layout rules missing');
assert(files.css.includes('@media (max-width: 400px)'), 'core narrow-phone rules missing');
assert(files.dailyCss.includes('@media (max-width: 390px)'), 'Daily Work narrow-phone rules missing');
assert(!files.app.includes('ui-rebirth') && !files.screens.includes('ui-rebirth') && !files.daily.includes('ui-rebirth'), 'core runtime depends on quarantined legacy UI');

console.log('UI-6 core audit PASS');
console.log('- CoreApp remains the product core behind production/fixture runtime wrappers');
console.log('- Home/Daily Work/Operations/Command/Finance core destinations exist');
console.log('- Search/Notifications/Create/Account surfaces exist');
console.log('- UI-3 and UI-5 regression harnesses remain available');
