import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const readText = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const errors = [];

const statePath = 'docs/UI_UX_REBIRTH_2_0_STATE.json';
const parityPath = 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json';
const iaPath = 'docs/UI_UX_REBIRTH_2_0_INFORMATION_ARCHITECTURE.json';
const registryPath = 'src/ui-r2/architecture/navigation-contract.ts';

for (const required of [statePath, parityPath, iaPath, registryPath]) {
  if (!exists(required)) errors.push(`missing R2 information architecture artifact: ${required}`);
}

if (errors.length) {
  console.error('ENJAZ R2.0 INFORMATION ARCHITECTURE AUDIT FAIL');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

const state = readJson(statePath);
const parity = readJson(parityPath);
const ia = readJson(iaPath);
const registrySource = readText(registryPath);
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];
const stageIndex = stageOrder.indexOf(state.stage);

if (stageIndex < 1) {
  console.log(`ENJAZ R2.0 INFORMATION ARCHITECTURE AUDIT SKIP — current stage ${state.stage}`);
  process.exit(0);
}

if (parity.inventoryComplete !== true || parity.inventoryStatus !== 'COMPLETE') {
  errors.push('R2.0-1 requires a complete feature inventory');
}
if (!Array.isArray(parity.capabilities) || parity.capabilities.length === 0) {
  errors.push('feature inventory must be non-empty');
}
if (state.featureParity?.totalCapabilities !== parity.capabilities?.length) {
  errors.push('state totalCapabilities must exactly match the feature inventory');
}
if (state.featureParity?.unresolvedCapabilities !== 0) {
  errors.push('R2.0-1 may not start with unresolved capability homes');
}

const expectedPrimary = ['home', 'transactions', 'create', 'today', 'more'];
for (const key of ['mobilePersistent', 'desktopPersistent']) {
  const actual = ia.primaryNavigation?.[key];
  if (JSON.stringify(actual) !== JSON.stringify(expectedPrimary)) {
    errors.push(`${key} must be exactly: ${expectedPrimary.join(', ')}`);
  }
}
if (ia.primaryNavigation?.brandBehavior !== 'branding_only') errors.push('brand must be branding-only, never hidden navigation');
if (ia.primaryNavigation?.hiddenPrimaryNavigationAllowed !== false) errors.push('hidden primary navigation must be forbidden');

const destinations = Array.isArray(ia.destinations) ? ia.destinations : [];
const byId = new Map();
const routes = new Map();
for (const destination of destinations) {
  if (!destination?.id || typeof destination.id !== 'string') {
    errors.push('every destination needs a stable id');
    continue;
  }
  if (byId.has(destination.id)) errors.push(`duplicate destination id: ${destination.id}`);
  byId.set(destination.id, destination);
  if (!destination.route || typeof destination.route !== 'string') errors.push(`${destination.id} missing route`);
  else {
    if (routes.has(destination.route)) errors.push(`duplicate canonical route: ${destination.route}`);
    routes.set(destination.route, destination.id);
  }
  if (destination.maxActionsFromHome !== null && destination.maxActionsFromHome !== undefined && destination.maxActionsFromHome > 3) {
    errors.push(`${destination.id} exceeds No-Maze 3-action budget`);
  }
}

for (const id of expectedPrimary) {
  if (!byId.has(id)) errors.push(`missing primary destination: ${id}`);
}

for (const capability of parity.capabilities ?? []) {
  if (!byId.has(capability.newCanonicalHome)) {
    errors.push(`${capability.id} canonical home does not resolve: ${capability.newCanonicalHome}`);
    continue;
  }
  if (capability.major === true) {
    const destination = byId.get(capability.newCanonicalHome);
    if (destination.maxActionsFromHome !== null && destination.maxActionsFromHome > 3) {
      errors.push(`${capability.id} major capability exceeds 3-action budget`);
    }
  }
}

const launcherGroups = Array.isArray(ia.launcherGroups) ? ia.launcherGroups : [];
const launcherIds = new Set();
for (const group of launcherGroups) {
  for (const id of group.destinations ?? []) {
    if (launcherIds.has(id)) errors.push(`launcher destination appears in multiple groups: ${id}`);
    launcherIds.add(id);
    if (!byId.has(id)) errors.push(`launcher destination does not resolve: ${id}`);
    else if ((byId.get(id).maxActionsFromHome ?? 99) > 2) errors.push(`More destination ${id} must be reachable in <=2 actions`);
  }
}

const requiredSecondary = ['companies','people','documents','operations','workflow','automation','followups','finance','command','risk','copilot'];
for (const id of requiredSecondary) {
  if (!launcherIds.has(id)) errors.push(`secondary domain missing from explicit More launcher: ${id}`);
}

if (ia.canonicalRules?.oneHomePerCapability !== true) errors.push('oneHomePerCapability must remain true');
if (ia.canonicalRules?.duplicateCanonicalHomesAllowed !== false) errors.push('duplicate canonical homes must remain forbidden');
if (ia.canonicalRules?.majorCapabilityMaxActionsFromHome !== 3) errors.push('major capability action budget must remain exactly 3');
if (ia.canonicalRules?.futureDomainsMustNotMasqueradeAsLive !== true) errors.push('future domains must never masquerade as live');

if (ia.routeModel?.deepLinkSafe !== true || ia.routeModel?.refreshSafe !== true) errors.push('route model must be deep-link and refresh safe');
if (ia.routeModel?.noUseStateOnlyNavigationAsFinalArchitecture !== true) errors.push('state-only navigation must be explicitly forbidden as final R2 architecture');

