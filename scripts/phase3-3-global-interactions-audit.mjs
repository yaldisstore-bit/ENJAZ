import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) { return readFile(resolve(root, path), 'utf8'); }
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function numericConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} = (\\d+);`));
  return match ? Number(match[1]) : Number.NaN;
}

const interactionContract = await text('src/core/interactions/globalInteractionContract.ts');
const surfaces = await text('src/shared/interactions/GlobalInteractionSurfaces.tsx');
const frame = await text('src/shared/shell/AppShellFrame.tsx');
const shell = await text('src/app/AppShell.tsx');
const routes = await text('src/core/routing/routes.ts');
const navigationContract = await text('src/core/routing/navigationContract.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const lab = await text('src/features/foundation/pages/GlobalInteractionLabPage.tsx');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');
const css = await text('src/styles/global-interactions.css');
const labCss = await text('src/styles/global-interactions-lab.css');
const foundationCss = await text('src/styles/foundation.css');
const version = await text('src/core/version/version.ts');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const roadmap = await text('docs/ENJAZ_MASTER_ROADMAP.md');
const doc = await text('docs/PHASE_3_3_GLOBAL_INTERACTION_SURFACES.md');
const readme = await text('README.md');

const surfaceIds = [...interactionContract.matchAll(/id: '(search|inbox|quickCreate|control)'/g)].map((match) => match[1]);
check('global interaction contract declares exactly four surface records', surfaceIds.length === 4, `count=${surfaceIds.length}`);
check('global surface ids are unique', new Set(surfaceIds).size === 4);
check('global surface order is frozen', JSON.stringify(surfaceIds) === JSON.stringify(['search', 'inbox', 'quickCreate', 'control']));
check('global surface count constant is exactly four', numericConst(interactionContract, 'GLOBAL_INTERACTION_SURFACE_COUNT') === 4, `value=${numericConst(interactionContract, 'GLOBAL_INTERACTION_SURFACE_COUNT')}`);

for (const marker of [
  "GlobalInteractionSurfaceId = 'search' | 'inbox' | 'quickCreate' | 'control'",
  "GlobalInteractionGlyph = 'search' | 'inbox' | 'plus' | 'command'",
  "GlobalInteractionPresentation = 'dialog' | 'route' | 'sheet'",
  "presentation: 'dialog'",
  "presentation: 'route'",
  "presentation: 'sheet'",
  'GLOBAL_INTERACTION_ENTRIES',
]) check(`global contract preserves ${marker}`, interactionContract.includes(marker));

check('global search minimum query length is exactly two', numericConst(interactionContract, 'GLOBAL_SEARCH_MIN_QUERY_LENGTH') === 2, `value=${numericConst(interactionContract, 'GLOBAL_SEARCH_MIN_QUERY_LENGTH')}`);
check('global search result limit is exactly eight', numericConst(interactionContract, 'GLOBAL_SEARCH_RESULT_LIMIT') === 8, `value=${numericConst(interactionContract, 'GLOBAL_SEARCH_RESULT_LIMIT')}`);
check('global inbox badge maximum is exactly 99', numericConst(interactionContract, 'GLOBAL_INBOX_BADGE_MAX') === 99, `value=${numericConst(interactionContract, 'GLOBAL_INBOX_BADGE_MAX')}`);
for (const marker of [
  'normalizeGlobalInteractionQuery',
  "value.trim().replace(/\\s+/g, ' ')",
  'searchGlobalNavigation',
  'PRODUCT_NAVIGATION_ROUTES',
  'GLOBAL_SEARCH_MIN_QUERY_LENGTH',
  'GLOBAL_SEARCH_RESULT_LIMIT',
  '.slice(0, GLOBAL_SEARCH_RESULT_LIMIT)',
  'formatInboxBadge',
  'Number.isFinite(count)',
  'Math.floor(count)',
  'GLOBAL_INBOX_BADGE_MAX',
]) check(`search/badge contract proves ${marker}`, interactionContract.includes(marker));
check('global search contract has no database dependency', !/supabase|createDataLayer|DataLayerContext|WorkspaceDataGateway|repository/i.test(interactionContract));
check('global contract performs no direct writes', !/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/.test(interactionContract));

const quickIntentRecords = [...interactionContract.matchAll(/id: '(newTransaction|newCompany|newFollowUp)'[\s\S]*?routeId: '(transactions|companies|followUps)'[\s\S]*?deliveryPhase: getProductNavigationRouteById\('(?:transactions|companies|followUps)'\)\.deliveryPhase[\s\S]*?contentState: 'reserved'/g)]
  .map((match) => ({ id: match[1], routeId: match[2] }));
check('quick create declares exactly three delegated intents', quickIntentRecords.length === 3, `count=${quickIntentRecords.length}`);
check('quick create intent ids are unique', new Set(quickIntentRecords.map((record) => record.id)).size === 3);
check('quick create route owners are exact', JSON.stringify(quickIntentRecords.map((record) => record.routeId)) === JSON.stringify(['transactions', 'companies', 'followUps']));
for (const marker of [
  "id: 'newTransaction'",
  "routeId: 'transactions'",
  "getProductNavigationRouteById('transactions').deliveryPhase",
  "id: 'newCompany'",
  "routeId: 'companies'",
  "getProductNavigationRouteById('companies').deliveryPhase",
  "id: 'newFollowUp'",
  "routeId: 'followUps'",
  "getProductNavigationRouteById('followUps').deliveryPhase",
  "contentState: 'reserved'",
]) check(`quick create delegation preserves ${marker}`, interactionContract.includes(marker));
check('quick create never declares an implemented action', !interactionContract.includes("contentState: 'implemented'"));

const inboxBlock = interactionContract.match(/INBOX_TARGETS = Object\.freeze\(\[([\s\S]*?)\]\s+as const\)/)?.[1] ?? '';
const controlBlock = interactionContract.match(/CONTROL_TARGETS = Object\.freeze\(\[([\s\S]*?)\]\s+as const\)/)?.[1] ?? '';
check('Inbox delegates to notifications', inboxBlock.includes("toDelegatedTarget('notifications')"));
check('Inbox delegates to follow-ups', inboxBlock.includes("toDelegatedTarget('followUps')"));
check('Inbox has no unrelated control target', !/operations|command/.test(inboxBlock));
check('Control delegates to operations', controlBlock.includes("toDelegatedTarget('operations')"));
check('Control delegates to command', controlBlock.includes("toDelegatedTarget('command')"));
check('Control has no unrelated inbox target', !/notifications|followUps/.test(controlBlock));

const productRecords = [...navigationContract.matchAll(/\{ id: '([^']+)', label: '[^']+', path: ROUTES\.(app\w+), deliveryPhase: '(\d+)', permission: 'authenticated', contentState: 'reserved' \}/g)];
const appRouteEntries = [...routes.matchAll(/^\s+(app[A-Z]\w+): '([^']+)',/gm)];
check('Phase 3.3 does not alter eighteen product-domain roots', productRecords.length === 18, `count=${productRecords.length}`);
check('Phase 3.3 does not invent a twentieth app route', appRouteEntries.length === 19, `count=${appRouteEntries.length}`);
check('global interaction proof route is outside product namespace', routes.includes("interactionsPreview: '/foundation/interactions'"));
check('navigation content remains reserved', !navigationContract.includes("contentState: 'implemented'"));
const primaryNavigationBlock = navigationContract.match(/export const PRIMARY_NAVIGATION = Object\.freeze\(\[([\s\S]*?)\]\s+as const satisfies readonly PrimaryNavigationItem\[\]\);/)?.[1] ?? '';
const primarySlotIds = [...primaryNavigationBlock.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1]);
check('bottom navigation remains exactly five primary slots', primarySlotIds.length === 5, `count=${primarySlotIds.length}`);
check('bottom navigation preserves frozen primary slot order', JSON.stringify(primarySlotIds) === JSON.stringify(['home', 'work', 'transactions', 'companies', 'more']));

for (const marker of [
  "import { BottomSheet, Dialog, TextField }",
  "import { Link } from 'react-router'",
  '<Dialog',
  '<BottomSheet',
  '<TextField',
  'aria-haspopup="dialog"',
  'aria-expanded={searchOpen}',
  'aria-expanded={quickCreateOpen}',
  'aria-expanded={controlOpen}',
  'aria-live="polite"',
  'searchGlobalNavigation(query)',
  'formatInboxBadge(inboxCount)',
  'to={inboxTarget.targetPath}',
  'QUICK_CREATE_INTENTS.map',
  'CONTROL_TARGETS.map',
  'onClick={closeSearch}',
]) check(`global surfaces prove ${marker}`, surfaces.includes(marker));
check('global surfaces have no inline style bypass', !/\bstyle\s*=\s*\{/.test(surfaces));
check('global surfaces contain no Supabase/data-layer dependency', !/supabase|createDataLayer|DataLayerContext|WorkspaceDataGateway|repository/i.test(surfaces));
check('global surfaces contain no direct business mutation', !/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/.test(surfaces));
check('global surfaces disclose reserved business search boundary', surfaces.includes('البحث داخل بيانات المجالات'));
check('global surfaces disclose delegated create ownership', surfaces.includes('نماذج الإنشاء') && surfaces.includes('يفوّض التنفيذ'));

check('App Shell imports global interaction surfaces', frame.includes("GlobalInteractionSurfaces") && frame.includes("../interactions/GlobalInteractionSurfaces.tsx"));
check('App Shell mounts global interactions exactly once', (frame.match(/<GlobalInteractionSurfaces/g) ?? []).length === 1);
check('App Shell passes bounded inbox count prop', frame.includes('inboxCount?: number') && frame.includes('inboxCount = 0') && frame.includes('inboxCount={inboxCount}'));
check('App Shell retains five frozen bottom navigation slots', frame.includes('SHELL_NAV_SLOTS.map'));
check('App Shell retains canonical active navigation', frame.includes('resolvePrimaryNavigation(normalizedPath)'));
check('App Shell retains safe back resolution', frame.includes('resolveBackDestination(normalizedPath)'));
check('App Shell frame has no domain data access', !/supabase|createDataLayer|DataLayerContext|WorkspaceDataGateway/i.test(frame));
check('AppShell composition remains auth/network owner', shell.includes('useAuth()') && shell.includes("window.addEventListener('online'") && shell.includes('await service.signOut()'));

check('real router mounts interaction lab', router.includes('GlobalInteractionLabPage') && router.includes('ROUTES.interactionsPreview'));
check('preview router mounts interaction lab', previewRouter.includes('GlobalInteractionLabPage') && previewRouter.includes('ROUTES.interactionsPreview'));
check('preview router preserves Pages basename', previewRouter.includes('basename: import.meta.env.BASE_URL'));
check('real protected product routes remain under AppShell', router.indexOf('Component: AppShell') < router.indexOf('...reservedProductRoutes'));
check('interaction lab route is not added to reserved product routes', !interactionContract.includes('interactionsPreview'));

for (const marker of [
  'Phase 3.3 · Global Interaction Surfaces',
  '<GlobalInteractionSurfaces inboxCount={20} />',
  'GLOBAL_INTERACTION_ENTRIES.map',
  'GLOBAL_SEARCH_MIN_QUERY_LENGTH',
  'GLOBAL_SEARCH_RESULT_LIMIT',
  'QUICK_CREATE_INTENTS.length',
  'INBOX_TARGETS.length',
  'CONTROL_TARGETS.length',
  'ROUTES.navigationPreview',
  'ROUTES.foundation',
]) check(`interaction lab proves ${marker}`, lab.includes(marker));
check('interaction lab has no production data access', !/supabase|useAuth|DataLayerContext|createDataLayer/i.test(lab));
check('foundation status exposes 3.3 name', statusPage.includes('Global Interaction Surfaces 3.3'));
check('foundation status links the 3.3 proof route', statusPage.includes('ROUTES.interactionsPreview'));

check('global interaction CSS loads after navigation CSS', foundationCss.indexOf("@import './global-interactions.css';") > foundationCss.indexOf("@import './navigation.css';"));
check('global interaction lab CSS loads after global interaction CSS', foundationCss.indexOf("@import './global-interactions-lab.css';") > foundationCss.indexOf("@import './global-interactions.css';"));
check('global interaction CSS stays under architectural budget', css.split(/\r?\n/).length <= 360, `lines=${css.split(/\r?\n/).length}`);
check('interaction lab CSS stays under architectural budget', labCss.split(/\r?\n/).length <= 180, `lines=${labCss.split(/\r?\n/).length}`);
for (const [name, stylesheet] of [['interaction CSS', css], ['interaction lab CSS', labCss]]) {
  check(`${name} has no raw color literal`, !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(stylesheet));
  check(`${name} has no important override`, !/!important/i.test(stylesheet));
  check(`${name} has no numeric z-index`, !/z-index\s*:\s*-?\d+/i.test(stylesheet));
  check(`${name} avoids transition all`, !/transition\s*:\s*all\b/i.test(stylesheet));
  check(`${name} avoids physical horizontal spacing`, !/(?:margin-left|margin-right|padding-left|padding-right|left|right)\s*:/i.test(stylesheet));
  check(`${name} has no raw sub-13px font size`, !/font-size\s*:\s*(?:[0-9]|1[0-2](?:\.\d+)?)px\b/i.test(stylesheet));
}
check('global interaction rail remains four columns', css.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'));
check('global controls preserve touch floor', css.includes('min-block-size: var(--size-touch-min)'));
check('interaction styles preserve focus visibility', css.includes(':focus-visible') && css.includes('var(--color-focus)'));
check('interaction hover motion is capability scoped', css.includes('@media (hover: hover) and (pointer: fine)'));
check('interaction styles include phone adaptation', css.includes('@media (max-width: 48rem)'));
check('interaction styles include reduced-motion contract', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('var(--duration-reduced-motion)'));
check('interaction long text can wrap', css.includes('overflow-wrap: anywhere'));

check('application version declares Phase 3.3', version.includes("APP_VERSION = '0.10.0-phase3.3'"));
check('package version declares Phase 3.3', packageJson.version === '0.10.0-phase3.3');
check('interaction audit script is registered', packageJson.scripts?.['audit:interactions'] === 'node scripts/phase3-3-global-interactions-audit.mjs');
check('interaction selftest script is registered', packageJson.scripts?.['audit:interactions:selftest'] === 'node scripts/phase3-3-global-interactions-selftest.mjs');
check('Phase 3.3 gate extends immutable Phase 3.2 gate', packageJson.scripts?.['verify:phase3.3'] === 'npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap');
check('Phase 3.2 gate command remains unchanged', packageJson.scripts?.['verify:phase3.2'] === 'npm run verify:phase3.1 && npm run audit:navigation && npm run audit:navigation:selftest && npm run audit:roadmap');
check('GitHub quality gate covers Phase 3.3', workflow.includes('Full Phase 3.3 verification') && workflow.includes('npm run verify:phase3.3'));

const phase32 = roadmap.indexOf('## 3.2 — Navigation Architecture');
const phase33 = roadmap.indexOf('## 3.3 — Global Interaction Surfaces');
const phase34 = roadmap.indexOf('## 3.4 — Shell Destruction Gate');
check('roadmap retains 3.2, 3.3 and 3.4 headings', [phase32, phase33, phase34].every((position) => position >= 0));
check('roadmap retains 3.2 → 3.3 → 3.4 order', phase32 < phase33 && phase33 < phase34);
for (const marker of [
  'Global search entry point.',
  'Notification/inbox entry point.',
  'Global create/quick-action entry point where justified.',
  'Command/operations entry point without duplicating domain logic.',
]) check(`roadmap preserves Phase 3.3 scope: ${marker}`, roadmap.indexOf(marker) > phase33 && roadmap.indexOf(marker) < phase34);
check('roadmap keeps shell torture in 3.4', roadmap.indexOf('Keyboard/back/rotation/navigation torture.') > phase34);

for (const marker of [
  'Global Search',
  'Notification / Inbox',
  'Quick Create',
  'Command / Operations',
  '/foundation/interactions',
  '99+',
  'Phase 3.4 — Shell Destruction Gate',
  'verify:phase3.3',
  'destructive selftest',
  'merged `main`',
  'GitHub Pages',
]) check(`Phase 3.3 documentation contains ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));

for (const marker of [
  'Phase 3.2 — Navigation Architecture',
  'Phase 3.3 — Global Interaction Surfaces',
  'Phase 3.4 — Shell Destruction Gate',
]) check(`README preserves ${marker}`, readme.includes(marker));

if (failures.length) {
  console.error(`ENJAZ PHASE 3.3 GLOBAL INTERACTIONS AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 3.3 GLOBAL INTERACTIONS AUDIT PASS — ${checks}/${checks} search/inbox/quick-create/control, delegation, accessibility, mobile/RTL, token and gate invariants satisfied.`);
