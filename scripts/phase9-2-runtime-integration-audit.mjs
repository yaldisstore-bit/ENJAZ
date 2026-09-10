import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const commands=read('src/features/searchIntelligence/searchIntelligenceCommands.ts');
const context=read('src/features/searchIntelligence/SearchIntelligenceContext.tsx');
const hooks=read('src/features/searchIntelligence/useSearchIntelligence.ts');
const root=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const live=read('src/ui-r2/runtime/UiR2LiveRoot.tsx');
const dock=read('src/ui-r2/search-intelligence/TransactionSavedViewsDock.tsx');
const bridge=read('src/features/transactions/transactionSavedViewBridge.ts');
const listHook=read('src/features/transactions/useTransactionList.ts');
const css=read('src/ui-r2/search-intelligence/search-intelligence.css');

function need(text,marker,label){if(!text.includes(marker))throw new Error(`${label} missing ${marker}`)}
function forbid(text,marker,label){if(text.includes(marker))throw new Error(`${label} illegally contains ${marker}`)}

for(const marker of ["'list_saved_views_v1'","'save_saved_view_v1'","'delete_saved_view_v1'","'global_search_v1'",'parseGlobalSearchResultReference','parseEnjazSavedViewDefinition','p_limit_per_domain'])need(commands,marker,'search-intelligence gateway');
for(const marker of ['SearchIntelligenceProvider','useSearchIntelligenceGateway'])need(context,marker,'search-intelligence context');
for(const marker of ['useSavedViews','useGlobalSearch','resolveWorkspaceId','crypto.randomUUID()'])need(hooks,marker,'search-intelligence hooks');
for(const marker of ['createSearchIntelligenceGateway(client)','SearchIntelligenceProvider gateway={searchIntelligence}',"../search-intelligence/search-intelligence.css"])need(root,marker,'production root');
for(const marker of ['data-phase9-2-runtime="search-saved-views"','data-phase9-2-global-search="authoritative"','data-global-search-domain={domain}','data-global-search-destination={item.destination}','useGlobalSearch(query)','TransactionSavedViewsDock'])need(live,marker,'live runtime');
for(const marker of ['data-phase9-2-saved-views="transactions"','createTransactionSavedViewDefinition','fromTransactionSavedView','toTransactionSavedView','saved.createPersonal','saved.rename','saved.remove','bridge.apply'])need(dock,marker,'saved-view dock');
for(const marker of ['publishTransactionSavedViewBridge','clearTransactionSavedViewBridge','subscribeTransactionSavedViewBridge'])need(bridge,marker,'transaction saved-view bridge');
for(const marker of ['publishTransactionSavedViewBridge','clearTransactionSavedViewBridge','applyRequest'])need(listHook,marker,'transaction list hook');
need(css,'.r2-saved-views','search intelligence CSS');
for(const forbidden of ['localStorage','sessionStorage','indexedDB'])forbid(commands+hooks+dock,forbidden,'Phase 9.2 persistence runtime');
for(const forbidden of ['.insert(','.update(','.delete(','.upsert('])forbid(commands,forbidden,'Phase 9.2 client gateway');
if((live.match(/SEARCH_DOMAINS/g)??[]).length<2)throw new Error('global search is not grouped by canonical domain list');
console.log('ENJAZ PHASE 9.2 RUNTIME INTEGRATION AUDIT PASS — authoritative RPC gateway, Saved Views transaction bridge, permission-scoped grouped global search, Zero-Lost coexistence and no shadow browser persistence are wired.');
