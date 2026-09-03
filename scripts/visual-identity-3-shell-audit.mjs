import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;
const text = (path) => readFile(resolve(root, path), 'utf8');
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const includesAll = (label, source, markers) => {
  for (const marker of markers) check(`${label}: ${marker}`, source.includes(marker));
};
const lineCount = (source) => source.split(/\r?\n/).length;

const [shell, interactions, shellCss, railCss, commandCss, proofCss, foundation] = await Promise.all([
  'src/shared/shell/AppShellFrame.tsx',
  'src/shared/interactions/GlobalInteractionSurfaces.tsx',
  'src/styles/app-shell.css',
  'src/styles/global-interactions.css',
  'src/styles/global-command-surfaces.css',
  'src/styles/shell-proof.css',
  'src/styles/foundation.css',
].map(text));

check('global tools are composed inside the topbar action region',
  shell.indexOf('app-shell__topbar-actions') < shell.indexOf('<GlobalInteractionSurfaces inboxCount={inboxCount} />')
  && shell.indexOf('<GlobalInteractionSurfaces inboxCount={inboxCount} />') < shell.indexOf('app-shell__account'));
check('global interaction surface is still mounted exactly once', (shell.match(/<GlobalInteractionSurfaces\b/g) ?? []).length === 1);
check('five frozen primary navigation slots still render from the contract', shell.includes('SHELL_NAV_SLOTS.map'));
check('bottom navigation owns one dedicated quick-create cradle', (shell.match(/app-shell__navigation-cradle/g) ?? []).length === 1);
check('cradle is decorative only', shell.includes('<span className="app-shell__navigation-cradle" aria-hidden="true" />'));

includesAll('four global tool identities survive the rebuild', interactions, [
  'global-interactions__item--search',
  'global-interactions__item--inbox',
  'global-interactions__item--accent',
  'global-interactions__item--command',
]);
includesAll('quick create is a composed action surface, not a duplicated domain form', interactions, [
  'global-create-surface', 'global-create-surface__grid', 'global-create-card',
  'QUICK_CREATE_INTENTS.map', 'يفوّض التنفيذ', 'نماذج الإنشاء',
]);
includesAll('leadership and operations is a command surface instead of a plain list', interactions, [
  'global-surface global-surface--command', 'global-command-surface', 'global-command-surface__hero',
  'global-command-surface__grid', 'global-command-card', 'CONTROL_TARGETS.map',
  'طبقة قيادة، لا اختصار وهمي',
]);
const controlStart = interactions.indexOf('id="global-control"');
const controlEnd = interactions.indexOf('</BottomSheet>', controlStart);
const controlSlice = controlStart >= 0 && controlEnd > controlStart ? interactions.slice(controlStart, controlEnd) : '';
check('command surface contains no ordinary unordered list', controlSlice.length > 0 && !/<ul\b|global-surface__list/.test(controlSlice));

includesAll('mobile quick-create is physically integrated with the dock center', railCss, [
  '.global-interactions__item--accent',
  'position: fixed',
  'inset-inline-start: 50%',
  'inset-block-end: calc(var(--space-3) + var(--space-6) + env(safe-area-inset-bottom, 0))',
  'transform: translateX(-50%)',
  'background: var(--color-warning)',
  'border: var(--space-1) solid var(--color-surface)',
  'box-shadow: var(--shadow-level-3)',
  'z-index: var(--z-overlay)',
]);
includesAll('navigation dock provides a centered visual cradle', shellCss, [
  '.app-shell__navigation-cradle',
  'inset-inline-start: 50%',
  'transform: translateX(-50%)',
  'background: var(--color-surface)',
  'box-shadow: var(--shadow-level-2)',
]);
check('dock remains below overlay-level commands',
  /\.app-shell__navigation\s*\{[\s\S]*?z-index:\s*var\(--z-content\)/.test(shellCss)
  && /\.app-shell__topbar\s*\{[\s\S]*?z-index:\s*var\(--z-overlay\)/.test(shellCss));
check('mobile shell reserves the middle navigation lane for the amber action', shellCss.includes('.app-shell__nav-slot:nth-child(3) .app-shell__nav-item'));

includesAll('command surface has a premium layered composition', commandCss, [
  '.global-command-surface__hero', 'background: var(--gradient-brand)',
  '.global-command-surface__grid', 'grid-template-columns: repeat(2, minmax(0, 1fr))',
  '.global-command-card--strong', 'background: var(--color-warning-soft)',
  '@media (max-width: 30rem)', 'grid-template-columns: 1fr',
  '@media (prefers-reduced-motion: reduce)',
]);
includesAll('quick-create cards keep amber and brand hierarchy', commandCss, [
  '.global-create-card--primary', 'background: var(--color-brand-strong)',
  '.global-create-card__index', 'background: var(--color-warning)',
]);

check('product shell stylesheet remains bounded', lineCount(shellCss) <= 400);
check('global tool rail stylesheet remains bounded', lineCount(railCss) <= 360);
check('command surface stylesheet remains bounded', lineCount(commandCss) <= 300);
check('shell proof stylesheet remains bounded', lineCount(proofCss) <= 120);

const rebuiltCss = `${shellCss}\n${railCss}\n${commandCss}\n${proofCss}`;
check('rebuild CSS has no raw color literals', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(rebuiltCss));
check('rebuild CSS has no important escape hatch', !/!important/i.test(rebuiltCss));
check('rebuild CSS has no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(rebuiltCss));
check('rebuild CSS has no transition-all', !/transition\s*:\s*all\b/i.test(rebuiltCss));
check('rebuild CSS keeps logical horizontal positioning', !/(?:margin-left|margin-right|padding-left|padding-right|\bleft|\bright)\s*:/i.test(rebuiltCss));

const appIndex = foundation.indexOf("@import './app-shell.css';");
const proofIndex = foundation.indexOf("@import './shell-proof.css';");
const railIndex = foundation.indexOf("@import './global-interactions.css';");
const commandIndex = foundation.indexOf("@import './global-command-surfaces.css';");
check('shell proof is split after product shell', appIndex >= 0 && proofIndex > appIndex);
check('command surfaces are split after the global tool rail', railIndex >= 0 && commandIndex > railIndex);
check('Phase 3.4 destruction stylesheet remains terminal', foundation.trim().endsWith("@import './shell-destruction-lab.css';"));

if (failures.length) {
  console.error(`ENJAZ VISUAL IDENTITY 3 SHELL AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ VISUAL IDENTITY 3 SHELL AUDIT PASS — ${checks}/${checks} chrome/dock/quick-create/command/mobile/RTL/token invariants passed.`);
