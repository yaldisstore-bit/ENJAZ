import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;
const text = (path) => readFile(resolve(root, path), 'utf8');
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const block = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
};
const includesAll = (label, source, markers) => {
  for (const marker of markers) check(`${label}: ${marker}`, source.includes(marker));
};

const [shellCss, shellMobileCss, railCss, commandCss, homeCss, reservedCss, interactions, homePage, boundaryPage, foundation] = await Promise.all([
  'src/styles/app-shell.css',
  'src/styles/app-shell-mobile-recomposition.css',
  'src/styles/global-interactions.css',
  'src/styles/global-command-surfaces.css',
  'src/styles/home-dashboard.css',
  'src/styles/reserved-boundary.css',
  'src/shared/interactions/GlobalInteractionSurfaces.tsx',
  'src/features/home/pages/HomeDashboardPage.tsx',
  'src/features/navigation/pages/NavigationBoundaryPage.tsx',
  'src/styles/foundation.css',
].map(text));

const topbarInner = block(shellCss, '.app-shell__topbar-inner');
const dock = block(shellCss, '.app-shell__navigation');
const dockLayer = block(shellCss, '.app-shell__navigation::after');
const cradle = block(shellCss, '.app-shell__navigation-cradle');
const mobileQuickCreate = railCss.match(/@media \(max-width: 48rem\)[\s\S]*?\.global-interactions__item--accent\s*\{([\s\S]*?)\}/)?.[1] ?? '';
const hero = block(homeCss, '.home-dashboard__hero');
const orb = block(homeCss, '.home-dashboard__attention-orb');
const primaryAction = block(homeCss, '.home-dashboard__primary-action');
const contentGrid = block(homeCss, '.home-dashboard__content-grid');
const metricGrid = block(homeCss, '.home-dashboard__metric-grid');
const commandHero = block(commandCss, '.global-command-surface__hero');
const commandGrid = block(commandCss, '.global-command-surface__grid');
const commandStrong = block(commandCss, '.global-command-card--strong');
const reservedHero = block(reservedCss, '.navigation-boundary__reserved-hero');

includesAll('topbar remains one compact composed row', topbarInner, [
  'display: flex',
  'align-items: center',
  'justify-content: space-between',
  'min-block-size: calc(var(--size-control-lg) + var(--space-4))',
]);
check('topbar may not wrap into the old two-row toolbar shape', !/flex-wrap\s*:\s*wrap/.test(topbarInner));
check('topbar remains width-bounded instead of edge-to-edge clutter', topbarInner.includes('inline-size: min(100%, var(--size-content-max))'));
includesAll('mobile shell recomposition deliberately compacts the top chrome', shellMobileCss, [
  '@media (max-width: 48rem)',
  '.app-shell__topbar',
  'box-shadow: none',
  'border-block-end: var(--border-width-thin) solid var(--color-border)',
  '.app-shell__topbar-inner',
  'padding: var(--space-2) var(--space-3)',
]);
includesAll('mobile topbar tool rail is visually decomposed into separate controls', railCss, [
  '@media (max-width: 48rem)',
  'border: 0',
  'background: transparent',
  'box-shadow: none',
  'border: var(--border-width-thin) solid var(--color-border)',
  'background: var(--color-surface)',
]);