if (ia.searchContract?.staticDemoResultsForbidden !== true) errors.push('static demo global-search results must be forbidden');
if (ia.searchContract?.resultClickMustNavigate !== true) errors.push('global search result click must navigate');
for (const [alias, target] of Object.entries(ia.searchContract?.aliases ?? {})) {
  if (!byId.has(target)) errors.push(`search alias target does not resolve: ${target}`);
  if (!registrySource.includes(`${alias}: '${target}'`)) errors.push(`source registry missing search alias: ${alias} -> ${target}`);
}

if (!Array.isArray(ia.backModel) || ia.backModel.length < 5) errors.push('back model must cover overlays, nested entities, deep links, search and create');

const createRoute = ia.createContract?.transactionCreateRoute;
const editRoute = ia.createContract?.transactionEditRoute;
if (createRoute !== '/app/transactions/new') errors.push('transaction create route must be the dedicated /app/transactions/new route');
if (typeof createRoute === 'string' && createRoute.includes(':transactionId')) errors.push('transaction create route may not require a transaction id');
if (editRoute !== '/app/transactions/:transactionId/edit') errors.push('transaction edit route must own transaction identity');
if (createRoute === editRoute) errors.push('transaction create and edit routes must remain distinct');

const requiredDefects = ['brand_hidden_domains','all_domain_rail','duplicate_operations','duplicate_finance','duplicate_command','static_global_search','review_only_quick_create','state_only_navigation'];
const defectIds = new Set((ia.knownLegacyMazeDefects ?? []).map((d) => d.id));
for (const id of requiredDefects) if (!defectIds.has(id)) errors.push(`missing legacy maze defect disposition: ${id}`);

if (ia.sourceRegistry !== registryPath) errors.push(`IA sourceRegistry must be ${registryPath}`);
if (state.informationArchitecture?.sourceRegistry !== registryPath) errors.push(`state sourceRegistry must be ${registryPath}`);
if (/from\s+['"][^'"]*(?:ui-v2|ui-rebirth)/.test(registrySource)) errors.push('R2 navigation registry may not import old presentation layers');
if (/ez-domain-rail|onBrandAction/.test(registrySource)) errors.push('R2 navigation registry contains legacy maze DNA');
for (const destination of destinations) {
  if (!registrySource.includes(`id: '${destination.id}'`)) errors.push(`source registry missing destination id: ${destination.id}`);
  if (!registrySource.includes(`route: '${destination.route}'`)) errors.push(`source registry route drift for ${destination.id}: ${destination.route}`);
}
if (!registrySource.includes("export const R2_PRIMARY_NAVIGATION")) errors.push('source registry must export R2_PRIMARY_NAVIGATION');
if (!registrySource.includes("export const R2_DESTINATIONS")) errors.push('source registry must export R2_DESTINATIONS');
if (!registrySource.includes("export const R2_LAUNCHER_GROUPS")) errors.push('source registry must export R2_LAUNCHER_GROUPS');
if (!registrySource.includes("export const R2_SEARCH_ALIASES")) errors.push('source registry must export R2_SEARCH_ALIASES');

if (state.informationArchitecture?.primaryDoorCount !== 5) errors.push('state primaryDoorCount must be 5');
if (state.informationArchitecture?.canonicalHomesResolved !== true) errors.push('state must record canonical homes resolved');
if (state.informationArchitecture?.hiddenPrimaryNavigationCount !== 0) errors.push('state hiddenPrimaryNavigationCount must be 0');
if (state.informationArchitecture?.duplicateCanonicalHomesCount !== 0) errors.push('state duplicateCanonicalHomesCount must be 0');

const iaClosed = state.informationArchitecture?.status === 'CLOSED';
if (iaClosed) {
  if (ia.status !== 'FROZEN') errors.push('closed R2.0-1 state requires frozen IA artifact');
  if (ia.r2_0_1ExitGate?.canonicalRegistryCreated !== true) errors.push('R2.0-1 closure requires canonical source registry');
  if (ia.r2_0_1ExitGate?.routeBackSearchCreateContractsFrozen !== true) errors.push('R2.0-1 closure requires route/back/search/create contracts frozen');
  if (ia.r2_0_1ExitGate?.readyForR2_0_2 !== true) errors.push('R2.0-1 closure must explicitly be ready for R2.0-2');
  if (state.informationArchitecture?.routeBackSearchCreateContractsFrozen !== true) errors.push('state must record frozen route/back/search/create contracts');
  if (state.informationArchitecture?.exitGatePassed !== true) errors.push('closed R2.0-1 state requires exitGatePassed=true');
}

if (stageIndex >= 2) {
  if (!iaClosed) errors.push('R2.0-1 must be CLOSED before R2.0-2');
  if (ia.r2_0_1ExitGate?.routeBackSearchCreateContractsFrozen !== true) errors.push('R2.0-1 route/back/search/create contracts must be frozen before R2.0-2');
  if (ia.r2_0_1ExitGate?.readyForR2_0_2 !== true) errors.push('R2.0-1 must be explicitly ready before R2.0-2');
  if (state.informationArchitecture?.exitGatePassed !== true) errors.push('state must record R2.0-1 exit gate passed before R2.0-2');
}

if (errors.length) {
  console.error('ENJAZ R2.0 INFORMATION ARCHITECTURE AUDIT FAIL');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0 INFORMATION ARCHITECTURE AUDIT PASS — ${parity.capabilities.length} capabilities, five doors, zero hidden primary navigation, canonical homes resolved, source registry synchronized.`);
}
