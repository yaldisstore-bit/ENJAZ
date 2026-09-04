import fs from 'node:fs';
import path from 'node:path';
import { validateExtremeUI } from './ui-rebirth-extreme-audit-lib.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const baseline = {
  shell: read('src/ui-rebirth/runtime/RebirthAppShell.tsx'),
  shellCss: read('src/ui-rebirth/runtime/rebirth-app-shell.css'),
  hardeningCss: read('src/ui-rebirth/styles/qa-hardening.css'),
  tokensCss: read('src/ui-rebirth/styles/tokens.css'),
  foundationCss: read('src/ui-rebirth/styles/foundation.css'),
};

const baseFailures = validateExtremeUI(baseline);
if (baseFailures.length) {
  console.error('Extreme selftest baseline is already invalid.');
  console.error(baseFailures);
  process.exit(1);
}

const mutate = (key, from, to = '') => ({ ...baseline, [key]: baseline[key].replace(from, to) });
const mutateAll = (key, from, to = '') => ({ ...baseline, [key]: baseline[key].replaceAll(from, to) });
const cases = [
  ['remove RTL', mutate('shell', 'dir="rtl"', 'dir="ltr"')],
  ['remove main landmark', mutate('shell', '<main className="rebirth-shell__viewport"', '<div className="rebirth-shell__viewport"')],
  ['remove nav landmark', mutate('shell', '<nav className="rebirth-shell__dock"', '<div className="rebirth-shell__dock"')],
  ['remove dialog role', mutate('shell', 'role="dialog"', '')],
  ['remove aria-modal', mutate('shell', 'aria-modal="true"', '')],
  ['remove aria-haspopup', mutate('shell', 'aria-haspopup="dialog"', '')],
  ['remove aria-controls', mutate('shell', 'aria-controls="rebirth-quick-actions"', '')],
  ['remove expanded state', mutate('shell', 'aria-expanded={quickActionsOpen}', '')],
  ['remove initial focus target', mutate('shell', 'data-autofocus className=', 'data-no-focus className=')],
  ['remove initial focus selector', mutate('shell', "querySelector<HTMLElement>('[data-autofocus]')", "querySelector<HTMLElement>('[data-missing]')")],
  ['remove Escape', mutate('shell', "event.key === 'Escape'", "event.key === 'Never'")],
  ['remove Tab trap', mutate('shell', "event.key !== 'Tab'", "event.key !== 'Never'")],
  ['remove Shift+Tab', mutateAll('shell', 'event.shiftKey', 'false')],
  ['remove focus restoration', mutate('shell', 'primaryActionRef.current?.focus()', 'void 0')],
  ['remove inert background', mutateAll('shell', 'inert={quickActionsOpen ? true : undefined}', '')],
  ['remove explicit button type', mutate('shell', 'type="button"', '')],
  ['inject debugger', { ...baseline, shell: `${baseline.shell}\ndebugger;` }],
  ['inject legacy marker', { ...baseline, shell: `${baseline.shell}\n// productivity-polish` }],
  ['remove 100dvh', mutateAll('shellCss', '100dvh', '100vh')],
  ['remove top safe area', mutateAll('shellCss', 'safe-area-inset-top', 'safe-area-gone-top')],
  ['remove bottom safe area', mutateAll('shellCss', 'safe-area-inset-bottom', 'safe-area-gone-bottom')],
  ['remove left safe area', mutateAll('shellCss', 'safe-area-inset-left', 'safe-area-gone-left')],
  ['remove right safe area', mutateAll('shellCss', 'safe-area-inset-right', 'safe-area-gone-right')],
  ['remove overflow containment', mutateAll('shellCss', 'overflow-x: clip', 'overflow-x: visible')],
  ['remove reduced motion', mutateAll('shellCss', '@media (prefers-reduced-motion: reduce)', '@media (min-width: 99999px)')],
  ['remove forced colors', mutateAll('hardeningCss', '@media (forced-colors: active)', '@media (min-width: 99999px)')],
  ['remove focus-visible', mutateAll('hardeningCss', ':focus-visible', ':hover')],
  ['lower touch token', mutateAll('tokensCss', '--ui-touch-min: 44px', '--ui-touch-min: 36px')],
  ['remove touch minimum width', mutateAll('hardeningCss', 'min-width: var(--ui-touch-min)', 'min-width: 1px')],
  ['remove touch minimum height', mutateAll('hardeningCss', 'min-height: var(--ui-touch-min)', 'min-height: 1px')],
  ['remove direction-safe CTA inset', mutateAll('hardeningCss', 'inset-inline: 0;', 'inset-inline-start: 50%;')],
  ['remove CTA auto centering', mutateAll('hardeningCss', 'margin-inline: auto;', 'margin-inline: 0;')],
  ['break dock center slot', mutateAll('shellCss', 'grid-template-columns: 1fr 1fr 76px 1fr 1fr', 'grid-template-columns: repeat(5,1fr)')],
  ['move hardening earlier', { ...baseline, foundationCss: baseline.foundationCss.replace("@import './qa-hardening.css';", "@import './qa-hardening.css';\n@import './tokens.css';") }],
  ['weaken secondary ink contrast', mutateAll('tokensCss', '--ui-ink-secondary: #54514d', '--ui-ink-secondary: #817e7a')],
  ['move quick microcopy back to muted ink', mutateAll('shellCss', 'color: var(--ui-ink-secondary);', 'color: var(--ui-ink-muted);')],
  ['reintroduce dialog opacity fade', mutate('shellCss', 'from { transform: translateY(28px) scale(.985); }', 'from { opacity: 0; transform: translateY(28px) scale(.985); }')],
];

let rejected = 0;
for (const [name, specimen] of cases) {
  const failures = validateExtremeUI(specimen);
  if (!failures.length) {
    console.error(`Extreme destructive gate MISSED deliberate regression: ${name}`);
    process.exit(1);
  }
  rejected += 1;
}

console.log(`ENJAZ extreme destructive gate passed: ${rejected}/${cases.length} deliberate regressions rejected.`);