includesAll('dock is a floating layered object', dock, [
  'position: fixed',
  'inset-inline: var(--space-3)',
  'border-radius: var(--radius-xl)',
  'background: var(--color-surface)',
  'box-shadow: var(--shadow-level-3)',
  'isolation: isolate',
]);
includesAll('dock owns a second visual layer', dockLayer, [
  'position: absolute',
  'inset: var(--space-1)',
  'background: var(--color-surface-raised)',
]);
includesAll('dock center cradle uses logical auto-centering that is safe in RTL', cradle, [
  'inset-inline: 0',
  'margin-inline: auto',
  'transform: none',
  'border-radius: var(--radius-pill)',
  'box-shadow: var(--shadow-level-1)',
]);
includesAll('mobile quick create is amber, elevated and RTL-safe centered above the dock', mobileQuickCreate, [
  'position: fixed',
  'inset-inline: 0',
  'margin-inline: auto',
  'transform: none',
  'background: var(--color-warning)',
  'border: var(--space-1) solid var(--color-surface)',
  'box-shadow: var(--shadow-level-3)',
]);
check('broken inline-start plus negative physical translate centering is forbidden',
  !/inset-inline-start\s*:\s*50%[\s\S]{0,240}translateX\(-50%\)/.test(`${shellCss}\n${shellMobileCss}\n${railCss}`));
check('third navigation lane remains a normal usable destination', shellMobileCss.includes('.app-shell__nav-slot:nth-child(3) .app-shell__nav-item { padding-block-start: var(--space-1); }'));

includesAll('home hero keeps the dark editorial composition', hero, [
  'background: var(--gradient-brand)',
  'border-radius: var(--radius-xl)',
  'box-shadow: var(--shadow-level-3)',
  'grid-template-columns: minmax(0, 1fr) auto',
  'overflow: hidden',
]);
includesAll('home keeps a circular visual anchor', orb, [
  'border: var(--space-2) solid var(--color-warning)',
  'border-radius: var(--radius-pill)',
  'background: var(--color-brand-strong)',
]);
includesAll('home primary CTA preserves the amber identity', primaryAction, [
  'background: var(--color-warning)',
  'border-radius: var(--radius-pill)',
  'box-shadow: var(--shadow-level-2)',
]);

