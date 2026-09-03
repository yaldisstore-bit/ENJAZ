import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase3-3-global-interactions-audit.mjs');
const tokenAuditPath = resolve(root, 'scripts/phase2-2-token-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-global-interactions-selftest-'));

const scenarios = [
  { name: 'remove search surface id', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("id: 'search'", "id: 'searchRemoved'") },
  { name: 'duplicate inbox as search surface', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("id: 'inbox'", "id: 'search'") },
  { name: 'lower search floor to one character', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace('GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2', 'GLOBAL_SEARCH_MIN_QUERY_LENGTH = 1') },
  { name: 'remove bounded search slice', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace('.slice(0, GLOBAL_SEARCH_RESULT_LIMIT)', '.slice(0)') },
  { name: 'raise inbox badge cap beyond contract', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace('GLOBAL_INBOX_BADGE_MAX = 99', 'GLOBAL_INBOX_BADGE_MAX = 999') },
  { name: 'prematurely implement quick create intent', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("contentState: 'reserved'", "contentState: 'implemented'") },
  { name: 'misroute transaction quick create owner', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("routeId: 'transactions'", "routeId: 'finance'") },
  { name: 'misdeclare transaction quick create delivery phase source', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("getProductNavigationRouteById('transactions').deliveryPhase", "getProductNavigationRouteById('companies').deliveryPhase") },
  { name: 'remove notifications from Inbox ownership', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("  toDelegatedTarget('notifications'),\n", '') },
  { name: 'misroute operations control target', file: 'src/core/interactions/globalInteractionContract.ts', mutate: (value) => value.replace("toDelegatedTarget('operations')", "toDelegatedTarget('finance')") },
  { name: 'inject sixth primary navigation slot', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("  { id: 'more', label: 'المزيد', path: ROUTES.appMore, routeIds: SECONDARY_NAVIGATION_ROUTE_IDS },\n] as const satisfies readonly PrimaryNavigationItem[]);", "  { id: 'more', label: 'المزيد', path: ROUTES.appMore, routeIds: SECONDARY_NAVIGATION_ROUTE_IDS },\n  { id: 'rogue', label: 'زائد', path: ROUTES.appMore, routeIds: [] },\n] as const satisfies readonly PrimaryNavigationItem[]);") },
  { name: 'inject Supabase dependency into global surfaces', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => `import { createClient as supabaseCreateClient } from '@supabase/supabase-js';\n${value}` },
  { name: 'inject direct write into global surfaces', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => `${value}\nvoid fakeGateway.insert({});\n` },
  { name: 'replace search dialog primitive', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => value.replace('<Dialog\n        id="global-search"', '<BottomSheet\n        id="global-search"') },
  { name: 'remove search expanded semantics', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => value.replace('            aria-expanded={searchOpen}\n', '') },
  { name: 'remove live search result semantics', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => value.replace(' aria-live="polite"', '') },
  { name: 'remove delegated create ownership disclosure', file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx', mutate: (value) => value.replace('يفوّض التنفيذ', 'ينقل المستخدم') },
  { name: 'remove single App Shell global mount', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('        <GlobalInteractionSurfaces inboxCount={inboxCount} />\n', '') },
  { name: 'duplicate App Shell global mount', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('        <GlobalInteractionSurfaces inboxCount={inboxCount} />', '        <GlobalInteractionSurfaces inboxCount={inboxCount} />\n        <GlobalInteractionSurfaces inboxCount={inboxCount} />') },
  { name: 'remove real interaction proof route', file: 'src/app/router.tsx', mutate: (value) => value.replace('  { path: ROUTES.interactionsPreview, Component: GlobalInteractionLabPage },\n', '') },
  { name: 'remove preview interaction proof route', file: 'src/app/previewRouter.tsx', mutate: (value) => value.replace('  { path: ROUTES.interactionsPreview, Component: GlobalInteractionLabPage },\n', '') },
  { name: 'detach Foundation status interaction proof link', file: 'src/features/foundation/pages/FoundationStatusPage.tsx', mutate: (value) => value.replace('to={ROUTES.interactionsPreview}>فتح Global Interaction Surfaces 3.3', 'to={ROUTES.root}>فتح Global Interaction Surfaces 3.3') },
  { name: 'remove real Global Interaction Lab component proof', file: 'src/features/foundation/pages/GlobalInteractionLabPage.tsx', mutate: (value) => value.replace('<GlobalInteractionSurfaces inboxCount={20} />', '<p>proof removed</p>') },
  { name: 'raw global interaction color escape', file: 'src/styles/global-interactions.css', mutate: (value) => `${value}\n.global-regression { color: #ff0000; }\n` },
  { name: 'unknown global interaction design token', file: 'src/styles/global-interactions.css', auditPath: tokenAuditPath, mutate: (value) => value.replace('background: var(--color-surface-raised);', 'background: var(--color-global-fake);') },
  { name: 'important global interaction override', file: 'src/styles/global-interactions.css', mutate: (value) => `${value}\n.global-regression { display: block !important; }\n` },
  { name: 'tiny global interaction text', file: 'src/styles/global-interactions.css', mutate: (value) => `${value}\n.global-regression { font-size: 10px; }\n` },
  { name: 'numeric z-index escape', file: 'src/styles/global-interactions.css', mutate: (value) => `${value}\n.global-regression { z-index: 9999; }\n` },
  { name: 'transition all escape', file: 'src/styles/global-interactions.css', mutate: (value) => `${value}\n.global-regression { transition: all 1s; }\n` },
  { name: 'remove global reduced-motion contract', file: 'src/styles/global-interactions.css', mutate: (value) => value.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 999rem)') },
  { name: 'remove global interaction stylesheet import', file: 'src/styles/foundation.css', mutate: (value) => value.replace("@import './global-interactions.css';\n", '') },
  { name: 'downgrade application version from Phase 3.3', file: 'src/core/version/version.ts', mutate: (value) => value.replace("0.10.0-phase3.3", "0.10.0-phase3.2") },
  { name: 'downgrade package version from Phase 3.3', file: 'package.json', mutate: (value) => value.replace('"version": "0.10.0-phase3.3"', '"version": "0.10.0-phase3.2"') },
  { name: 'downgrade Phase 3.3 verification chain', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap', 'npm run verify:phase3.2') },
  { name: 'mutate immutable Phase 3.2 verification chain', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase3.1 && npm run audit:navigation && npm run audit:navigation:selftest && npm run audit:roadmap', 'npm run verify:phase3.1') },
  { name: 'downgrade GitHub quality workflow to Phase 3.2', file: '.github/workflows/enjaz-quality-gate.yml', mutate: (value) => value.replace('Full Phase 3.3 verification', 'Full Phase 3.2 verification').replace('npm run verify:phase3.3', 'npm run verify:phase3.2') },
  { name: 'remove Global Search documentation proof', file: 'docs/PHASE_3_3_GLOBAL_INTERACTION_SURFACES.md', mutate: (value) => value.replaceAll('Global Search', 'Section Finder') },
  { name: 'break Phase 3.3 roadmap heading', file: 'docs/ENJAZ_MASTER_ROADMAP.md', mutate: (value) => value.replace('## 3.3 — Global Interaction Surfaces', '## 3.5 — Global Interaction Surfaces') },
  { name: 'remove README Phase 3.3 marker', file: 'README.md', mutate: (value) => value.replaceAll('Phase 3.3 — Global Interaction Surfaces', 'Phase 3.3 — Interaction Work') },
];

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  const parts = rel.split(sep);
  return !parts.some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

let rejected = 0;
try {
  for (const [index, scenario] of scenarios.entries()) {
    const fixture = join(tempRoot, `case-${index + 1}`);
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) {
      console.error(`SELFTEST SETUP FAIL — mutation did not change ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    await writeFile(target, mutated, 'utf8');
    const scenarioAuditPath = scenario.auditPath ?? auditPath;
    const result = spawnSync(process.execPath, [scenarioAuditPath, fixture], { encoding: 'utf8' });
    if (result.status === 0) {
      console.error(`SELFTEST FAIL — global interaction audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 3.3 GLOBAL INTERACTIONS SELFTEST PASS — ${rejected}/${scenarios.length} deliberate search/inbox/quick-create/control/mobile/token/gate regressions rejected.`);
