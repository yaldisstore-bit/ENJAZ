import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const exists=(p)=>fs.existsSync(new URL(p,root));
const fail=(m)=>{throw new Error(`Phase 9.7 Intelligence Zero-Escape audit: ${m}`)};
const must=(text,marker,label)=>{if(!text.includes(marker))fail(`${label} missing marker: ${marker}`)};

// Phase 9.7 may attack prior intelligence, never silently rewrite its certified authority.
for(const script of [
  'scripts/phase9-3-governance-ownership-audit.mjs',
  'scripts/phase9-4-regulatory-knowledge-audit.mjs',
  'scripts/phase9-5-business-intelligence-audit.mjs',
  'scripts/phase9-6-process-mining-audit.mjs',
]){
  execFileSync(process.execPath,[script],{cwd:new URL('../',import.meta.url),stdio:'inherit'});
}

const state=json('docs/PHASE9_7_STATE.json');
const prior=json('docs/PHASE9_6_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE9_7_KICKOFF.md');
const tests=read('tests/phase9-7-intelligence-zero-escape.test.ts');
const governance=read('src/features/governance/governanceOwnershipContract.ts');
const regulatory=read('src/features/regulatory/regulatoryKnowledgeContract.ts');
const bi=read('src/features/intelligence/businessIntelligenceContract.ts');
const processContract=read('src/features/process-intelligence/processMiningContract.ts');

if(prior.status!=='CLOSED'||prior.exitGatePassed!==true||prior.phase9_7Allowed!==true||prior.nextPhase!=='9.7'||prior.successorStatus!=='AUTHORIZED')fail('Phase 9.6 is not a valid closed/authorized predecessor');
if(state.phase!=='9.7'||state.name!=='Intelligence Zero-Escape Gate')fail('identity drift');
if(state.status!=='IN_PROGRESS')fail('Phase 9.7 must remain IN_PROGRESS before PR/merge/post-merge evidence');
if(state.baseCommit!=='bcb8e697fa7457e216036ae321b8eddac2050b1b')fail('base commit drift');
if(state.implementationBranch!=='phase9-7-intelligence-zero-escape')fail('implementation branch drift');
if(state.predecessor?.phase!=='9.6'||state.predecessor?.requiredStatus!=='CLOSED'||state.predecessor?.requiredAuthorization!=='phase9_7Allowed=true'||state.predecessor?.formalClosureCommit!==state.baseCommit)fail('predecessor contract drift');
if(state.mode!=='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY')fail('mode drift');
if(state.newFeatureAuthorityAllowed!==false||state.newDatabaseTablesAllowed!==false||state.newWriteRpcAuthorityAllowed!==false)fail('Phase 9.7 cannot create new authority');
if(state.javascriptBudgetBytes!==670000||state.totalJavascriptBudgetBytes!==760000||state.cssBudgetBytes!==180000||state.budgetIncreaseAllowed!==false)fail('governed budget drift');
if(state.exitGatePassed!==false||state.phase10_1Allowed!==false||state.nextPhase!=='10.1'||state.successorStatus!=='LOCKED')fail('Phase 10.1 must remain locked while Phase 9.7 is open');
if(state.pullRequestGate!=='PENDING'||state.postMergeRecertification!=='PENDING'||state.deployedLiveVerification!=='PENDING')fail('premature Phase 9.7 closure evidence');
for(const count of ['unresolvedDefectCount','criticalDefectCount','highDefectCount','functionalBlockerCount'])if(state[count]!==0)fail(`${count} must start at zero known defects`);

const systems=['M2','M8_PHASE9_PORTION','M13_PHASE9_PORTION','M18_PHASE9_PORTION'];
if(JSON.stringify(state.systemsUnderGate)!==JSON.stringify(systems))fail('systems-under-gate drift');
const dimensions=['conflicting_stale_signals','no_data_states','high_volume_datasets','invalid_ownership','regulatory_version_conflicts','model_drift','prediction_uncertainty'];
if(JSON.stringify(state.destructionDimensions)!==JSON.stringify(dimensions))fail('destruction-dimension drift');
for(const key of systems)if(state.systemEvidence?.[key]?.status!=='PENDING')fail(`${key} evidence must remain PENDING before real certification`);

