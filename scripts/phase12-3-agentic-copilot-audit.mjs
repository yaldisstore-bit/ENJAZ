import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_3_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_2_STATE.json'));
const kickoff=read('docs/PHASE12_3_KICKOFF.md');
const closure=read('docs/PHASE12_2_CLOSURE.md');
const core=read('supabase/functions/enjaz-copilot-agent/core.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_3Allowed===true,'12.2 predecessor is not formally closed/authorized');
req(state.phase==='12.3'&&state.name==='Agentic ENJAZ Copilot'&&state.majorSystem==='M9'&&state.status==='IN_PROGRESS','12.3 identity invalid');
req(state.baseCommit==='00470d129693fdf1362becbc7d95f54560f79481','12.3 base must be exact final 12.2 closure merge');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.3 predecessor lineage drifted');
req(state.slice==='A1_PLAN_PROPOSAL_CONTRACT','12.3 opening slice drifted');
req(state.successorPhase==='12.4'&&state.successorStatus==='LOCKED'&&state.phase12_4Allowed===false,'12.4 must remain locked');
req(JSON.stringify(state.openingOperations)===JSON.stringify(['plan','propose']),'12.3 A1 operations drifted');

for(const key of [
  'executeOperationAllowed','sensitiveMutationExecutionAllowed','directBusinessTableWritesAllowed','genericWriteToolAllowed',
  'serviceRoleBusinessReadsAllowed','browserToolExecutionAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed',
  'rawGoalPersistenceAllowed','rawPlanPersistenceAllowed','rawModelOutputPersistenceAllowed','providerRequired',
  'clientUiAdded','databaseAgentMigrationApplied','edgeAgentDeployed','budgetIncreaseAllowed'
])req(state[key]===false,`${key} must remain false in 12.3-A1`);

for(const key of ['explicitApprovalRequired','approvalBindingRequired','approvalExpiryRequired','approvalReplayProtectionRequired','domainValidationRequired','rlsRequired','workspacePermissionRequired','citationsRequired','provenanceRequired'])req(state[key]===true,`${key} must remain true`);

req(state.structuredPlanSchema==='enjaz.copilot.agent.plan.v1','12.3 plan schema drifted');
req(state.planningMode==='DETERMINISTIC_GROUNDED_PLAN_V1','12.3 A1 planning mode drifted');
req(state.authoritativeContextSource==='global_search_v1'&&state.authoritativeContextSourceSchema==='enjaz.global-search-result.v1','12.3 context authority drifted');
req(state.contextContractInheritedFrom==='enjaz.copilot.context.v1','12.3 must inherit 12.2 context contract');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'client ceilings drifted');

for(const marker of [
  'Status:** CLOSED / CERTIFIED',
  '00470d129693fdf1362becbc7d95f54560f79481',
  'Phase 12.3 — Agentic ENJAZ Copilot is now **AUTHORIZED_NEXT**'
])has(closure,marker,'12.2 closure');

for(const marker of [
  'PLAN / PROPOSE ONLY','No mutation execution is authorized','explicit user approval','domain validation',
  'No “generic execute SQL/RPC” tool is allowed.','Phase 12.4 — Regulatory Knowledge Assistance — M8 remains LOCKED.'
])has(kickoff,marker,'12.3 kickoff');

for(const marker of [
  "AGENT_PLAN_SCHEMA='enjaz.copilot.agent.plan.v1'",
  "AGENT_OPERATIONS=['plan','propose']",
  "ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','goal','contextQuery','limitPerDomain'])",
  "destination.startsWith('/app/')",
  "executionAllowed:false",
  "explicitApprovalRequired:true",
  "approvalReplayProtectionRequired:true",
  "domainValidationRequired:true",
  "genericWriteToolAllowed:false",
  "executionStatus:'locked_proposal_only'"
])has(core,marker,'12.3 agent core');

req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(core),'12.3 A1 provider path forbidden');
req(!/\.from\(['"][^'"]+['"]\)/.test(core),'12.3 A1 table access forbidden');
req(!/AGENT_OPERATIONS=\[[^\]]*execute/.test(core),'12.3 A1 execute operation forbidden');
req(!/\b(insert into|update\s+public\.|delete from)\b/i.test(core),'12.3 A1 mutation source forbidden');

has(roadmap,'## 12.3 — Agentic ENJAZ Copilot — M9','roadmap');
has(roadmap,'Sensitive mutations require explicit user approval and domain-service validation.','roadmap');

if(errors.length){console.error(errors.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log('ENJAZ PHASE 12.3 A1 AGENTIC COPILOT AUDIT PASS — exact 12.2 closure lineage, deterministic plan/propose contract, execution locked, explicit approval/domain/RLS controls reserved, no write/provider/browser authority, frozen budgets preserved, and 12.4 locked.');
