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

const model = await text('src/features/home/homeDashboardModel.ts');
const service = await text('src/features/home/homeDashboardService.ts');
const hook = await text('src/features/home/useHomeDashboard.ts');
const page = await text('src/features/home/pages/HomeDashboardPage.tsx');
const preview = await text('src/features/home/pages/HomeDashboardPreviewPage.tsx');
const gateway = await text('src/data/supabase/SupabaseDataGateway.ts');
const port = await text('src/data/ports/WorkspaceDataGateway.ts');
const factory = await text('src/data/createDataLayer.ts');
const navigation = await text('src/core/routing/navigationContract.ts');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const css = await text('src/styles/home-dashboard.css');
const foundationCss = await text('src/styles/foundation.css');
const homeTests = await text('tests/homeDashboard.test.ts');
const dataTests = await text('tests/dataGateway.test.ts');
const doc = await text('docs/PHASE_4_1_HOME_DASHBOARD.md');
const readme = await text('README.md');
const roadmap = await text('docs/ENJAZ_MASTER_ROADMAP.md');
const version = await text('src/core/version/version.ts');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const navForward = await text('scripts/phase3-2-forward-compat-audit.mjs');
const shellForward = await text('scripts/phase3-4-forward-compat-audit.mjs');

// Workspace resolution stays in infrastructure/data boundaries.
check('workspace gateway contract exposes user-to-workspace resolution', port.includes('resolveWorkspaceIdForUser(userId: string): Promise<string | null>'));
check('data factory exposes workspace resolution without feature Supabase access', factory.includes('resolveWorkspaceId(userId: string)'));
check('factory delegates workspace resolution to centralized gateway', factory.includes('gateway.resolveWorkspaceIdForUser(userId)'));
check('gateway validates authenticated user UUID before query', gateway.includes("requireUuid(userId, 'user id')"));
check('workspace resolver reads membership table', gateway.includes(".from('workspace_memberships')"));
check('workspace resolver selects only workspace id', gateway.includes(".select('workspace_id')"));
check('workspace resolver filters exact authenticated user id', gateway.includes(".eq('user_id', safeUserId)"));
check('workspace resolver uses deterministic oldest membership ordering', gateway.includes(".order('created_at', { ascending: true })"));
check('workspace resolver limits lookup to one row', gateway.includes('.range(0, 0)'));
check('workspace resolver accepts no membership as null', gateway.includes('if (response.data === null) return null'));
check('workspace resolver normalizes adapter error', gateway.includes('if (response.error) throw normalizeDataFailure(response.error)'));
check('workspace resolver validates returned workspace UUID', gateway.includes("return requireUuid(record.workspace_id, 'workspace id')"));
check('Home feature contains no direct Supabase dependency', !/supabase|createClient|\.from\s*\(|\.rpc\s*\(/i.test(`${model}\n${service}\n${hook}\n${page}\n${preview}`));
for (const marker of ['workspace_memberships', "['user_id'", 'invalid user id', 'returns null when membership is absent', 'DATA_FORBIDDEN']) {
  check(`workspace resolution regression coverage includes ${marker}`, dataTests.includes(marker));
}

// Authoritative data loading and bounded pagination.
check('Home source page size is exactly 100', service.includes('const HOME_PAGE_SIZE = 100'));
check('Home pagination starts at offset zero', service.includes('let offset = 0'));
check('Home loader requests bounded page size', service.includes('limit: HOME_PAGE_SIZE'));
check('Home loader progresses by rows actually returned', service.includes('offset += page.items.length'));
check('Home loader rejects non-progressing partial pages', service.includes("throw new Error('Non-progressing dashboard data page')"));
check('Home source loads independent facts concurrently', service.includes('await Promise.all(['));
for (const repository of ['layer.transactions', 'layer.followups', 'layer.blockers', 'layer.payments']) {
  check(`Home loads through repository ${repository}`, service.includes(repository));
}
check('transaction query excludes archived rows', service.includes("{ column: 'archived_at', operator: 'is', value: null }"));
check('transaction query excludes deleted rows', service.includes("{ column: 'deleted_at', operator: 'is', value: null }"));
check('transaction query excludes completed rows', service.includes("{ column: 'status', operator: 'neq', value: 'completed' }"));
check('followup query only requests open rows', service.includes("filters: [{ column: 'status', operator: 'eq', value: 'open' }]"));
check('blocker query only requests open rows', service.includes("filters: [{ column: 'status', operator: 'eq', value: 'open' }]"));
check('payment query only requests posted rows', service.includes("filters: [{ column: 'status', operator: 'eq', value: 'posted' }]"));
check('Home resolves workspace before constructing scoped layer', service.indexOf('factory.resolveWorkspaceId(userId)') < service.indexOf('factory.forWorkspace(workspaceId)'));
check('Home refuses missing workspace instead of guessing one', service.includes('throw new HomeWorkspaceUnavailableError()'));
check('Home never derives workspace from user id', !/forWorkspace\(userId\)|workspaceId\s*=\s*userId/.test(service));
check('company labels are loaded only for visible priority company ids', service.includes('snapshot.priorities.map((priority) => priority.companyId)'));
check('deleted companies are not used as labels', service.includes('company.deleted_at !== null'));

// Operational lifecycle semantics.
check('active transaction excludes deleted', model.includes('transaction.deleted_at === null'));
check('active transaction excludes archived', model.includes('transaction.archived_at === null'));
check('active transaction excludes completed', model.includes("transaction.status !== 'completed'"));
check('active transaction ids are frozen as the relation boundary', model.includes('const activeIds = new Set(activeById.keys())'));
check('open followups are limited to active parent transactions', model.includes("followup.status === 'open' && activeIds.has(followup.transaction_id)"));
check('open blockers are limited to active parent transactions', model.includes("blocker.status === 'open' && activeIds.has(blocker.transaction_id)"));
check('posted payments are limited to active parent transactions', model.includes("payment.status === 'posted' && activeIds.has(payment.transaction_id)"));
check('snoozed followups are compared against current time', model.includes('parseInstant(followup.snoozed_until) <= nowMs'));
check('overdue followups require due time before now', model.includes('parseInstant(followup.due_at) < nowMs'));
check('archived-followup regression test exists', homeTests.includes('archived work cannot leak into Home metrics'));
check('archived-followup regression asserts pending count', homeTests.includes('assert.equal(result.openFollowups, 3)'));
check('archived-followup regression asserts overdue count', homeTests.includes('assert.equal(result.overdueFollowups, 1)'));
check('archived-followup regression asserts operational signal', homeTests.includes("signal.id === 'overdue-followups'"));

// Priority model is deterministic and bounded.
check('Home priority display cap is exactly six', /HOME_PRIORITY_LIMIT\s*=\s*6\b/.test(model));
check('critical blocker score remains 120', model.includes("blocker.severity === 'critical' ? 120 : 105"));
check('urgent transaction score remains 90', model.includes('score: 90'));
check('stalled transaction score remains 80', model.includes('score: 80'));
check('overdue age weight is bounded to twenty days', model.includes('100 + Math.min(overdueDays, 20)'));
check('priorities sort descending by score', model.includes('right.score - left.score'));
check('priority tie-break is deterministic', model.includes('left.id.localeCompare(right.id)'));
check('priority list is sliced to the frozen cap', model.includes('.slice(0, HOME_PRIORITY_LIMIT)'));
check('priority destination stays at existing transactions root', model.includes("destination: '/app/transactions'"));
check('Home does not invent transaction detail routes', !/\/app\/transactions\/:|transactionId\}/.test(`${model}\n${page}`));
check('priority ordering regression exists', homeTests.includes('priority ranking puts critical blockers before overdue, urgent and stalled work'));

// Finance is intentionally scoped and honest.
check('Home money aggregation rejects non-finite values', model.includes('if (!Number.isFinite(value)) continue'));
check('Home money aggregation checks safe cents', model.includes('Number.isSafeInteger(Math.round(value * 100))'));
check('Home outstanding amount is never negative', model.includes('Math.max(0,'));
check('reversed payments are excluded by posted status filter', model.includes("payment.status === 'posted'"));
check('finance precision flag combines fee/payment safety', model.includes('activeFees.precisionSafe && collected.precisionSafe'));
check('unsafe money regression test exists', homeTests.includes('home never reports unsafe large money values as precision-safe'));
check('finance UI discloses unsafe precision', page.includes('تجاوزت بعض القيم نطاق الحساب الآمن في JavaScript'));
check('finance UI explicitly preserves Phase 7 accounting authority', page.includes('الدفتر المالي في Phase 7 يبقى المرجع المحاسبي'));
check('Home finance view labels its active-work scope', page.includes('تحصيل العمل النشط'));

// UI state integrity.
check('Home has explicit loading state', hook.includes("status: 'loading'"));
check('Home has explicit ready state', hook.includes("status: 'ready'"));
check('Home has explicit error state', hook.includes("status: 'error'"));
check('Home cancels stale async updates', hook.includes('let active = true') && hook.includes('if (!active) return'));
check('Home exposes retry without bypassing the data layer', hook.includes('retry() { setAttempt((value) => value + 1); }'));
check('Home session absence fails visibly', hook.includes('انتهت جلسة المستخدم'));
check('Home data failure never claims partial totals', hook.includes('لم يتم عرض أرقام جزئية أو تخمينية'));
check('Home loading surface exposes aria-busy', page.includes('aria-busy="true"'));
check('Home error surface contains retry action', page.includes('<Button onClick={retry}>إعادة المحاولة</Button>'));
check('Home priority empty state exists', page.includes('لا توجد أولوية حرجة الآن'));
check('Home uses frozen RiskSignalPattern', page.includes('RiskSignalPattern'));
check('Home uses frozen Card primitives', page.includes('Card') && page.includes('CardHeader') && page.includes('CardBody'));
check('Home metrics describe actionable facts', page.includes('المعاملات النشطة') && page.includes('الأولوية العاجلة') && page.includes('المعاملات المتلكئة') && page.includes('المتابعات المفتوحة'));
check('Home does not include decorative trend claims', !/نمو|trend|زيادة بنسبة|انخفاض بنسبة|أفضل من الشهر|% عن/.test(page));

// Routing, preview and phase lock.
check('Home proof route is outside product namespace', routes.includes("homePreview: '/foundation/home'"));
check('production router maps real /app Home to HomeDashboardPage', router.includes('{ path: ROUTES.appHome, Component: HomeDashboardPage }'));
check('production router exposes deterministic Home proof route', router.includes('{ path: ROUTES.homePreview, Component: HomeDashboardPreviewPage }'));
check('production reserved route list excludes Home only', router.includes(".filter((route) => route.id !== 'home')"));
check('preview router maps /app to deterministic Home', previewRouter.includes('{ path: ROUTES.appHome, Component: HomeDashboardPreviewPage }'));
check('preview router exposes /foundation/home', previewRouter.includes('{ path: ROUTES.homePreview, Component: HomeDashboardPreviewPage }'));
check('preview router preserves GitHub Pages basename', previewRouter.includes('basename: import.meta.env.BASE_URL'));
check('preview uses same HomeDashboardView', preview.includes('HomeDashboardView'));
check('preview passes fixtures through same snapshot builder', preview.includes('buildHomeDashboardSnapshot'));
check('preview uses deterministic instant', preview.includes("new Date('2026-09-03T12:00:00.000Z')"));
check('preview contains no data-layer or Supabase access', !/useDataLayer|supabase|repository|loadHomeDashboard/i.test(preview));
const implementedIds = [...navigation.matchAll(/\{ id: '([^']+)'[^\n]+contentState: 'implemented' \}/g)].map((match) => match[1]);
check('Home is the only implemented product route in 4.1', implementedIds.length === 1 && implementedIds[0] === 'home', `implemented=${implementedIds.join(',')}`);
check('Today remains reserved until 4.2', /id: 'today'[^\n]+contentState: 'reserved'/.test(navigation));
check('all seventeen non-Home product routes remain reserved', (navigation.match(/contentState: 'reserved'/g) ?? []).length === 17);

// Design system / RTL / accessibility / mobile discipline.
check('Home stylesheet is imported', foundationCss.includes("@import './home-dashboard.css';"));
check('Phase 3.4 terminal destruction stylesheet remains last', foundationCss.trim().endsWith("@import './shell-destruction-lab.css';"));
for (const [name, condition] of [
  ['no raw colors', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(css)],
  ['no !important', !/!important/i.test(css)],
  ['no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(css)],
  ['no transition all', !/transition\s*:\s*all\b/i.test(css)],
  ['no physical horizontal positioning', !/(?:margin-left|margin-right|padding-left|padding-right|\bleft|\bright)\s*:/i.test(css)],
  ['no primitive token leaks', !/--enjaz-[a-z0-9-]+/i.test(css)],
]) check(`Home CSS ${name}`, condition);
check('Home CSS uses logical inline sizing', css.includes('inline-size: 100%') && css.includes('max-inline-size'));
check('Home CSS supports narrow mobile stacking', css.includes('@media (max-width: 36rem)'));
check('Home CSS preserves focus-visible', css.includes(':focus-visible'));
check('Home CSS preserves reduced motion', css.includes('@media (prefers-reduced-motion: reduce)'));
check('Home CSS uses motion duration tokens', css.includes('var(--duration-fast)'));
check('Home CSS uses semantic surfaces', css.includes('var(--color-surface)'));
check('Home CSS uses bounded design spacing', css.includes('var(--space-'));

// Documentation, versioning, historic gates and CI.
for (const marker of ['what needs attention now?', 'workspace_memberships', 'HOME_PRIORITY_LIMIT', '/foundation/home', 'Phase 4.2', 'not started']) {
  check(`Phase 4.1 documentation covers ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));
}
check('Phase 4.1 documentation protects archived followups from active metrics', /archived[^\n]*follow|follow[^\n]*archived/i.test(doc));
check('README marks Phase 4.1 as current work or complete', /Phase 4\.1 — Home \/ Dashboard[^\n]*(?:🚧|✅)/.test(readme));
check('README keeps Phase 4.2 not started', /Phase 4\.2[^\n]*(?:not started|لم تبدأ)/i.test(readme));
check('roadmap marks Phase 4 as current', /# Phase 4 — Home, Daily Work & Executive Overview[^\n]*CURRENT/.test(roadmap));
check('roadmap marks Phase 4.1 as active or complete', /## 4\.1 — Home \/ Dashboard[^\n]*(?:🚧|✅)/.test(roadmap));
check('roadmap keeps Phase 4.2 unstarted', /## 4\.2 — Daily Work \/ Universal Inbox[^\n]*(?:⏳|NEXT)/.test(roadmap));
check('application version declares Phase 4.1', version.includes("APP_VERSION = '0.11.0-phase4.1'"));
check('package version declares Phase 4.1', packageJson.version === '0.11.0-phase4.1');
check('navigation audit uses forward compatibility wrapper', packageJson.scripts?.['audit:navigation'] === 'node scripts/phase3-2-forward-compat-audit.mjs');
check('navigation destructive audit uses forward compatibility wrapper', packageJson.scripts?.['audit:navigation:selftest'] === 'node scripts/phase3-2-forward-compat-selftest.mjs');
check('shell destruction audit uses forward compatibility wrapper', packageJson.scripts?.['audit:shell-destruction'] === 'node scripts/phase3-4-forward-compat-audit.mjs');
check('shell destruction destructive suite uses forward compatibility wrapper', packageJson.scripts?.['audit:shell-destruction:selftest'] === 'node scripts/phase3-4-forward-compat-selftest.mjs');
check('forward navigation wrapper preserves full legacy audit', navForward.includes('legacy Phase 3.2 navigation audit remains fully green'));
check('forward shell wrapper preserves complete legacy audit', shellForward.includes('complete legacy Phase 3.4 audit remains green'));
check('Home audit script is registered', packageJson.scripts?.['audit:home'] === 'node scripts/phase4-1-home-audit.mjs');
check('Home selftest script is registered', packageJson.scripts?.['audit:home:selftest'] === 'node scripts/phase4-1-home-selftest.mjs');
check('Phase 4.1 gate extends complete Phase 3.4 gate', packageJson.scripts?.['verify:phase4.1'] === 'npm run verify:phase3.4 && npm run audit:home && npm run audit:home:selftest && npm run audit:roadmap');
check('historic Phase 3.4 gate chain remains structurally unchanged', packageJson.scripts?.['verify:phase3.4'] === 'npm run verify:phase3.3 && npm run audit:shell-destruction && npm run audit:shell-destruction:selftest && npm run audit:roadmap');
check('GitHub quality gate names Phase 4.1 verification', workflow.includes('Full Phase 4.1 verification'));
check('GitHub quality gate runs verify:phase4.1', workflow.includes('npm run verify:phase4.1'));
check('GitHub quality gate still runs roadmap audit separately', workflow.includes('npm run audit:roadmap'));
check('GitHub quality gate still runs real TypeScript', workflow.includes('npm run typecheck'));
check('GitHub quality gate still runs production build', workflow.includes('npm run build'));
check('GitHub quality gate still asserts dist output', workflow.includes('test -f dist/index.html'));
check('GitHub quality gate retains main-only artifact', workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"));

if (failures.length) {
  console.error(`ENJAZ PHASE 4.1 HOME AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 4.1 HOME AUDIT PASS — ${checks}/${checks} workspace/data/lifecycle/priority/finance/UI/RTL/routing/gate invariants passed.`);
