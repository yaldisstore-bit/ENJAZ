import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) { return readFile(resolve(root, path), 'utf8'); }
function check(name, condition, detail = '') { checks += 1; if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`); }

const contract = await text('src/design-system/patterns/patternContract.ts');
const entity = await text('src/design-system/patterns/EntityPatterns.tsx');
const operations = await text('src/design-system/patterns/OperationsPatterns.tsx');
const discovery = await text('src/design-system/patterns/DiscoveryPatterns.tsx');
const patternIndex = await text('src/design-system/patterns/index.ts');
const patternCss = await text('src/styles/patterns.css');
const entityCss = await text('src/styles/patterns-entities.css');
const operationsCss = await text('src/styles/patterns-operations.css');
const discoveryCss = await text('src/styles/patterns-discovery.css');
const responsiveCss = await text('src/styles/patterns-responsive.css');
const labCss = await text('src/styles/pattern-lab.css');
const lab = await text('src/features/foundation/pages/PatternLabPage.tsx');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const foundationCss = await text('src/styles/foundation.css');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');
const version = await text('src/core/version/version.ts');
const pkg = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const doc = await text('docs/PHASE_2_7_PREMIUM_PATTERN_LIBRARY.md');
const allTsx = `${entity}\n${operations}\n${discovery}\n${lab}`;
const allCss = `${patternCss}\n${entityCss}\n${operationsCss}\n${discoveryCss}\n${responsiveCss}\n${labCss}`;

const families = ['transaction', 'company', 'contact', 'finance', 'risk', 'timeline', 'followUp', 'workflow', 'automation', 'command', 'search', 'actionMenu', 'systemState', 'skeleton'];
for (const family of families) check(`pattern family contract contains ${family}`, contract.includes(`'${family}'`));
for (const marker of ['minimumTouchTargetPx: 44', 'mobileFirst: true', 'rtlFirst: true', 'tokenOnlyVisuals: true', 'completeScreensForbidden: true', 'rawColorLiteralsForbidden: true', 'inlineStyleEscapeForbidden: true', 'logicalPropertiesOnly: true']) check(`pattern guard ${marker}`, contract.includes(marker));
for (const component of ['TransactionPattern', 'CompanyPattern', 'ContactPattern']) check(`entity pattern exports ${component}`, entity.includes(`function ${component}`));
for (const component of ['FinanceSummaryPattern', 'RiskSignalPattern', 'TimelinePattern', 'FollowUpPattern', 'WorkflowPattern', 'AutomationPattern', 'CommandModulePattern']) check(`operations pattern exports ${component}`, operations.includes(`function ${component}`));
for (const component of ['SearchResultPattern', 'ActionMenuPattern', 'SystemStatePattern', 'PatternSkeleton']) check(`discovery pattern exports ${component}`, discovery.includes(`function ${component}`));

check('pattern barrel exports contract', patternIndex.includes("export * from './patternContract.ts';"));
check('pattern barrel exports entity patterns', patternIndex.includes("export * from './EntityPatterns.tsx';"));
check('pattern barrel exports operation patterns', patternIndex.includes("export * from './OperationsPatterns.tsx';"));
check('pattern barrel exports discovery patterns', patternIndex.includes("export * from './DiscoveryPatterns.tsx';"));
for (const sheet of ['patterns-entities.css', 'patterns-operations.css', 'patterns-discovery.css', 'patterns-responsive.css']) check(`pattern stylesheet aggregates ${sheet}`, patternCss.includes(`@import './${sheet}';`));

check('patterns contain no inline style escape', !/\bstyle\s*=\s*\{/.test(allTsx));
check('patterns contain no raw color literals in TSX', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(allTsx));
check('pattern CSS contains no raw color literals', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(allCss));
check('pattern CSS contains no important override', !/!important/i.test(allCss));
check('pattern CSS avoids transition all', !/transition\s*:\s*all\b/i.test(allCss));
const zIndexValues = [...allCss.matchAll(/z-index\s*:\s*([^;\n}]+)/gi)].map((match) => match[1].trim());
check('pattern CSS avoids arbitrary z-index', zIndexValues.every((value) => /^var\(--z-[a-z0-9-]+\)$/i.test(value)), zIndexValues.length ? `values=${zIndexValues.join(',')}` : 'no z-index declarations');
check('pattern CSS avoids physical horizontal margins', !/(?:margin-left|margin-right|padding-left|padding-right)\s*:/i.test(allCss));
check('pattern CSS scopes hover to fine pointers', !/:hover/.test(allCss) || /@media \(hover: hover\) and \(pointer: fine\)/.test(responsiveCss));
check('pattern CSS provides reduced motion handling', responsiveCss.includes('@media (prefers-reduced-motion: reduce)'));
check('pattern CSS provides coarse pointer touch floor', responsiveCss.includes('@media (pointer: coarse)') && responsiveCss.includes('min-block-size: var(--size-touch-min)'));
check('pattern CSS provides normal mobile breakpoint', responsiveCss.includes('@media (max-width: 48rem)'));
check('pattern CSS provides narrow phone breakpoint', responsiveCss.includes('@media (max-width: 22.5rem)'));
check('pattern lab preserves safe areas', labCss.includes('safe-area-inset-top') && labCss.includes('safe-area-inset-bottom'));
check('pattern lab keeps dynamic viewport enhancement', labCss.includes('@supports (height: 100dvh)'));

check('pattern route is canonical', routes.includes("patterns: '/foundation/patterns'"));
check('main router exposes Pattern Lab', router.includes('PatternLabPage') && router.includes('ROUTES.patterns'));
check('preview router exposes Pattern Lab', previewRouter.includes('PatternLabPage') && previewRouter.includes('ROUTES.patterns'));
check('pattern styles load after mobile foundation', foundationCss.indexOf("@import './patterns.css';") > foundationCss.indexOf("@import './mobile-lab.css';"));
check('pattern lab styles load after patterns', foundationCss.indexOf("@import './pattern-lab.css';") > foundationCss.indexOf("@import './patterns.css';"));
check('foundation status declares Phase 2.7', statusPage.includes('Premium Pattern Library 2.7') && statusPage.includes('ROUTES.patterns'));

for (const marker of ['TransactionPattern', 'CompanyPattern', 'ContactPattern', 'FinanceSummaryPattern', 'RiskSignalPattern', 'TimelinePattern', 'FollowUpPattern', 'WorkflowPattern', 'AutomationPattern', 'CommandModulePattern', 'SearchResultPattern', 'ActionMenuPattern', 'PatternSkeleton', 'density="compact"', '1250000000', 'longCompanyName']) check(`Pattern Lab proves ${marker}`, lab.includes(marker));
for (const tone of ['empty', 'loading', 'success', 'warning', 'error', 'conflict', 'offline', 'recovery']) check(`Pattern Lab proves ${tone} state`, lab.includes(`tone="${tone}"`));

check('system error and conflict states announce assertively', discovery.includes("role={tone === 'error' || tone === 'conflict' ? 'alert' : 'status'}"));
check('action menu uses native buttons', discovery.includes('className={`pattern-action-menu__item') && discovery.includes('type="button"'));
check('search result has accessible icon action label', discovery.includes('label={`فتح ${KIND_LABELS[kind]} ${title}`}'));
check('workflow uses ordered semantic list', operations.includes('<ol className="pattern-workflow"'));
check('timeline uses ordered semantic list', operations.includes('<ol className="pattern-timeline__list"'));
check('finance uses guarded formatter', operations.includes('formatIqd(total)') && operations.includes('formatIqd(outstanding)'));
check('transaction progress is clamped', entity.includes('clampPercent(progress)'));

const appVersionPhase = Number(version.match(/APP_VERSION = '0\.9\.0-phase2\.(\d+)'/)?.[1] ?? -1);
const packageVersionPhase = Number(String(pkg.version ?? '').match(/^0\.9\.0-phase2\.(\d+)$/)?.[1] ?? -1);
check('application version declares Phase 2.7 or later', appVersionPhase >= 7);
check('package version declares Phase 2.7 or later', packageVersionPhase >= 7);
check('Phase 2.7 gate extends immutable Phase 2.6 gate', pkg.scripts?.['verify:phase2.7'] === 'npm run verify:phase2.6 && npm run audit:patterns && npm run audit:patterns:selftest && npm run audit:roadmap');
check('pattern audit script is registered', pkg.scripts?.['audit:patterns'] === 'node scripts/phase2-7-pattern-audit.mjs');
check('pattern selftest script is registered', pkg.scripts?.['audit:patterns:selftest'] === 'node scripts/phase2-7-pattern-selftest.mjs');
check('Phase 2.6 gate command remains unchanged', pkg.scripts?.['verify:phase2.6'] === 'npm run verify:phase2.5 && npm run audit:mobile && npm run audit:mobile:selftest');
const workflowCommandPhase = Number(workflow.match(/npm run verify:phase2\.(\d+)/)?.[1] ?? -1);
const workflowLabelPhase = Number(workflow.match(/Full Phase 2\.(\d+) verification/)?.[1] ?? -1);
check('GitHub quality gate covers Phase 2.7 or later', workflowCommandPhase >= 7 && workflowLabelPhase >= 7);
for (const marker of ['Transaction', 'Company', 'Finance', 'Risk', 'Timeline', 'Follow-up', 'Workflow', 'Automation', 'Command Center', 'Search', 'System states', '/foundation/patterns', 'not complete product screens']) check(`Phase 2.7 documentation contains ${marker}`, doc.includes(marker));

if (failures.length) {
  console.error(`ENJAZ PHASE 2.7 PATTERN AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`ENJAZ PHASE 2.7 PATTERN AUDIT PASS — ${checks}/${checks} domain patterns, token discipline, RTL/mobile, system states and gate invariants satisfied.`);
