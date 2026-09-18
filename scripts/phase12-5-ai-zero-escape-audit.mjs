import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const state=json('docs/PHASE12_5_STATE.json');
const prev=json('docs/PHASE12_4_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE12_5_KICKOFF.md');
const agentCore=read('supabase/functions/enjaz-copilot-agent/core.ts');
const agentApproval=read('supabase/functions/enjaz-copilot-agent/approval.ts');
const agentAction=read('supabase/functions/enjaz-copilot-agent/action.ts');
const agentEdge=read('supabase/functions/enjaz-copilot-agent/index.ts');
const regulatoryCore=read('supabase/functions/enjaz-regulatory-assistant/core.ts');
const regulatoryEdge=read('supabase/functions/enjaz-regulatory-assistant/index.ts');
const w2EvidencePath='docs/PHASE12_5_W2_EVIDENCE.md';
const w2Evidence=fs.existsSync(w2EvidencePath)?read(w2EvidencePath):'';

const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),l+' missing marker: '+m);

for(const script of [
  'scripts/phase12-3-agentic-copilot-audit.mjs',
  'scripts/phase12-4-regulatory-assistance-audit.mjs',
  'scripts/major-systems-zero-escape-audit.mjs',
])execFileSync(process.execPath,[script],{stdio:'inherit'});

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_5Allowed===true,'12.4 predecessor not formally closed/authorized');
req(state.phase==='12.5'&&state.name==='AI Zero-Escape & Safety Gate'&&state.status==='IN_PROGRESS','12.5 identity invalid');
req(state.baseCommit==='e3f38a28db5bc423e73551af79ce210c54dfda03','12.5 exact base drifted');
req(state.predecessor?.formalClosureCommit===state.baseCommit&&state.predecessor?.closureEvidence==='docs/PHASE12_4_CLOSURE.md','12.5 predecessor lineage drifted');
req(state.mode==='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY','12.5 mode drifted');
for(const key of ['newFeatureAuthorityAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed','newProviderAuthorityAllowed','newClientUiAllowed','budgetIncreaseAllowed'])req(state[key]===false,key+' must remain false');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'frozen budgets drifted');
req(JSON.stringify(state.systemsUnderGate)===JSON.stringify(['M8','M9']),'12.5 systems-under-gate drifted');
req(JSON.stringify(state.destructionDimensions)===JSON.stringify(['hallucination_missing_data','prompt_injection','permission_escape','malicious_regulatory_content','structured_output_regression','approval_tool_bypass','provider_outage_recovery']),'12.5 destruction dimensions drifted');
req(state.successorPhase==='13.1'&&state.successorStatus==='LOCKED'&&state.phase13_1Allowed===false,'13.1 must remain locked while 12.5 is open');
req(state.exitGatePassed===false&&state.closureDecision==='PENDING','12.5 cannot close before final Zero-Escape evidence');
req(['IN_PROGRESS','PASS'].includes(state.openingWaveStatus),'12.5 opening wave status invalid');
req(['PENDING','PASS_W2'].includes(state.realCloudVerification),'12.5 Real Cloud status invalid');
req(state.realBrowserVerification==='PENDING'&&state.deployedLiveVerification==='PENDING','12.5 browser/deployed-live evidence prematurely claimed');
if(state.realCloudVerification==='PASS_W2'){
  req(state.openingWaveStatus==='PASS','W2 PASS requires W1 PASS');
  req(state.w1GateRunId===35386039196&&state.w1GateRunNumber===4&&state.w1GateHead==='26b08f99d6a03304d256b06d4dbb7984906a452e','12.5 W1 gate evidence drifted');
  req(state.w1DestructionChecks===16&&state.w1DestructionFailures===0,'12.5 W1 destruction count drifted');
  req(state.w2RealCloudRunId===35386243846&&state.w2RealCloudRunNumber===1&&state.w2RealCloudHead==='2af9078ef17532ea7b184301655f5c092c287713','12.5 W2 run evidence drifted');
  req(state.w2RealCloudArtifactId===10563274638&&state.w2RealCloudArtifactDigest==='sha256:f538f24b8b32931f13654477861cffa2873a2cd56e2612347f4b7549f8d05fcd','12.5 W2 artifact evidence drifted');
  req(state.w2OverlayChecks===20&&state.w2M8ReplayChecks===18&&state.w2M9ReplayChecks===33&&state.w2AggregateChecks===71&&state.w2FailureCount===0,'12.5 W2 check inventory drifted');
  req(state.w2ZeroRegulatoryMutation===true&&state.w2ZeroForeignBusinessMutation===true&&state.w2PromptInjectionResistance===true&&state.w2NoProviderFallback===true&&state.w2ApprovalBypassResistance===true&&state.w2ReplayRollbackVerified===true&&state.w2ZeroResidue===true,'12.5 W2 safety guarantees drifted');
  req(state.systemEvidence?.M8?.status==='REAL_CLOUD_PASS'&&state.systemEvidence?.M9?.status==='REAL_CLOUD_PASS','12.5 W2 must upgrade M8/M9 only to REAL_CLOUD_PASS');
  req(w2Evidence.length>0,'12.5 W2 evidence file missing');
  for(const marker of ['71/71 authenticated Real Cloud checks','Phase 12.5 overlay: **20 PASS**','fresh M8 replay: **18 PASS**','fresh M9 replay: **33 PASS**','Phase 13.1 remains LOCKED'])has(w2Evidence,marker,'12.5 W2 evidence');
}
for(const key of ['knownCriticalDefects','knownHighDefects','knownFunctionalBlockers'])req(state[key]===0,key+' must remain zero known blockers');