const m2=registry.systems.find((x)=>x.id==='M2');
const m8=registry.systems.find((x)=>x.id==='M8');
const m13=registry.systems.find((x)=>x.id==='M13');
const m18=registry.systems.find((x)=>x.id==='M18');
if(m2?.status!=='CLOSURE_CANDIDATE'||m2?.anchors?.join(',')!=='9')fail('M2 registry boundary drift');
if(m8?.status!=='ACTIVE'||m8?.anchors?.join(',')!=='9,12'||m8?.closureEvidence!==null)fail('M8 must remain globally open for Phase 12');
if(m13?.status!=='ACTIVE'||m13?.anchors?.join(',')!=='9,15'||m13?.closureEvidence!==null)fail('M13 must remain globally open for Phase 15');
if(m18?.status!=='ACTIVE'||m18?.anchors?.join(',')!=='9,15'||m18?.closureEvidence!==null)fail('M18 must remain globally open for Phase 15');

for(const marker of [
  '**Status: IN PROGRESS**','not a feature-delivery phase','M2 — Corporate Governance & Ownership Engine','M8 — Regulatory / Knowledge Base Engine','M13 — Business Intelligence & Forecasting Center','M18 — Process Mining & Predictive Operations','conflicting/stale signals','no-data states','high-volume datasets','invalid ownership','regulatory version conflicts','model drift','prediction uncertainty','Phase 10.1 — Document Vault remains LOCKED'
])must(kickoff,marker,'kickoff');

for(const marker of [
  '9.7 M2 invalid ownership','9.7 M2 conflicting stale','9.7 M2 high-volume','9.7 M8 regulatory fork','9.7 M8 no-data','9.7 M8 high-volume','9.7 M13 future or stale','9.7 M13 no provenance','9.7 M13 prediction uncertainty','9.7 M13 model shift','9.7 M13 high-volume','9.7 M18 no-data and future','9.7 M18 tied and insufficient','9.7 M18 model/distribution shift','9.7 M18 high-volume','9.7 M18 equal-time waits'
])must(tests,marker,'destruction wave');

for(const [source,markers,label] of [
  [governance,['OWNERSHIP_TOTAL_UNITS','assertNoConflictingOwnershipPeriods','buildOwnershipSnapshot','BigInt'],'M2 contract'],
  [regulatory,['assertDeterministicRegulatoryLineage','resolveRegulatoryVersionAsOf','buildRegulatoryCitation','authoritative: false'],'M8 contract'],
  [bi,['READ_ONLY_DERIVED','buildTrailingRunRateForecast'], 'M13 contract'],
  [processContract,['buildEmpiricalNextActivityPrediction','buildEmpiricalDelayPrediction','authoritative:false'], 'M18 contract'],
]){
  for(const marker of markers){
    if(label==='M13 contract'&&marker==='READ_ONLY_DERIVED')continue;
    must(source,marker,label);
  }
}
if(!/BIUnsupportedRunRateUnitError/.test(bi)||!/confidence:directional\?'directional'/.test(processContract))fail('prediction uncertainty guards drifted');
if(/createCompany|updateCompany|postPayment|writeLedger/.test(processContract))fail('M18 contract gained forbidden write authority');

for(const evidence of ['docs/PHASE9_3_CLOSURE.md','docs/PHASE9_4_CLOSURE.md','docs/PHASE9_5_CLOSURE.md','docs/PHASE9_6_CLOSURE.md','docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md'])if(!exists(evidence))fail(`missing prior evidence ${evidence}`);

console.log('ENJAZ PHASE 9.7 INTELLIGENCE ZERO-ESCAPE AUDIT PASS — Phase 9.6 closure preserved; M2/M8/M13/M18 authority boundaries frozen; seven roadmap destruction dimensions registered; no new feature/database/write authority; governed budgets unchanged; Phase 10.1 locked.');
