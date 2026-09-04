import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 4.2 Daily Work audit FAIL: ${message}`);
}

async function read(file) { return fs.readFile(file, 'utf8'); }

const core = await read('src/ui-v2/runtime/CoreApp.tsx');
const root = await read('src/ui-v2/runtime/UiV2Root.tsx');
const production = await read('src/ui-v2/runtime/ProductionUiV2Runtime.tsx');
const screen = await read('src/ui-v2/screens/DailyWorkScreen.tsx');
const model = await read('src/features/daily-work/dailyWorkModel.ts');
const service = await read('src/features/daily-work/dailyWorkService.ts');
const hook = await read('src/features/daily-work/useDailyWork.ts');
const fixture = await read('src/features/daily-work/dailyWorkPreview.ts');
const dataLayer = await read('src/data/createDataLayer.ts');
const css = await read('src/ui-v2/styles/daily-work.css');

assert(core.includes('data-stage="ui-10"'), 'frozen UI-10 marker changed');
assert(core.includes('data-product-phase="4.2"'), 'product phase marker is missing');
assert(core.includes('dailyWorkMode === \'live\''), 'CoreApp does not select connected Daily Work in live mode');
assert(core.includes('<ConnectedDailyWorkScreen'), 'connected Daily Work surface is not mounted');
assert(core.includes('<FixtureDailyWorkScreen'), 'safe fixture Daily Work surface is missing');

assert(root.includes("VITE_ENJAZ_PREVIEW_MODE === 'true'"), 'public preview mode is not explicit');
assert(root.includes('<ProductionUiV2Runtime />'), 'live production runtime is not reachable');
assert(production.includes('<DataLayerProvider'), 'live runtime does not provide the preserved data layer');
assert(production.includes('<CurrentUserIdProvider'), 'live runtime does not scope Daily Work to the authenticated user');
assert(production.includes('<CoreApp dailyWorkMode="live"'), 'live runtime does not activate live Daily Work');

for (const sourceKind of ['followup', 'blocker', 'calendar', 'renewal', 'workflow']) {
  assert(model.includes(`'${sourceKind}'`), `Universal Inbox source kind disappeared: ${sourceKind}`);
}
assert(model.includes("row.status !== 'open'"), 'open-state filtering is missing');
assert(model.includes("row.archived_at === null"), 'archived transaction exclusion is missing');
assert(model.includes("row.deleted_at === null"), 'deleted transaction exclusion is missing');
assert(model.includes("row.status !== 'completed'"), 'completed transaction exclusion is missing');
assert(model.includes('DAILY_WORK_ITEM_LIMIT'), 'pathological queue bounding is missing');
assert(model.includes('assigned_to_text'), 'clear ownership mapping from transaction routes is missing');
assert(model.includes('findWorkflowItemTitle'), 'workflow item human-title resolution is missing');

for (const repository of ['followups', 'blockers', 'calendar', 'renewals', 'workflowItemStates', 'workflowInstances', 'transactionRoutes']) {
  assert(dataLayer.includes(`${repository}:`), `daily-work repository is missing: ${repository}`);
}
assert(!model.includes('supabase'), 'domain model directly depends on Supabase');
assert(!service.includes('createClient('), 'Daily Work service bypasses the preserved data layer');
assert(!hook.includes('createClient('), 'Daily Work hook bypasses the preserved data layer');

assert(service.includes("if (item.source === 'blocker')") === false, 'blocker should not have a direct completion branch');
assert(service.includes('throw new DailyWorkActionUnavailableError(item.source)'), 'unsupported/blocker completion is not guarded');
assert(service.includes("item.source !== 'followup'"), 'snooze is not restricted to followups');

assert(screen.includes('data-daily-work-status="ready"'), 'ready-state marker is missing');
assert(screen.includes('data-daily-work-status="loading"'), 'loading state is missing');
assert(screen.includes('data-daily-work-status="error"'), 'error state is missing');
assert(screen.includes('data-daily-work-empty="true"'), 'empty state is missing');
assert(screen.includes('data-daily-work-total='), 'stable reality total marker is missing');
assert(screen.includes('data-daily-work-summary="true"'), 'stable reality summary marker is missing');
assert(screen.includes('مرتبة حسب الأثر والوقت'), 'queue prioritization is not communicated to the user');
assert(!screen.includes('template_item_key'), 'technical workflow key leaked into presentation');
assert(!screen.includes('preview-'), 'fixture identifiers leaked into presentation source');
assert(fixture.includes('buildDailyWorkPreviewSnapshot'), 'isolated fixture source is missing');

assert(css.includes('min-height: 44px'), 'Daily Work mobile action touch floor is missing');
assert(css.includes('@media (max-width: 390px)'), 'narrow-phone hardening is missing');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion handling is missing');

console.log('Phase 4.2 Daily Work audit PASS');
console.log('- UI/UX 2.0 freeze marker preserved');
console.log('- live runtime uses Auth + DataLayer providers; public fixture remains isolated');
console.log('- followups/blockers/calendar/renewals/workflow consolidated');
console.log('- archived/deleted/completed work is excluded and queue is bounded');
console.log('- completion/snooze writes stay behind preserved repositories');
console.log('- blocker resolution cannot be silently performed by Universal Inbox');
console.log('- loading/error/empty/ready states and 44px mobile contract present');
