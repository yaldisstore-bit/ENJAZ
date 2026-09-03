import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;
const text = (path) => readFile(resolve(root, path), 'utf8');
function check(name, condition) { checks += 1; if (!condition) failures.push(name); }
function includesAll(label, source, markers) { for (const marker of markers) check(`${label}: ${marker}`, source.includes(marker)); }

const [model, service, hook, page, preview, gateway, port, factory, navigation, routes, router, previewRouter, css, foundationCss, homeTests, dataTests, doc, readme, roadmap, version, workflow, navForward, shellForward] = await Promise.all([
  'src/features/home/homeDashboardModel.ts', 'src/features/home/homeDashboardService.ts', 'src/features/home/useHomeDashboard.ts',
  'src/features/home/pages/HomeDashboardPage.tsx', 'src/features/home/pages/HomeDashboardPreviewPage.tsx',
  'src/data/supabase/SupabaseDataGateway.ts', 'src/data/ports/WorkspaceDataGateway.ts', 'src/data/createDataLayer.ts',
  'src/core/routing/navigationContract.ts', 'src/core/routing/routes.ts', 'src/app/router.tsx', 'src/app/previewRouter.tsx',
  'src/styles/home-dashboard.css', 'src/styles/foundation.css', 'tests/homeDashboard.test.ts', 'tests/dataGateway.test.ts',
  'docs/PHASE_4_1_HOME_DASHBOARD.md', 'README.md', 'docs/ENJAZ_MASTER_ROADMAP.md', 'src/core/version/version.ts',
  '.github/workflows/enjaz-quality-gate.yml', 'scripts/phase3-2-forward-compat-audit.mjs', 'scripts/phase3-4-forward-compat-audit.mjs',
].map(text));
const packageJson = JSON.parse(await text('package.json'));

