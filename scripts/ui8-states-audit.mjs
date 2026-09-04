import fs from 'node:fs/promises';

const paths = {
  states: 'src/ui-v2/components/state-patterns.tsx',
  forms: 'src/ui-v2/components/form-controls.tsx',
  quick: 'src/ui-v2/components/QuickCreateFlow.tsx',
  overlays: 'src/ui-v2/components/overlays.tsx',
  primitives: 'src/ui-v2/components/primitives.tsx',
  shell: 'src/ui-v2/components/AppShell.tsx',
  root: 'src/ui-v2/runtime/UiV2Root.tsx',
  core: 'src/ui-v2/runtime/CoreApp.tsx',
  lab: 'src/ui-v2/runtime/InteractionLab.tsx',
  css: 'src/ui-v2/styles/states-forms.css',
  main: 'src/main.tsx',
};
const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await fs.readFile(file, 'utf8')])));
function assert(condition, message) { if (!condition) throw new Error(`UI-8 states/forms audit FAIL: ${message}`); }

for (const kind of ['loading','empty','error','offline','conflict','permission','success','archived']) {
  assert(files.states.includes(`${kind}:`), `state pattern missing ${kind}`);
  assert(files.lab.includes(`kind=\"${kind}\"`), `reality lab missing ${kind}`);
}
assert(files.states.includes('data-state-kind={props.kind}'), 'typed state runtime marker missing');
assert(files.forms.includes('EzTextarea') && files.forms.includes('EzSelect') && files.forms.includes('EzFormSection'), 'form control system incomplete');
assert(files.quick.includes('data-create-form={props.kind}'), 'Quick Create form contract missing');
assert(files.quick.includes('validate = () =>'), 'Quick Create validation contract missing');
assert(files.quick.includes('const value = event.currentTarget.value;'), 'Quick Create must snapshot event value before queued state updates');
assert(!/setDraft\([\s\S]{0,140}event\.currentTarget\.value/.test(files.quick), 'deferred event.currentTarget access can crash controlled forms');
assert(files.quick.includes('delete next[field]'), 'corrected field must clear its validation error safely');
assert(files.quick.includes('tone=\"danger\"') && files.quick.includes('مسح المسودة'), 'destructive draft confirmation missing');
assert(files.quick.includes('لم يتم حفظ أي سجل بعد'), 'UI-only create flow must not claim persistence');
assert(files.overlays.includes("tone?: 'warning' | 'danger'"), 'danger dialog contract missing');
assert(files.primitives.includes("'danger'"), 'danger button tone missing');
assert(files.primitives.includes('aria-invalid={error ? true : undefined}'), 'input validation accessibility contract missing');
assert(files.forms.includes('aria-invalid={error ? true : undefined}'), 'select/textarea validation accessibility contract missing');
assert(files.shell.includes('visibleResults.length > 0'), 'search empty-state branch missing');
assert(files.shell.includes('kind=\"empty\"') && files.shell.includes('لا توجد نتائج مطابقة'), 'product empty search state missing');
assert(files.shell.includes('<QuickCreateFlow kind={createKind}'), 'validated Quick Create not mounted in AppShell');
assert(files.root.includes("params.get('ui8-lab') === '1'"), 'UI-8 regression harness route missing');
assert(files.core.includes('data-stage="ui-8"') && files.shell.includes('data-stage="ui-8"'), 'runtime not promoted to UI-8');
assert(files.main.includes("./ui-v2/styles/states-forms.css"), 'UI-8 stylesheet not loaded');
for (const token of ['overflow-wrap:anywhere','grid-template-columns:repeat(2,minmax(0,1fr))','@media(max-width:430px)','@media(max-height:620px)']) {
  assert(files.css.includes(token), `stress/responsive styling missing ${token}`);
}
for (const file of [files.states, files.forms, files.quick, files.lab]) {
  assert(!file.includes('ui-rebirth'), 'legacy UI dependency leaked into UI-8');
}
for (const forbidden of ['PROOF','AUDIT','Reality Gate','واجهة تجريبية']) {
  assert(!files.shell.includes(forbidden) && !files.quick.includes(forbidden), `developer terminology leaked into product runtime: ${forbidden}`);
}
console.log('UI-8 states/forms audit PASS');
console.log('- 8 exceptional states registered');
console.log('- validated Quick Create and destructive confirmation mounted');
console.log('- controlled inputs snapshot event values before state updates');
console.log('- empty search, long-text and large-value contracts present');
console.log('- constrained viewport and UI V2 boundary preserved');
