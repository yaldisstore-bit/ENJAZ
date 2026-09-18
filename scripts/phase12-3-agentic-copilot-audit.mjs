import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_3_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_2_STATE.json'));
const kickoff=read('docs/PHASE12_3_KICKOFF.md');
const closure=read('docs/PHASE12_2_CLOSURE.md');
const core=read('supabase/functions/enjaz-copilot-agent/core.ts');
const approval=read('supabase/functions/enjaz-copilot-agent/approval.ts');
const a2=read('docs/PHASE12_3_A2_KICKOFF.md');
const migration=read('database/migrations/phase_12_3_agentic_approval_binding.sql');
const indexHardening=read('database/migrations/phase_12_3_agentic_approval_fk_index_hardening.sql');
const edge=read('supabase/functions/enjaz-copilot-agent/index.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_3Allowed===true,'12.2 predecessor is not formally closed/authorized');
req(state.phase==='12.3'&&state.name==='Agentic ENJAZ Copilot'&&state.majorSystem==='M9'&&state.status==='IN_PROGRESS','12.3 identity invalid');
req(state.baseCommit==='00470d129693fdf1362becbc7d95f54560f79481','12.3 base must be exact final 12.2 closure merge');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.3 predecessor lineage drifted');
req(state.slice==='A2_APPROVAL_BINDING_CONTRACT','12.3 current slice must be A2 approval binding');
req(state.a1Certification==='PASS_PLAN_PROPOSAL_CONTRACT'&&state.a1SourceGateVerification==='PASS','12.3 A1 certification must remain preserved');
req(state.successorPhase==='12.4'&&state.successorStatus==='LOCKED'&&state.phase12_4Allowed===false,'12.4 must remain locked');
req(JSON.stringify(state.openingOperations)===JSON.stringify(['plan','propose']),'12.3 A1 operations drifted');

for(const key of [
  'executeOperationAllowed','sensitiveMutationExecutionAllowed','directBusinessTableWritesAllowed','genericWriteToolAllowed',
  'serviceRoleBusinessReadsAllowed','browserToolExecutionAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed',
  'rawGoalPersistenceAllowed','rawPlanPersistenceAllowed','rawModelOutputPersistenceAllowed','providerRequired',
  'clientUiAdded','edgeAgentDeployed','budgetIncreaseAllowed','executionClaimAllowed'
])req(state[key]===false,`${key} must remain false in 12.3-A2`);
req(state.databaseAgentMigrationApplied===true&&state.a2IndexHardeningStatus==='PASS_LIVE','12.3 A2 database evidence must be live and hardened before Edge certification');
req(state.a2FirstMigrationVersion==='20260918151400'&&state.a2IndexHardeningMigrationVersion==='20260918151614','12.3 A2 live migration lineage drifted');
req(state.securityAdvisorPostA2Total===65&&state.unindexedForeignKeysPostA2===28&&state.a2NewSecurityAdvisorFindings===0&&state.a2NewPerformanceWarnFindings===0,'12.3 A2 post-migration advisor evidence drifted');

for(const key of ['explicitApprovalRequired','approvalBindingRequired','approvalExpiryRequired','approvalReplayProtectionRequired','domainValidationRequired','rlsRequired','workspacePermissionRequired','citationsRequired','provenanceRequired'])req(state[key]===true,`${key} must remain true`);

req(state.structuredPlanSchema==='enjaz.copilot.agent.plan.v1','12.3 plan schema drifted');
req(state.approvalSchema==='enjaz.copilot.agent.approval.v1'&&state.proposalDigestRequired===true&&state.approvalEvidencePrivate===true&&state.approvalSingleUseRequired===true,'12.3 A2 approval contract drifted');
req(state.approvalTtlMinutes===10&&state.approvalMaxTtlMinutes===30,'12.3 A2 approval expiry contract drifted');
req(JSON.stringify(state.approvalDecisionOperations)===JSON.stringify(['approve_proposal','reject_proposal']),'12.3 A2 approval decision vocabulary drifted');
req(state.planningMode==='DETERMINISTIC_GROUNDED_PLAN_V1','12.3 A1 planning mode drifted');
req(state.authoritativeContextSource==='global_search_v1'&&state.authoritativeContextSourceSchema==='enjaz.global-search-result.v1','12.3 context authority drifted');
req(state.contextContractInheritedFrom==='enjaz.copilot.context.v1','12.3 must inherit 12.2 context contract');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'client ceilings drifted');

for(const marker of [
  'Status:** CLOSED / CERTIFIED',
  '10592bbd0d91684970d5074719871039892d4667',
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

for(const marker of [
  "AGENT_APPROVAL_SCHEMA='enjaz.copilot.agent.approval.v1'","AGENT_APPROVAL_DECISIONS=['approve','reject']",
  'digestBound:true','expiryRequired:true','singleUseRequired:true','executionAllowed:false','businessMutationAllowed:false'
])has(approval,marker,'12.3 approval core');
req(!/\.from\(|\.rpc\(/.test(approval),'12.3 A2 approval core may not own persistence or RPC authority');
for(const marker of [
  'create table private.copilot_agent_proposals','create table private.copilot_agent_approval_events',
  'copilot_register_agent_proposal_v1_impl','copilot_decide_agent_proposal_v1_impl',
  'ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT','from public,anon,authenticated,service_role'
])has(migration,marker,'12.3 A2 migration');
req(!/\b(insert into|update|delete from)\s+public\./i.test(migration),'12.3 A2 migration may not mutate canonical business tables');
req(!/\b(raw_goal|raw_plan|plan_snapshot|model_output|prompt_text)\b/i.test(migration),'12.3 A2 migration may not persist raw plan/model content');
for(const marker of [
  'copilot_agent_proposals_actor_idx','copilot_agent_proposals_decided_by_idx',
  'copilot_agent_proposals_consumed_by_idx','copilot_agent_approval_events_actor_idx'
])has(indexHardening,marker,'12.3 A2 FK index hardening');
req(!/\b(insert into|update|delete from)\b/i.test(indexHardening),'12.3 A2 FK index hardening may not mutate rows');
for(const marker of ['tamper-evident approval evidence','A2 exposes no consume/execute RPC','Phase 12.4 remains LOCKED'])has(a2,marker,'12.3 A2 kickoff');
for(const marker of [
  "userClient.rpc('global_search_v1'","admin.rpc('copilot_begin_request_v3'","admin.rpc('copilot_register_agent_proposal_v1'",
  "admin.rpc('copilot_decide_agent_proposal_v1'","userClient.auth.getUser(token)","approvalResult("
])has(edge,marker,'12.3 A2 Edge boundary');
req(!/admin\.from\(/.test(edge),'12.3 A2 Edge service role may not read business tables');
req(!/admin\.rpc\(['\"](?:post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(edge),'12.3 A2 Edge may not invoke business mutation RPCs');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(edge),'12.3 A2 Edge provider path forbidden');

has(roadmap,'## 12.3 — Agentic ENJAZ Copilot — M9','roadmap');
has(roadmap,'Sensitive mutations require explicit user approval and domain-service validation.','roadmap');

if(errors.length){console.error(errors.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log('ENJAZ PHASE 12.3 A2 AGENTIC COPILOT AUDIT PASS — exact 12.2 closure lineage, A1 plan/propose preserved, A2 digest-bound expiring approval evidence, execution/claim locked, no business write/provider/browser authority, frozen budgets preserved, and 12.4 locked.');