includesAll('workspace contract', `${port}\n${factory}`, [
  'resolveWorkspaceIdForUser(userId: string): Promise<string | null>',
  'resolveWorkspaceId(userId: string)',
  'gateway.resolveWorkspaceIdForUser(userId)',
]);
includesAll('workspace resolver', gateway, [
  "requireUuid(userId, 'user id')", ".from('workspace_memberships')", ".select('workspace_id')", ".eq('user_id', safeUserId)",
  ".order('created_at', { ascending: true })", '.range(0, 0)', 'if (response.data === null) return null',
  'if (response.error) throw normalizeDataFailure(response.error)', "return requireUuid(record.workspace_id, 'workspace id')",
]);
check('Home feature has no direct Supabase dependency', !/supabase|createClient|\.from\s*\(|\.rpc\s*\(/i.test(`${model}\n${service}\n${hook}\n${page}\n${preview}`));
includesAll('workspace regression tests', dataTests, ['workspace_memberships', 'invalid user id', 'returns null when membership is absent', 'DATA_FORBIDDEN']);

check('Home source page size is exactly 100', /const HOME_PAGE_SIZE\s*=\s*100\s*;/.test(service));
includesAll('bounded source loading', service, [
  'let offset = 0', 'limit: HOME_PAGE_SIZE', 'offset += page.items.length',
  "throw new Error('Non-progressing dashboard data page')", 'await Promise.all([', 'layer.transactions', 'layer.followups', 'layer.blockers', 'layer.payments',
]);
includesAll('source lifecycle filters', service, [
  "{ column: 'archived_at', operator: 'is', value: null }", "{ column: 'deleted_at', operator: 'is', value: null }",
  "{ column: 'status', operator: 'neq', value: 'completed' }", "filters: [{ column: 'status', operator: 'eq', value: 'open' }]",
  "filters: [{ column: 'status', operator: 'eq', value: 'posted' }]",
]);
check('workspace resolved before scoped layer', service.indexOf('factory.resolveWorkspaceId(userId)') < service.indexOf('factory.forWorkspace(workspaceId)'));
check('missing workspace fails closed', service.includes('throw new HomeWorkspaceUnavailableError()'));
check('Home never treats user id as workspace id', !/forWorkspace\(userId\)|workspaceId\s*=\s*userId/.test(service));
includesAll('company enrichment boundary', service, ['snapshot.priorities.map((priority) => priority.companyId)', 'company.deleted_at !== null']);

includesAll('active lifecycle model', model, [
  'transaction.deleted_at === null', 'transaction.archived_at === null', "transaction.status !== 'completed'",
  'const activeIds = new Set(activeById.keys())', "followup.status === 'open' && activeIds.has(followup.transaction_id)",
  "blocker.status === 'open' && activeIds.has(blocker.transaction_id)", "payment.status === 'posted' && activeIds.has(payment.transaction_id)",
  'parseInstant(followup.snoozed_until) <= nowMs', 'parseInstant(followup.due_at) < nowMs',
]);
includesAll('archived followup regression', homeTests, [
  'archived work cannot leak into Home metrics', 'assert.equal(result.openFollowups, 3)', 'assert.equal(result.overdueFollowups, 1)',
  "item.id === 'followup:archived-parent'",
]);

check('priority cap is six', /HOME_PRIORITY_LIMIT\s*=\s*6\b/.test(model));
includesAll('priority ordering', model, [
  "blocker.severity === 'critical' ? 120 : 105", '100 + Math.min(overdueDays, 20)', 'score: 90', 'score: 80',
  'right.score - left.score', 'left.id.localeCompare(right.id)', '.slice(0, HOME_PRIORITY_LIMIT)', "destination: '/app/transactions'",
]);
check('no invented transaction detail route', !/\/app\/transactions\/:|transactionId\}/.test(`${model}\n${page}`));
check('priority ordering regression exists', homeTests.includes('priority ranking puts critical blockers before overdue, urgent and stalled work'));

includesAll('finance safety', model, [
  'if (!Number.isFinite(value)) continue', 'Number.isSafeInteger(Math.round(value * 100))', 'Math.max(0,',
  "payment.status === 'posted'", 'activeFees.precisionSafe && collected.precisionSafe',
]);
includesAll('finance truth UI', page, [
  'تجاوزت بعض القيم نطاق الحساب الآمن في JavaScript', 'الدفتر المالي في Phase 7 يبقى المرجع المحاسبي', 'تحصيل العمل النشط',
]);
check('unsafe money regression exists', homeTests.includes('home never reports unsafe large money values as precision-safe'));

includesAll('async UI states', hook, [
  "status: 'loading'", "status: 'ready'", "status: 'error'", 'let active = true', 'if (!active) return',
  'retry() { setAttempt((value) => value + 1); }', 'انتهت جلسة المستخدم', 'لم يتم عرض أرقام جزئية أو تخمينية',
]);
includesAll('Home visual states', page, [
  'aria-busy="true"', '<Button onClick={retry}>إعادة المحاولة</Button>', 'لا توجد أولوية حرجة الآن', 'RiskSignalPattern',
  'المعاملات النشطة', 'الأولوية العاجلة', 'المعاملات المتلكئة', 'المتابعات المفتوحة',
]);
check('no decorative trend claims', !/نمو|trend|زيادة بنسبة|انخفاض بنسبة|أفضل من الشهر|% عن/.test(page));

check('Home preview route constant is canonical', routes.includes("homePreview: '/foundation/home'"));
check('production router mounts authenticated Home', router.includes('{ path: ROUTES.appHome, Component: HomeDashboardPage }'));
check('production router mounts deterministic Home proof route', router.includes('{ path: ROUTES.homePreview, Component: HomeDashboardPreviewPage }'));
check('preview router excludes Home from generic reserved boundaries', previewRouter.includes(".filter((route) => route.id !== 'home')"));
check('preview router maps app Home to deterministic preview', previewRouter.includes('{ path: ROUTES.appHome, Component: HomeDashboardPreviewPage }'));
check('preview router preserves the configured basename', previewRouter.includes('basename: import.meta.env.BASE_URL'));
includesAll('deterministic preview', preview, ['HomeDashboardView', 'buildHomeDashboardSnapshot', "new Date('2026-09-03T12:00:00.000Z')"]);
check('preview contains no live data access', !/useDataLayer|supabase|repository|loadHomeDashboard/i.test(preview));
const implementedIds = [...navigation.matchAll(/\{ id: '([^']+)'[^\n]+contentState: 'implemented' \}/g)].map((match) => match[1]);
check('Home is only implemented product route', implementedIds.length === 1 && implementedIds[0] === 'home');
check('Today remains reserved', /id: 'today'[^\n]+contentState: 'reserved'/.test(navigation));
check('seventeen non-Home routes remain reserved', (navigation.match(/contentState: 'reserved'/g) ?? []).length === 17);

check('Home stylesheet imported', foundationCss.includes("@import './home-dashboard.css';"));
check('Phase 3.4 destruction stylesheet remains terminal', foundationCss.trim().endsWith("@import './shell-destruction-lab.css';"));
check('Home CSS has no raw colors', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(css));
check('Home CSS has no !important', !/!important/i.test(css));
check('Home CSS has no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(css));
check('Home CSS has no transition all', !/transition\s*:\s*all\b/i.test(css));
check('Home CSS has no physical horizontal positioning', !/(?:margin-left|margin-right|padding-left|padding-right|\bleft|\bright)\s*:/i.test(css));
check('Home CSS has no primitive token leak', !/--enjaz-[a-z0-9-]+/i.test(css));
includesAll('Home responsive/accessibility CSS', css, [
  'inline-size: 100%', 'max-inline-size', '@media (max-width: 36rem)', ':focus-visible', '@media (prefers-reduced-motion: reduce)',
  'var(--duration-fast)', 'var(--color-surface)', 'var(--space-',
]);

includesAll('4.1 documentation', doc, ['workspace_memberships', 'HOME_PRIORITY_LIMIT', '/foundation/home', 'Phase 4.2', 'not started']);
check('4.1 doc protects archived followups from active Home metrics', /archived[^\n]*follow|follow[^\n]*archived/i.test(doc));
check('README marks 4.1 WIP or complete', /Phase 4\.1 — Home \/ Dashboard[^\n]*(?:🚧|✅)/.test(readme));
const phase42StatusLines = readme.split(/\r?\n/).filter((line) => line.includes('Phase 4.2 — Daily Work / Universal Inbox'));
check(
  'README keeps 4.2 not started',
  phase42StatusLines.length === 1 && /^\s*-\s+\*\*Phase 4\.2 — Daily Work \/ Universal Inbox\*\*\s+⏳\s+not started\s*$/.test(phase42StatusLines[0] ?? ''),
);
check('governing roadmap preserves Phase 4 ordering', roadmap.indexOf('# Phase 4 — Home, Daily Work & Executive Overview') > roadmap.indexOf('# Phase 3 — Application Shell & Navigation'));
check('governing roadmap preserves 4.1 before 4.2', roadmap.indexOf('## 4.1 — Home / Dashboard') < roadmap.indexOf('## 4.2 — Daily Work / Universal Inbox'));
check('governing roadmap still forbids skipping release gates', roadmap.includes('No transition to the next phase before the current phase Release Gate is green'));

check('application version is Phase 4.1', version.includes("APP_VERSION = '0.11.0-phase4.1'"));
check('package version is Phase 4.1', packageJson.version === '0.11.0-phase4.1');
check('navigation audit uses forward wrapper', packageJson.scripts?.['audit:navigation'] === 'node scripts/phase3-2-forward-compat-audit.mjs');
check('navigation selftest uses forward wrapper', packageJson.scripts?.['audit:navigation:selftest'] === 'node scripts/phase3-2-forward-compat-selftest.mjs');
check('shell destruction audit uses forward wrapper', packageJson.scripts?.['audit:shell-destruction'] === 'node scripts/phase3-4-forward-compat-audit.mjs');
check('shell destruction selftest uses forward wrapper', packageJson.scripts?.['audit:shell-destruction:selftest'] === 'node scripts/phase3-4-forward-compat-selftest.mjs');
check('navigation wrapper runs full legacy audit', navForward.includes('legacy Phase 3.2 navigation audit remains fully green'));
check('shell wrapper runs complete legacy audit', shellForward.includes('complete legacy Phase 3.4 audit remains green'));
check('Home audit registered', packageJson.scripts?.['audit:home'] === 'node scripts/phase4-1-home-audit.mjs');
check('Home selftest registered', packageJson.scripts?.['audit:home:selftest'] === 'node scripts/phase4-1-home-selftest.mjs');
check('4.1 verification extends 3.4', packageJson.scripts?.['verify:phase4.1'] === 'npm run verify:phase3.4 && npm run audit:home && npm run audit:home:selftest && npm run audit:roadmap');
check('3.4 verification structure unchanged', packageJson.scripts?.['verify:phase3.4'] === 'npm run verify:phase3.3 && npm run audit:shell-destruction && npm run audit:shell-destruction:selftest && npm run audit:roadmap');
includesAll('CI preservation', workflow, [
  'Full Phase 4.1 verification', 'npm run verify:phase4.1', 'npm run audit:roadmap', 'npm run typecheck', 'npm run build',
  'test -f dist/index.html', "github.event_name == 'push' && github.ref == 'refs/heads/main'",
]);

if (failures.length) {
  console.error(`ENJAZ PHASE 4.1 HOME AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`ENJAZ PHASE 4.1 HOME AUDIT PASS — ${checks}/${checks} workspace/data/lifecycle/priority/finance/UI/RTL/routing/gate invariants passed.`);
