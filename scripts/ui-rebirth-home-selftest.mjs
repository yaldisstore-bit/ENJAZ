import fs from 'node:fs';
import { auditHomeSources } from './ui-rebirth-home-audit-lib.mjs';

const baseline = Object.freeze({
  component: fs.readFileSync('src/ui-rebirth/runtime/RebirthHomeDashboard.tsx', 'utf8'),
  css: fs.readFileSync('src/ui-rebirth/runtime/rebirth-home.css', 'utf8'),
  interaction: fs.readFileSync('src/ui-rebirth/runtime/rebirth-home-interaction.css', 'utf8'),
  shell: fs.readFileSync('src/ui-rebirth/runtime/RebirthAppShell.tsx', 'utf8'),
  connected: fs.readFileSync('src/ui-rebirth/runtime/RebirthConnectedHomeDashboard.tsx', 'utf8'),
  preview: fs.readFileSync('src/ui-rebirth/preview/homePreviewState.ts', 'utf8'),
});

const mutations = [
  ['disconnect real Home hook', (s) => ({ ...s, connected: s.connected.replace('useHomeDashboard()', '({ status: \'loading\' })') })],
  ['remove retry bridge', (s) => ({ ...s, connected: s.connected.replace('onRetry={state.retry}', '') })],
  ['remove canonical Home route mount', (s) => ({ ...s, shell: s.shell.replace('activeRoute === ROUTES.appHome', 'activeRoute === ROUTES.appMore') })],
  ['remove Home component mount', (s) => ({ ...s, shell: s.shell.replace('<RebirthHomeDashboard', '<section') })],
  ['remove hero composition', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__hero', 'rebirth-home__flat') })],
  ['remove hero score', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__hero-score', 'rebirth-home__score-gone') })],
  ['remove compact stats capsule', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__hero-stats', 'rebirth-home__stats-gone') })],
  ['remove priority mosaic', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__priority-mosaic', 'rebirth-home__priority-list') })],
  ['remove finance module', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__finance', 'rebirth-home__money') })],
  ['remove operational signal stack', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__signal-stack', 'rebirth-home__signals-gone') })],
  ['remove closing action composition', (s) => ({ ...s, component: s.component.replaceAll('rebirth-home__closing', 'rebirth-home__closing-gone') })],
  ['weaken priority-first hierarchy copy', (s) => ({ ...s, component: s.component.replace('الأولوية قبل القائمة', 'كل العناصر') })],
  ['remove today navigation', (s) => ({ ...s, component: s.component.replaceAll('ROUTES.appToday', 'ROUTES.appMore') })],
  ['remove transactions navigation', (s) => ({ ...s, component: s.component.replaceAll('ROUTES.appTransactions', 'ROUTES.appMore').replace('onNavigate(item.destination)', 'onNavigate(ROUTES.appMore)') })],
  ['remove error truthfulness contract', (s) => ({ ...s, component: s.component.replace('لم نعرض أرقامًا غير مؤكدة', 'حدث خطأ') })],
  ['flatten hero gradient', (s) => ({ ...s, css: s.css.replace('linear-gradient(145deg, #ffc85f 0%, var(--ui-gold) 56%, #f1a819 100%)', 'var(--ui-surface)') })],
  ['flatten dominant mobile priority geometry', (s) => ({ ...s, css: s.css.replace('grid-column: 1 / -1;', 'grid-column: auto;') })],
  ['flatten desktop asymmetric grid', (s) => ({ ...s, css: s.css.replace('grid-template-columns: 1.35fr .85fr .85fr;', 'grid-template-columns: repeat(3, 1fr);') })],
  ['remove deep charcoal finance identity', (s) => ({ ...s, css: s.css.replace('var(--ui-charcoal);\n  color: #fff;\n  box-shadow: 0 20px 42px', 'var(--ui-surface);\n  color: #fff;\n  box-shadow: 0 20px 42px') })],
  ['remove compact Android reflow', (s) => ({ ...s, css: s.css.replace('@media (max-width: 390px)', '@media (max-width: 200px)') })],
  ['remove Home reduced motion', (s) => ({ ...s, css: s.css.replace('@media (prefers-reduced-motion: reduce)', '@media (prefers-reduced-motion: no-preference)') })],
  ['allow score to intercept pointer input', (s) => ({ ...s, interaction: s.interaction.replace('pointer-events: none;', 'pointer-events: auto;') })],
  ['restore oversized score tile', (s) => ({ ...s, interaction: s.interaction.replace('inline-size: 112px;\n  block-size: 66px;', 'inline-size: 180px;\n  block-size: 180px;') })],
  ['move score back into CTA lane', (s) => ({ ...s, interaction: s.interaction.replace('inset: auto auto 92px 18px;', 'inset: auto 22px 82px auto;') })],
  ['remove sticky-header scroll safety', (s) => ({ ...s, interaction: s.interaction.replace('scroll-margin-block-start: calc(92px + env(safe-area-inset-top));', 'scroll-margin-block-start: 0;') })],
  ['introduce clickable div anti-pattern', (s) => ({ ...s, component: s.component.replace('<div className="rebirth-home__hero-copy">', '<div className="rebirth-home__hero-copy" onClick={() => undefined}>') })],
  ['remove hero accessible labelling', (s) => ({ ...s, component: s.component.replace('aria-labelledby="rebirth-home-title"', '') })],
  ['remove loading aria-busy', (s) => ({ ...s, component: s.component.replace('aria-busy="true"', '') })],
  ['reintroduce old Home DNA marker', (s) => ({ ...s, css: `${s.css}\n.home-dashboard { display: block; }\n` })],
  ['make preview mutable-looking', (s) => ({ ...s, preview: s.preview.replaceAll('Object.freeze(', '(') })],
];

const baselineFailures = auditHomeSources(baseline);
if (baselineFailures.length) {
  console.error('Home destructive selftest cannot start because the baseline itself fails:');
  for (const failure of baselineFailures) console.error(`- ${failure}`);
  process.exit(1);
}

const escaped = [];
for (const [name, mutate] of mutations) {
  const mutated = mutate(baseline);
  const failures = auditHomeSources(mutated);
  if (!failures.length) escaped.push(name);
}

if (escaped.length) {
  console.error(`ENJAZ Stage 2 Home destructive selftest FAILED: ${escaped.length} deliberate regression(s) escaped.`);
  for (const name of escaped) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`ENJAZ Stage 2 Home destructive selftest passed: ${mutations.length}/${mutations.length} deliberate regressions rejected.`);