includesAll('home metric family keeps four deliberately different tones', homeCss, [
  '.home-focus-card--mint { background: var(--color-accent-teal-soft); }',
  '.home-focus-card--peach { background: var(--color-warning-soft); }',
  '.home-focus-card--cream { background: var(--color-surface); }',
  '.home-focus-card--ink { background: var(--color-brand-strong); color: var(--color-text-on-brand); }',
]);
check('metric area keeps a structured multi-card grid', metricGrid.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'));
check('main dashboard uses intentional asymmetry instead of equal generic columns', contentGrid.includes('grid-template-columns: minmax(0, 1.4fr) minmax(var(--size-grid-card-min), 0.8fr)'));
includesAll('priority rows alternate visual tone', homeCss, [
  '.home-dashboard__priority-list .pattern-risk:nth-child(odd) { background: var(--color-warning-soft); }',
  '.home-dashboard__priority-list .pattern-risk:nth-child(even) { background: var(--color-accent-teal-soft); }',
]);
includesAll('finance panel is a raised tinted composition', homeCss, [
  '.home-dashboard__finance',
  'background: var(--color-accent-teal-soft)',
  'box-shadow: var(--shadow-level-2)',
]);

includesAll('command surface has a strong hero and cards', commandCss, [
  '.global-command-surface__hero',
  'background: var(--gradient-brand)',
  '.global-command-surface__grid',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  '.global-command-card--strong',
]);
includesAll('strong command card keeps its own warm contrast', commandStrong, [
  'background: var(--color-warning-soft)',
  'color: var(--color-warning-text)',
]);
check('command grid remains a card composition', commandGrid.includes('display: grid') && commandGrid.includes('repeat(2, minmax(0, 1fr))'));
const controlStart = interactions.indexOf('id="global-control"');
const controlEnd = interactions.indexOf('</BottomSheet>', controlStart);
const controlSlice = controlStart >= 0 && controlEnd > controlStart ? interactions.slice(controlStart, controlEnd) : '';
check('leadership surface cannot regress to ul/list markup', controlSlice.length > 0 && !/<ul\b|global-surface__list/.test(controlSlice));
check('leadership surface must retain hero + grid + card semantics', /global-command-surface__hero[\s\S]*global-command-surface__grid[\s\S]*global-command-card/.test(controlSlice));

includesAll('reserved route uses one editorial hero rather than a white card wall', reservedHero, [
  'background: var(--gradient-brand)',
  'border-radius: var(--radius-xl)',
  'box-shadow: var(--shadow-level-3)',
  'grid-template-columns: minmax(0, 1fr) auto',
]);
includesAll('reserved route facts use two distinct light tones', reservedCss, [
  '.navigation-boundary__reserved-fact:first-child',
  'background: var(--color-accent-teal-soft)',
  '.navigation-boundary__reserved-fact:last-child',
  'background: var(--color-warning-soft)',
]);
check('reserved boundary stylesheet is loaded after navigation styles',
  foundation.indexOf("@import './reserved-boundary.css';") > foundation.indexOf("@import './navigation.css';"));
check('mobile shell recomposition is loaded after navigation styles',
  foundation.indexOf("@import './app-shell-mobile-recomposition.css';") > foundation.indexOf("@import './navigation.css';"));
check('reserved product route no longer exposes old developer-card labels',
  !['المسار القانوني', 'عقد الوصول', 'حالة المحتوى', 'Deep-link safe root'].some((label) => boundaryPage.includes(label)));
check('reserved product route no longer composes generic Card components', !/<Card\b|CardHeader|CardBody/.test(boundaryPage));
check('reserved product route owns one purposeful hero and compact facts', boundaryPage.includes('navigation-boundary__reserved-hero') && boundaryPage.includes('navigation-boundary__reserved-strip'));

const visualCss = `${shellCss}\n${shellMobileCss}\n${railCss}\n${commandCss}\n${homeCss}\n${reservedCss}`;
for (const level of ['1', '2', '3']) check(`depth system uses shadow level ${level}`, visualCss.includes(`var(--shadow-level-${level})`));
for (const radius of ['lg', 'xl', 'pill']) check(`geometry uses ${radius} radius family`, visualCss.includes(`var(--radius-${radius})`));
const warningUses = (visualCss.match(/var\(--color-warning\)/g) ?? []).length;
check('amber accent is intentional, not token presence only', warningUses >= 8);
check('visual identity avoids square-card regression', !/border-radius\s*:\s*(?:0|var\(--radius-xs\))\s*;/.test(`${hero}\n${dock}\n${commandHero}\n${reservedHero}`));

includesAll('home has dedicated phone reflow', homeCss, [
  '@media (max-width: 36rem)',
  '.home-dashboard__metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }',
  '@media (max-width: 22rem)',
  '.home-dashboard__metric-grid { grid-template-columns: minmax(0, 1fr); }',
]);
includesAll('command cards collapse intentionally on very narrow phones', commandCss, [
  '@media (max-width: 30rem)',
  'grid-template-columns: 1fr',
]);
includesAll('reserved route also collapses intentionally on narrow phones', reservedCss, [
  '@media (max-width: 36rem)',
  '.navigation-boundary__reserved-strip',
  'grid-template-columns: minmax(0, 1fr)',
  '@media (max-width: 22rem)',
]);
check('home page still exposes the designed hero and focus families', homePage.includes('home-dashboard__hero') && homePage.includes('home-focus-card'));

check('no raw color literals in reference-led surfaces', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(visualCss));
check('no !important escape hatch in reference-led surfaces', !/!important/i.test(visualCss));
check('no transition-all cheap motion shortcut', !/transition\s*:\s*all\b/i.test(visualCss));
check('no physical left/right positioning that breaks RTL composition', !/(?:margin-left|margin-right|padding-left|padding-right|\bleft|\bright)\s*:/i.test(visualCss));

if (failures.length) {
  console.error(`ENJAZ VISUAL IDENTITY 3 REFERENCE AUDIT FAIL — ${failures.length}/${checks} design checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ VISUAL IDENTITY 3 REFERENCE AUDIT PASS — ${checks}/${checks} reference-led composition/depth/card/dock/RTL/mobile checks passed.`);
