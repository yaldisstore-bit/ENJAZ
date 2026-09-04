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
function keyframes(name) {
  const match = files.css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  return match?.[1] ?? '';
}
function stageOf(source) {
  const match = source.match(/data-stage=\"ui-(\d+)\"/);
  return match ? Number(match[1]) : 0;
}

assert(files.main.includes("./ui-v2/styles/motion-touch.css"), 'motion-touch contract is not loaded last in runtime');
assert(stageOf(files.shell) >= 9 && stageOf(files.core) >= 9, 'runtime regressed below UI-9');
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

assert(!keyframes('ez-stage-in').includes('scale('), 'screen entry animation must not shrink physical touch geometry');
assert(!keyframes('ez-search-in').includes('scale('), 'search entry animation must not shrink physical touch geometry');

for (const file of [files.shell, files.overlays, files.core, files.css]) {
  assert(!file.includes('ui-rebirth'), 'legacy UI dependency leaked into UI-9');
}

console.log('UI-9 motion/touch/mobile audit PASS');
console.log('- runtime remains at or beyond UI-9');
console.log('- visual viewport width/height/offset, keyboard, orientation and pointer contracts registered');
console.log('- screen, overlay enter/exit and press feedback contracts registered');
console.log('- entry motion preserves full touch geometry from the first frame');
console.log('- landscape, safe-area and coarse-pointer hardening registered');
console.log('- reduced-motion contract registered');
