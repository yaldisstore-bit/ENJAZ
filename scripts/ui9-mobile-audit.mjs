import fs from 'node:fs/promises';

const paths = {
  shell: 'src/ui-v2/components/AppShell.tsx',
  overlays: 'src/ui-v2/components/overlays.tsx',
  core: 'src/ui-v2/runtime/CoreApp.tsx',
  css: 'src/ui-v2/styles/motion-touch.css',
  main: 'src/main.tsx',
};

const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await fs.readFile(file, 'utf8')])));
function assert(condition, message) { if (!condition) throw new Error(`UI-9 mobile/motion audit FAIL: ${message}`); }

assert(files.main.includes("./ui-v2/styles/motion-touch.css"), 'motion-touch contract is not loaded last in runtime');
assert(files.shell.includes('data-stage="ui-9"') && files.core.includes('data-stage="ui-9"'), 'runtime not promoted to UI-9');
assert(files.core.includes('className="ez-motion-stage"') && files.core.includes('data-motion-surface={motionKey}'), 'screen motion surface missing');

for (const token of [
  '--ez-visual-viewport-height', '--ez-visual-viewport-width', '--ez-visual-viewport-offset-top', '--ez-visual-viewport-offset-left',
  'enjazOrientation', 'enjazPointer', 'enjazKeyboard',
]) assert(files.shell.includes(token), `visual viewport/mobile runtime contract missing ${token}`);

assert(files.shell.includes("window.screen.orientation?.addEventListener?.('change', update)"), 'orientation change listener missing');
assert(files.shell.includes("window.matchMedia('(pointer: coarse)')"), 'coarse-pointer runtime contract missing');
assert(files.overlays.includes('data-motion-state={presence.motionState}'), 'overlay presence state missing');
assert(files.overlays.includes("'closing'"), 'overlay closing state missing');
assert(files.overlays.includes("prefers-reduced-motion: reduce"), 'overlay reduced-motion presence timing missing');

for (const token of [
  '@media (prefers-reduced-motion: reduce)',
  '@media (pointer: coarse)',
  '@media (orientation: landscape) and (max-height: 520px)',
  'env(safe-area-inset-left)',
  'env(safe-area-inset-right)',
  'data-motion-state="closing"',
  'ez-stage-in',
  'touch-action: manipulation',
]) assert(files.css.includes(token), `motion/touch CSS contract missing ${token}`);

for (const file of [files.shell, files.overlays, files.core, files.css]) {
  assert(!file.includes('ui-rebirth'), 'legacy UI dependency leaked into UI-9');
}

console.log('UI-9 motion/touch/mobile audit PASS');
console.log('- visual viewport width/height/offset, keyboard, orientation and pointer contracts registered');
console.log('- screen, overlay enter/exit and press feedback contracts registered');
console.log('- landscape, safe-area and coarse-pointer hardening registered');
console.log('- reduced-motion contract registered');
