import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const exists=(p)=>fs.existsSync(new URL(p,root));
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const marker=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

const p94=json('docs/PHASE9_4_STATE.json');
const p95=json('docs/PHASE9_5_STATE.json');
const major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const contract=read('src/features/intelligence/businessIntelligenceContract.ts');
const service=read('src/features/intelligence/businessIntelligenceService.ts');
const foundationTests=read('tests/phase9-5-business-intelligence-foundation.test.ts');
const serviceTests=read('tests/phase9-5-business-intelligence-service.test.ts');
const kickoff=read('docs/PHASE9_5_KICKOFF.md');

req(p94.status==='CLOSED'&&p94.exitGatePassed===true&&p94.phase9_5Allowed===true&&p94.nextPhase==='9.5'&&p94.successorStatus==='AUTHORIZED','Phase 9.4 must remain formally CLOSED and authorize only 9.5');
req(p95.phase==='9.5'&&p95.status==='IN_PROGRESS','Phase 9.5 must remain IN_PROGRESS');
req(p95.baseCommit==='799873b5c7778c7665c934931af9dd3338bcef47','Phase 9.5 base must be exact Phase 9.4 closure merge');
req(p95.javascriptBudgetBytes===670000&&p95.budgetIncreaseAllowed===false,'670000-byte JavaScript ceiling must remain frozen');
req(p95.exitGatePassed===false&&p95.phase9_6Allowed===false&&p95.successorStatus==='LOCKED','Phase 9.6 must remain locked');
req(p95.authority?.persistence==='SOURCE_DOMAIN_AUTHORITY_ONLY'&&p95.authority?.intelligenceAuthority==='READ_ONLY_DERIVED','BI must remain source-derived and read-only');
req(p95.authority?.sourceProvenance==='REQUIRED'&&p95.authority?.crossWorkspaceAggregationAllowed===false,'provenance/workspace isolation law must remain enforced');
req(p95.authority?.forecastAuthority==='DIRECTIONAL_NON_AUTHORITATIVE'&&p95.authority?.forecastMethodDisclosure==='REQUIRED'&&p95.authority?.forecastConfidenceDisclosure==='REQUIRED','forecast disclosure/authority law must remain enforced');
req(p95.authority?.exactMoneyAuthority==='BIGINT_CENTS'&&p95.authority?.fabricatedHistoryAllowed===false&&p95.authority?.silentMissingDataSubstitutionAllowed===false,'exact-money/history/missing-data law must remain enforced');
req(p95.existingAnchors?.phase7_3FinanceIntelligence==='CLOSED_REUSE_REQUIRED'&&p95.existingAnchors?.parallelLedgerAllowed===false&&p95.existingAnchors?.shadowMoneyStoreAllowed===false,'Phase 7.3 finance anchor must be reused without shadow authority');

const m13=major.systems?.find((s)=>s.id==='M13');
req(m13?.name==='Business Intelligence & Forecasting Center'&&m13?.status==='ACTIVE','M13 must be ACTIVE during 9.5');
req(Array.isArray(m13?.anchors)&&m13.anchors.includes('9')&&m13.anchors.includes('15'),'M13 must preserve Phase 9 + Phase 15 anchors');
req(m13?.closureEvidence===null,'Phase 9.5 must not fabricate global M13 closure');

for(const p of ['docs/PHASE9_5_STATE.json','docs/PHASE9_5_KICKOFF.md','src/features/intelligence/businessIntelligenceContract.ts','src/features/intelligence/businessIntelligenceService.ts','tests/phase9-5-business-intelligence-foundation.test.ts','tests/phase9-5-business-intelligence-service.test.ts','.github/workflows/phase9-5-business-intelligence.yml'])req(exists(p),`missing Phase 9.5 artifact: ${p}`);
for(const m of ['ENJAZ_BI_SCHEMA','authoritative:false','BIProvenance','buildDerivedKpi','buildObservedTrend','buildTrailingRunRateForecast','BIUnsupportedRunRateUnitError','exactChangeBps','valueCents:bigint'])marker(contract,m,'BI contract');
for(const m of ['loadBusinessIntelligence','read_only_derived_intelligence','Finance workspace drift','Field authority drift','phase9.5-source-composition-v1','operations.completed_next_30d','finance.collections_next_30d'])marker(service,m,'BI service');
for(let i=1;i<=14;i+=1)marker(foundationTests,`9.5 foundation ${String(i).padStart(2,'0')}`,'foundation tests');
for(let i=1;i<=8;i+=1)marker(serviceTests,`9.5 service ${String(i).padStart(2,'0')}`,'service tests');
marker(kickoff,'Phase 9.6 remains **LOCKED**','kickoff');
marker(kickoff,'DIRECTIONAL / NON-AUTHORITATIVE','kickoff');

if(errors.length){console.error(`PHASE 9.5 BUSINESS INTELLIGENCE AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}
else console.log('PHASE 9.5 BUSINESS INTELLIGENCE AUDIT PASS — predecessor closure preserved; M13 active/open; provenance, exact money, workspace isolation, additive-only forecast semantics and source composition authority enforced; 9.6 locked.');
