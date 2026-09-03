import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase4-1-home-audit.mjs');

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  return !rel.split(sep).some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

const scenarios = [
  {
    name: 'resolve workspace from wrong table',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (value) => value.replace(".from('workspace_memberships')", ".from('workspaces')"),
  },
  {
    name: 'remove authenticated user membership filter',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (value) => value.replace(".eq('user_id', safeUserId)", ".eq('role', 'owner')"),
  },
  {
    name: 'bypass user UUID validation',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (value) => value.replace("const safeUserId = requireUuid(userId, 'user id');", 'const safeUserId = userId.trim();'),
  },
  {
    name: 'make workspace selection non-deterministic',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (value) => value.replace(".order('created_at', { ascending: true })", ".order('created_at', { ascending: false })"),
  },
  {
    name: 'allow multiple membership rows in resolver',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (value) => value.replace('.range(0, 0)', '.range(0, 5)'),
  },
  {
    name: 'derive workspace from user id in Home service',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace('const workspaceId = await factory.resolveWorkspaceId(userId);', 'const workspaceId = userId;'),
  },
  {
    name: 'inflate Home source page size',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace('const HOME_PAGE_SIZE = 100;', 'const HOME_PAGE_SIZE = 1000;'),
  },
  {
    name: 'remove non-progressing pagination failure',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace("if (page.items.length === 0) throw new Error('Non-progressing dashboard data page');", 'if (page.items.length === 0) return Object.freeze(rows);'),
  },
  {
    name: 'load archived transactions into Home source',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace("{ column: 'archived_at', operator: 'is', value: null },", ''),
  },
  {
    name: 'load deleted transactions into Home source',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace("{ column: 'deleted_at', operator: 'is', value: null },", ''),
  },
  {
    name: 'load completed transactions into Home source',
    file: 'src/features/home/homeDashboardService.ts',
    mutate: (value) => value.replace("{ column: 'status', operator: 'neq', value: 'completed' },", ''),
  },
  {
    name: 'make archived transaction active in model',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('transaction.archived_at === null && ', ''),
  },
  {
    name: 'regress archived followup metric leak',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace("followup.status === 'open' && activeIds.has(followup.transaction_id)", "followup.status === 'open'"),
  },
  {
    name: 'invert snooze eligibility',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('parseInstant(followup.snoozed_until) <= nowMs', 'parseInstant(followup.snoozed_until) >= nowMs'),
  },
  {
    name: 'invert overdue comparison',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('parseInstant(followup.due_at) < nowMs', 'parseInstant(followup.due_at) > nowMs'),
  },
  {
    name: 'allow archived blockers in operational signals',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace("blocker.status === 'open' && activeIds.has(blocker.transaction_id)", "blocker.status === 'open'"),
  },
  {
    name: 'allow archived payments in Home finance',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace("payment.status === 'posted' && activeIds.has(payment.transaction_id)", "payment.status === 'posted'"),
  },
  {
    name: 'count reversed payments',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace("payment.status === 'posted' && activeIds.has(payment.transaction_id)", "payment.status !== 'void' && activeIds.has(payment.transaction_id)"),
  },
  {
    name: 'expand visible priority density from six to sixty',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('HOME_PRIORITY_LIMIT = 6', 'HOME_PRIORITY_LIMIT = 60'),
  },
  {
    name: 'downgrade critical blocker below other work',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace("blocker.severity === 'critical' ? 120 : 105", "blocker.severity === 'critical' ? 70 : 105"),
  },
  {
    name: 'promote urgent transaction above critical blocker',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('score: 90,', 'score: 130,'),
  },
  {
    name: 'remove deterministic priority ordering',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('right.score - left.score || left.id.localeCompare(right.id)', 'left.score - right.score'),
  },
  {
    name: 'disable money safe-integer guard',
    file: 'src/features/home/homeDashboardModel.ts',
    mutate: (value) => value.replace('if (!Number.isSafeInteger(Math.round(value * 100))) precisionSafe = false;', 'if (false) precisionSafe = false;'),
  },
  {
    name: 'remove unsafe financial precision disclosure',
    file: 'src/features/home/pages/HomeDashboardPage.tsx',
    mutate: (value) => value.replace('تجاوزت بعض القيم نطاق الحساب الآمن في JavaScript', 'هذه القيم نهائية ودقيقة'),
  },
  {
    name: 'replace real Home route with reserved boundary',
    file: 'src/app/router.tsx',
    mutate: (value) => value.replace('{ path: ROUTES.appHome, Component: HomeDashboardPage }', '{ path: ROUTES.appHome, Component: NavigationBoundaryPage }'),
  },
  {
    name: 'remove deterministic Home proof route',
    file: 'src/app/router.tsx',
    mutate: (value) => value.replace('  { path: ROUTES.homePreview, Component: HomeDashboardPreviewPage },\n', ''),
  },
  {
    name: 'remove safe preview shell mapping for app Home',
    file: 'src/app/previewRouter.tsx',
    mutate: (value) => value.replace('{ path: ROUTES.appHome, Component: HomeAppPreviewPage }', '{ path: ROUTES.appHome, Component: NavigationPreviewAppPage }'),
  },
  {
    name: 'strip App Shell from Home preview wrapper',
    file: 'src/features/home/pages/HomeAppPreviewPage.tsx',
    mutate: (value) => value.replace('<AppShellFrame', '<div').replace('</AppShellFrame>', '</div>'),
  },
  {
    name: 'prematurely implement Daily Work 4.2',
    file: 'src/core/routing/navigationContract.ts',
    mutate: (value) => value.replace("id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved'", "id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented'"),
  },
  {
    name: 'inject raw product color',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => `${value}\n.home-dashboard { color: #ff0000; }\n`,
  },
  {
    name: 'inject important escape hatch',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => `${value}\n.home-dashboard { display: block !important; }\n`,
  },
  {
    name: 'inject numeric z-index escalation',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => `${value}\n.home-dashboard { z-index: 999; }\n`,
  },
  {
    name: 'inject transition all',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => `${value}\n.home-dashboard { transition: all var(--duration-fast) var(--easing-standard); }\n`,
  },
  {
    name: 'inject physical RTL-breaking positioning',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => `${value}\n.home-dashboard { margin-left: var(--space-4); }\n`,
  },
  {
    name: 'remove reduced motion contract',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('@media (prefers-reduced-motion: reduce)', '@media (prefers-reduced-motion: no-preference)'),
  },
  {
    name: 'downgrade application version to Phase 3.4',
    file: 'src/core/version/version.ts',
    mutate: (value) => value.replace("0.11.0-phase4.1", '0.10.0-phase3.4'),
  },
  {
    name: 'downgrade package version to Phase 3.4',
    file: 'package.json',
    mutate: (value) => value.replace('"version": "0.11.0-phase4.1"', '"version": "0.10.0-phase3.4"'),
  },
  {
    name: 'downgrade GitHub workflow to Phase 3.4 gate',
    file: '.github/workflows/enjaz-quality-gate.yml',
    mutate: (value) => value.replace('Full Phase 4.1 verification', 'Full Phase 3.4 verification').replace('npm run verify:phase4.1', 'npm run verify:phase3.4'),
  },
  {
    name: 'remove Phase 4.1 verification command',
    file: 'package.json',
    mutate: (value) => value.replace('"verify:phase4.1": "npm run verify:phase3.4 && npm run audit:home && npm run audit:home:selftest && npm run audit:roadmap"', '"verify:phase4.1": "npm run verify:phase3.4"'),
  },
  {
    name: 'restore legacy navigation audit directly',
    file: 'package.json',
    mutate: (value) => value.replace('"audit:navigation": "node scripts/phase3-2-forward-compat-audit.mjs"', '"audit:navigation": "node scripts/phase3-2-navigation-audit.mjs"'),
  },
  {
    name: 'restore legacy shell destruction audit directly',
    file: 'package.json',
    mutate: (value) => value.replace('"audit:shell-destruction": "node scripts/phase3-4-forward-compat-audit.mjs"', '"audit:shell-destruction": "node scripts/phase3-4-shell-destruction-audit.mjs"'),
  },
  {
    name: 'remove terminal Phase 3.4 destruction stylesheet',
    file: 'src/styles/foundation.css',
    mutate: (value) => value.replace("@import './shell-destruction-lab.css';\n", ''),
  },
  {
    name: 'claim Phase 4.2 has started in documentation',
    file: 'README.md',
    mutate: (value) => value.replace('Phase 4.2 — Daily Work / Universal Inbox** ⏳ not started', 'Phase 4.2 — Daily Work / Universal Inbox** 🚧 CURRENT'),
  },
];

let rejected = 0;
for (const [index, scenario] of scenarios.entries()) {
  const fixture = await mkdtemp(join(tmpdir(), `enjaz-home41-${index + 1}-`));
  try {
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) throw new Error(`Mutation did not change fixture: ${scenario.name}`);
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [audit, fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`Phase 4.1 audit accepted deliberate regression: ${scenario.name}`);
    rejected += 1;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

console.log(`ENJAZ PHASE 4.1 HOME SELFTEST PASS — ${rejected}/${scenarios.length} deliberate workspace/data/lifecycle/finance/UI/phase-gate regressions rejected.`);