const m8=registry.systems.find(x=>x.id==='M8');
const m9=registry.systems.find(x=>x.id==='M9');
req(m8?.status==='ACTIVE'&&m8?.anchors?.join(',')==='9,12'&&m8?.closureEvidence===null,'M8 cannot close before 12.5 independent evidence');
req(m9?.status==='ACTIVE'&&m9?.anchors?.join(',')==='12'&&m9?.closureEvidence===null,'M9 cannot close before 12.5 independent evidence');

for(const marker of ['not a feature-delivery phase','hallucination / missing data','prompt injection','permission escape','malicious regulatory content','structured-output regression','approval/tool bypass','provider outage recovery','Phase 13.1 — Read-only Legacy Snapshot Intake — **LOCKED**'])has(kickoff,marker,'12.5 kickoff');

for(const marker of ["AGENT_OPERATIONS=['plan','propose']",'executionAllowed:false','explicitApprovalRequired:true','genericWriteToolAllowed:false','providerUsed:false'])has(agentCore,marker,'M9 plan contract');
for(const marker of ["AGENT_APPROVAL_DECISIONS=['approve','reject']",'workspaceBound:true','executionAllowed:false'])has(agentApproval,marker,'M9 approval contract');
for(const marker of ["AGENT_ACTION_SCHEMA='enjaz.copilot.agent.action.v1'",'explicitApprovalRequired:true','digestBound:true','genericWriteToolAllowed:false','atomicApprovalConsumption:true'])has(agentAction,marker,'M9 action contract');
req(!/admin\.from\(/.test(agentEdge),'M9 service role may not read business tables');
req(!/admin\.rpc\(['"]copilot_execute_/.test(agentEdge),'M9 service role may not execute business adapters');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(agentCore+agentEdge),'M9 provider path appeared during Zero-Escape');

for(const marker of ["REGULATORY_ASSISTANCE_OPERATIONS=['answer']", "missingAuthorityBehavior:'fail_closed_no_fabrication'", "ambiguousAsOfBehavior:'fail_closed'",'sourceHashBinding:true','aiOutputAuthoritative:false','editorialOutputAuthoritative:false','providerUsed:false'])has(regulatoryCore,marker,'M8 assistance contract');
for(const marker of ["userClient.rpc('search_regulatory_knowledge_v1'","userClient.rpc('get_regulatory_knowledge_entry_v1'"])has(regulatoryEdge,marker,'M8 caller-JWT Edge');
req(!/admin\.|service_role|SUPABASE_SERVICE_ROLE/.test(regulatoryEdge),'M8 assistant gained service-role authority');
req(!/\.from\(/.test(regulatoryEdge),'M8 assistant gained direct table access');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(regulatoryCore+regulatoryEdge),'M8 provider path appeared during Zero-Escape');

for(const evidence of ['docs/PHASE12_3_CLOSURE.md','docs/PHASE12_4_CLOSURE.md','docs/PHASE9_4_CLOSURE.md'])req(fs.existsSync(evidence),'missing inherited closure evidence '+evidence);

if(errors.length){console.error(errors.map(x=>'- '+x).join('\n'));process.exit(1)}
console.log('ENJAZ PHASE 12.5 ZERO-ESCAPE AUDIT PASS — M8/M9 authority frozen; W1 deterministic safety + optional W2 Real Cloud evidence governed; no new feature/DB/write/provider/UI authority; Phase 13.1 locked.');
