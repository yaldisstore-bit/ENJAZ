import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_3_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_2_STATE.json'));
const kickoff=read('docs/PHASE12_3_KICKOFF.md');
const closure=read('docs/PHASE12_2_CLOSURE.md');
const core=read('supabase/functions/enjaz-copilot-agent/core.ts');
const approval=read('supabase/functions/enjaz-copilot-agent/approval.ts');
const a2=read('docs/PHASE12_3_A2_KICKOFF.md');
const a2Evidence=read('docs/PHASE12_3_A2_EVIDENCE.md');
const migration=read('database/migrations/phase_12_3_agentic_approval_binding.sql');
const indexHardening=read('database/migrations/phase_12_3_agentic_approval_fk_index_hardening.sql');
const edge=read('supabase/functions/enjaz-copilot-agent/index.ts');
const action=read('supabase/functions/enjaz-copilot-agent/action.ts');
const a3=read('docs/PHASE12_3_A3_KICKOFF.md');
const a3Evidence=read('docs/PHASE12_3_A3_EVIDENCE.md');
const actionMigration=read('database/migrations/phase_12_3_agentic_action_followup_snooze.sql');
const a3b=read('docs/PHASE12_3_A3B_KICKOFF.md');
const a3bEvidence=read('docs/PHASE12_3_A3B_EVIDENCE.md');
const createMigration=read('database/migrations/phase_12_3_agentic_action_followup_create.sql');
const a3c=read('docs/PHASE12_3_A3C_KICKOFF.md');
const a3cEvidence=read('docs/PHASE12_3_A3C_EVIDENCE.md');
const reminderMigration=read('database/migrations/phase_12_3_agentic_action_schedule_reminder.sql');
const reminderSnapshotRpcHardening=read('database/migrations/phase_12_3_agentic_schedule_snapshot_rpc_name_hardening.sql');
const a3d=read('docs/PHASE12_3_A3D_KICKOFF.md');
const a3dEvidence=read('docs/PHASE12_3_A3D_EVIDENCE.md');
const documentRequestMigration=read('database/migrations/phase_12_3_agentic_action_document_request.sql');
const a3e=read('docs/PHASE12_3_A3E_KICKOFF.md');
const documentDraftMigration=read('database/migrations/phase_12_3_agentic_action_document_draft.sql');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_3Allowed===true,'12.2 predecessor is not formally closed/authorized');
req(state.phase==='12.3'&&state.name==='Agentic ENJAZ Copilot'&&state.majorSystem==='M9'&&state.status==='IN_PROGRESS','12.3 identity invalid');
req(state.baseCommit==='00470d129693fdf1362becbc7d95f54560f79481','12.3 base must be exact final 12.2 closure merge');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.3 predecessor lineage drifted');
req(state.slice==='A3E_DOCUMENT_DRAFT_ACTION','12.3 current slice must be A3-E document draft');
req(state.a3Certification==='PASS_FOLLOWUP_SNOOZE_REAL_CLOUD'&&state.a3CertificationCommitSourceGateVerification==='PASS'&&state.a3CertificationCommitRealCloudVerification==='PASS','12.3 A3-A must remain fully certified before A3-B');
req(state.a3BCertification==='PASS_FOLLOWUP_CREATE_REAL_CLOUD'&&state.a3BCertificationStatus==='CERTIFIED','12.3 A3-B certification missing');
req(state.a3BSourceGateVerification==='PASS'&&state.a3BSourceGateRunId===35365775441&&state.a3BSourceGateRunNumber===26&&state.a3BCertifiedSourceHead==='50a1a6dbb344c4b9f953622522227708ee60c570','12.3 A3-B source certification drifted');
req(state.a3BDatabaseMigrationApplied===true&&state.a3BDatabaseMigrationVersion==='20260918155614'&&state.a3BHashCrossLanguageVerification==='PASS_2bfd1cff89208f10e1cb57e26d4ed97d880a4d74047c346d08ecd141dd4b252f','12.3 A3-B live database/hash evidence drifted');
req(state.a3BEdgeDeployed===true&&state.a3BEdgeVersion===3&&state.a3BEdgeVerifyJwt===true&&state.a3BEdgeDeploymentDigest==='fb734498925bddb4bc9585a663a6047eaad883fb3508715f8be50a709c660721','12.3 A3-B Edge deployment evidence drifted');
req(state.a3BRealCloudVerification==='PASS'&&state.a3BRealCloudRunId===35365775737&&state.a3BRealCloudChecks===33&&state.a3BRealCloudFailureCount===0,'12.3 A3-B Real Cloud evidence drifted');
req(state.a3BRealCloudZeroResidue===true&&state.a3BRealCloudNestedHashVerified===true&&state.a3BRealCloudAtomicRollbackVerified===true&&state.a3BRealCloudSingleUseReplayVerified===true&&state.a3BRealCloudCrossWorkspaceZeroMutation===true,'12.3 A3-B destructive guarantees drifted');
req(state.a3BSecurityAdvisorTotal===65&&state.a3BNewSecurityAdvisorFindings===0&&state.a3BUnindexedForeignKeys===28&&state.a3BNewPerformanceWarnFindings===0,'12.3 A3-B advisor evidence drifted');
req(state.a2FinalSourceGateVerification==='PASS'&&state.a2FinalSourceGateRunId===35362458473&&state.a2FinalRealCloudVerification==='PASS'&&state.a2FinalRealCloudRunId===35362458544,'12.3 A2 final certification commit is not fully green');
req(state.a3Certification==='PASS_FOLLOWUP_SNOOZE_REAL_CLOUD'&&state.a3CertificationStatus==='CERTIFIED','12.3 A3-A certification missing');
req(state.a3FinalSourceGateVerification==='PASS'&&state.a3FinalSourceGateRunId===35364334584&&state.a3CertifiedSourceHead==='663c890aa4a9528af9ed977b0a6ce5d5b723a497','12.3 A3-A final source certification drifted');
req(state.a3RealCloudVerification==='PASS'&&state.a3RealCloudRunId===35364334463&&state.a3RealCloudChecks===32&&state.a3RealCloudFailureCount===0,'12.3 A3-A Real Cloud evidence drifted');
req(state.a3RealCloudZeroResidue===true&&state.a3RealCloudAtomicRollbackVerified===true&&state.a3RealCloudSingleUseReplayVerified===true&&state.a3RealCloudCrossWorkspaceZeroMutation===true,'12.3 A3-A destructive guarantees drifted');
req(state.a1Certification==='PASS_PLAN_PROPOSAL_CONTRACT'&&state.a1SourceGateVerification==='PASS','12.3 A1 certification must remain preserved');
req(state.successorPhase==='12.4'&&state.successorStatus==='LOCKED'&&state.phase12_4Allowed===false,'12.4 must remain locked');
req(JSON.stringify(state.openingOperations)===JSON.stringify(['plan','propose']),'12.3 A1 operations drifted');

for(const key of [
  'executeOperationAllowed','sensitiveMutationExecutionAllowed','directBusinessTableWritesAllowed','genericWriteToolAllowed',
  'serviceRoleBusinessReadsAllowed','browserToolExecutionAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed',
  'rawGoalPersistenceAllowed','rawPlanPersistenceAllowed','rawModelOutputPersistenceAllowed','providerRequired',
  'clientUiAdded','budgetIncreaseAllowed','genericExecuteOperationAllowed'
])req(state[key]===false,`${key} must remain false in 12.3-A3A`);
req(state.executionClaimAllowed===true&&state.actionSpecificExecutionAllowed===true&&state.lowRiskMutationExecutionAllowed===true,'12.3 A3-A narrow execution authority missing');
req(JSON.stringify(state.authorizedActionAdapters)===JSON.stringify(['followup.snooze','followup.create','reminder.schedule','document.request','document.draft']),'12.3 A3-E adapter allowlist drifted');
req(JSON.stringify(state.actionOperations)===JSON.stringify(['prepare_followup_snooze','execute_followup_snooze','prepare_followup_create','execute_followup_create','prepare_schedule_reminder','execute_schedule_reminder','prepare_document_request','execute_document_request','prepare_document_draft','execute_document_draft']),'12.3 A3-E operation allowlist drifted');
req(state.a3BCertification==='PASS_FOLLOWUP_CREATE_REAL_CLOUD'&&state.a3BCertificationStatus==='CERTIFIED','12.3 A3-B certification must remain preserved');
req(state.a3CRecipientScope==='SELF_ONLY'&&state.a3CMode==='REMINDER_ONLY'&&state.a3CFollowupSideEffectAllowed===false,'12.3 A3-C reminder restriction drifted');
req(state.a3CCertification==='PASS_SELF_REMINDER_REAL_CLOUD'&&state.a3CCertificationStatus==='CERTIFIED','12.3 A3-C certification missing');
req(state.a3CSourceGateVerification==='PASS'&&state.a3CSourceGateRunId===35368643670&&state.a3CSourceGateRunNumber===35&&state.a3CCertifiedSourceHead==='59f01ae9d0faa647a22133e9c39026dd650c29d0','12.3 A3-C source certification drifted');
req(state.a3CDatabaseMigrationApplied===true&&state.a3CDatabaseMigrationVersion==='20260918161213'&&state.a3CSnapshotRpcHardeningApplied===true&&state.a3CSnapshotRpcHardeningMigrationVersion==='20260918162256','12.3 A3-C live migration lineage drifted');
req(state.a3CHashCrossLanguageVerification==='PASS_bc76b355fda7e1286593802b9a6f08726ab8f6f3fe692a73be4f06a73a306645','12.3 A3-C hash evidence drifted');
req(state.a3CEdgeDeployed===true&&state.a3CEdgeVersion===5&&state.a3CEdgeVerifyJwt===true&&state.a3CEdgeDeploymentDigest==='093487a817784a82649cb36c1aa45a33dfa238096bccda2e458c7d95a78c8b0e','12.3 A3-C Edge evidence drifted');
req(state.a3CRealCloudVerification==='PASS'&&state.a3CRealCloudRunId===35368643760&&state.a3CRealCloudRunNumber===3&&state.a3CRealCloudChecks===39&&state.a3CRealCloudFailureCount===0,'12.3 A3-C Real Cloud evidence drifted');
req(state.a3CRealCloudZeroResidue===true&&state.a3CRealCloudSelfRecipientVerified===true&&state.a3CRealCloudReminderOnlyVerified===true&&state.a3CRealCloudZeroFollowupSideEffect===true&&state.a3CRealCloudAtomicRollbackVerified===true&&state.a3CRealCloudSingleUseReplayVerified===true&&state.a3CRealCloudCrossWorkspaceZeroMutation===true,'12.3 A3-C destructive guarantees drifted');
req(state.a3CSecurityAdvisorTotal===65&&state.a3CNewSecurityAdvisorFindings===0&&state.a3CUnindexedForeignKeys===28&&state.a3CNewPerformanceWarnFindings===0,'12.3 A3-C advisor evidence drifted');
req(JSON.stringify(state.actionExecutionDomainAuthorities)===JSON.stringify(['mutate_transaction_followup_state_v1','create_transaction_followup_v1','dispatch_scheduling_attention_v1','save_client_portal_request_v1']),'12.3 A3-D domain authority allowlist drifted');
req(state.actionProposalDigestDatabaseRecomputed===true&&state.actionExecutionPayloadCarriesBusinessFields===false&&state.actionExecutionAtomicConsumeAndDomainMutation===true,'12.3 A3-A binding/atomicity contract drifted');
req(state.edgeAgentDeployed===true&&state.edgeAgentFunction==='enjaz-copilot-agent'&&state.edgeAgentVersion===1&&state.edgeAgentVerifyJwt===true,'12.3 A2 Edge deployment evidence drifted');
req(state.a2EdgeSourceGateVerification==='PASS'&&state.a2EdgeSourceGateRunId===35361859531&&state.a2EdgeSourceGateHead==='f08af983d724c7cdd1ad2fef2c844ab0ec30e28a','12.3 A2 Edge source gate evidence drifted');
req(state.a2Certification==='PASS_APPROVAL_BINDING_REAL_CLOUD'&&state.a2RealCloudVerification==='PASS'&&state.a2RealCloudChecks===49&&state.a2RealCloudFailureCount===0,'12.3 A2 Real Cloud certification drifted');
req(state.a2RealCloudZeroBusinessMutation===true&&state.a2RealCloudZeroResidue===true,'12.3 A2 must preserve zero business mutation and zero residue');
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
for(const marker of ['49/49 PASS','tampered proposal digest is denied','expired approval is denied with the real clock','test auth users: **0**','Phase 12.4 remains LOCKED'])has(a2Evidence,marker,'12.3 A2 evidence');
for(const marker of [
  "userClient.rpc('global_search_v1'","admin.rpc('copilot_begin_request_v8'","admin.rpc('copilot_register_agent_proposal_v1'",
  "admin.rpc('copilot_decide_agent_proposal_v1'","userClient.auth.getUser(token)","approvalResult("
])has(edge,marker,'12.3 A2 Edge boundary');
req(!/admin\.from\(/.test(edge),'12.3 A2 Edge service role may not read business tables');
req(!/admin\.rpc\(['\"](?:copilot_execute_followup_snooze_v1|post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(edge),'12.3 A3-A service role may not invoke business mutation RPCs');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(edge),'12.3 A3-A Edge provider path forbidden');
for(const marker of [
  "AGENT_ACTION_SCHEMA='enjaz.copilot.agent.action.v1'","'prepare_followup_create','execute_followup_create'",
  "followupSnoozeCanonical","executionAllowed:false","genericWriteToolAllowed:false"
])has(action,marker,'12.3 A3-A action core');
for(const marker of [
  'private.copilot_followup_snooze_hash_v1','extensions.digest(','ENJAZ_COPILOT_ACTION_HASH_CONFLICT',
  'private.copilot_execute_followup_snooze_v1_impl',"public.mutate_transaction_followup_state_v1(","set status='consumed'",
  'grant execute on function public.copilot_execute_followup_snooze_v1(uuid,uuid,text,uuid)'
])has(actionMigration,marker,'12.3 A3-A migration');
req(!/\b(post_payment_v1|reverse_payment_v1|archive_document_v1|generate_document_draft_v1|send_client_portal_message_v1)\b/.test(actionMigration),'12.3 A3-A migration has unauthorized business adapter');
for(const marker of ['followup.snooze','execution request does not contain the target follow-up','inside one transaction','Phase 12.4 remains LOCKED'])has(a3,marker,'12.3 A3-A kickoff');
for(const marker of ['32/32 PASS','execution before explicit approval is denied','proposal consumption is rolled back atomically','test auth users: **0**','Phase 12.4 remains LOCKED'])has(a3Evidence,marker,'12.3 A3-A evidence');
for(const marker of ['followup.create','title is SHA-256 hashed first','create_transaction_followup_v1','Phase 12.4 remains LOCKED'])has(a3b,marker,'12.3 A3-B kickoff');
for(const marker of ['private.copilot_followup_create_hash_v1',"action_kind='followup.create'",'private.copilot_execute_followup_create_v1_impl','public.create_transaction_followup_v1(','grant execute on function public.copilot_execute_followup_create_v1(uuid,uuid,text,uuid)'])has(createMigration,marker,'12.3 A3-B migration');
req(!/\b(post_payment_v1|reverse_payment_v1|archive_document_v1|send_client_portal_message_v1)\b/.test(createMigration),'12.3 A3-B migration has unauthorized adapter');
for(const marker of ['33/33 PASS','business fields cannot be injected into the execution request','proposal consumption is rolled back atomically','test auth users: **0**','Phase 12.4 remains LOCKED'])has(a3bEvidence,marker,'12.3 A3-B evidence');
for(const marker of ['reminder.schedule','recipient is hard-locked','auth.uid()','dispatch_scheduling_attention_v1','Phase 12.4 remains LOCKED'])has(a3c,marker,'12.3 A3-C kickoff');
for(const marker of ['private.copilot_schedule_reminder_hash_v1',"action_kind='reminder.schedule'",'private.copilot_execute_schedule_reminder_v1_impl','public.dispatch_scheduling_attention_v1(', "v_actor,'reminder',v_row.action_scheduled_for,null,null",'grant execute on function public.copilot_execute_schedule_reminder_v1(uuid,uuid,text,uuid)'])has(reminderMigration,marker,'12.3 A3-C migration');
req(!/\b(post_payment_v1|reverse_payment_v1|send_client_portal_message_v1|mutate_transaction_workflow)\b/.test(reminderMigration),'12.3 A3-C migration has unauthorized adapter');
for(const marker of ['create or replace function public.get_scheduling_deadline_snapshot_v1(','p_workspace_id uuid','p_as_of timestamptz','private.get_scheduling_deadline_snapshot_v1_impl(p_workspace_id,p_as_of)','grant execute on function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz)'])has(reminderSnapshotRpcHardening,marker,'12.3 A3-C snapshot RPC hardening');
req(!/\b(insert into|update\s+public\.|delete from)\b/i.test(reminderSnapshotRpcHardening),'12.3 A3-C snapshot RPC hardening may not mutate business rows');
for(const marker of ['39/39 PASS','recipient injection is denied','exactly one canonical in-app notification is created','proposal consumption rolls back atomically','test auth users: **0**','Phase 12.4 remains **LOCKED**'])has(a3cEvidence,marker,'12.3 A3-C evidence');
req(state.a3CCertification==='PASS_SELF_REMINDER_REAL_CLOUD'&&state.a3CCertificationStatus==='CERTIFIED','12.3 A3-C must remain certified before A3-D');
for(const marker of ['document.request','request type is hard-locked','save_client_portal_request_v1','expectedVersion','Phase 12.4 remains LOCKED'])has(a3d,marker,'12.3 A3-D kickoff');
for(const marker of ['private.copilot_document_request_hash_v1',"action_kind='document.request'",'private.copilot_execute_document_request_v1_impl',"v_row.action_transaction_id,'document'",'grant execute on function public.copilot_execute_document_request_v1(uuid,uuid,text,uuid)'])has(documentRequestMigration,marker,'12.3 A3-D migration');
req(!/\b(post_payment_v1|reverse_payment_v1|mutate_transaction_workflow|send_client_portal_message_v1)\b/.test(documentRequestMigration),'12.3 A3-D migration has unauthorized adapter');
req(state.a3DRequestType==='DOCUMENT_ONLY'&&state.a3DResourceShareAllowed===false&&state.a3DExistingRequestUpdateAllowed===false,'12.3 A3-D restriction drifted');
req(state.a3DCertification==='PASS_DOCUMENT_REQUEST_REAL_CLOUD'&&state.a3DCertificationStatus==='CERTIFIED','12.3 A3-D certification missing');
req(state.a3DSourceGateVerification==='PASS'&&state.a3DSourceGateRunId===35371537671&&state.a3DSourceGateRunNumber===45&&state.a3DCertifiedSourceHead==='f9be4f42619b2c2c2f05232fbea7e98532c72397','12.3 A3-D source certification drifted');
req(state.a3DDatabaseMigrationApplied===true&&state.a3DDatabaseMigrationVersion==='20260918164302'&&state.a3DHashCrossLanguageVerification==='PASS_160ab86b520d994579e2158c5c763befec77f84c431c2f5a6f575f639f1f80ff','12.3 A3-D live database/hash evidence drifted');
req(state.a3DEdgeDeployed===true&&state.a3DEdgeVersion===9&&state.a3DEdgeVerifyJwt===true&&state.a3DEdgeDeploymentDigest==='2009edbe8331cbada408a412d1c61e513e9da0f0e1571ec8148e21ddc09e1aab','12.3 A3-D Edge deployment evidence drifted');
req(state.a3DRealCloudVerification==='PASS'&&state.a3DRealCloudRunId===35371537794&&state.a3DRealCloudRunNumber===1&&state.a3DRealCloudChecks===44&&state.a3DRealCloudFailureCount===0&&state.a3DRealCloudZeroResidue===true,'12.3 A3-D Real Cloud evidence drifted');
req(state.a3DRealCloudInvitedPrincipalVerified===true&&state.a3DRealCloudGrantFloorVerified===true&&state.a3DRealCloudDocumentOnlyVerified===true&&state.a3DRealCloudCreateOnlyVerified===true,'12.3 A3-D authority restrictions not certified');
req(state.a3DRealCloudAtomicRollbackVerified===true&&state.a3DRealCloudSingleUseReplayVerified===true&&state.a3DRealCloudCrossWorkspaceZeroMutation===true,'12.3 A3-D destruction evidence missing');
for(const marker of ['44/44 PASS','invited client principal','both `view` and `upload_requested_document`','exactly one canonical client portal document request is created','proposal consumption rolls back atomically','test auth users: **0**','Phase 12.4 remains **LOCKED**'])has(a3dEvidence,marker,'12.3 A3-D evidence');
req(state.a3DCertification==='PASS_DOCUMENT_REQUEST_REAL_CLOUD'&&state.a3DCertificationStatus==='CERTIFIED','12.3 A3-D must remain certified before A3-E');
for(const marker of ['document.draft','review_required','get_document_factory_v1','generate_document_draft_v1','contactId','ocrAnalysisId','Phase 12.4 remains LOCKED'])has(a3e,marker,'12.3 A3-E kickoff');
for(const marker of ['private.copilot_document_draft_hash_v1',"action_kind='document.draft'",'private.copilot_execute_document_draft_v1_impl','public.generate_document_draft_v1(','v_row.action_company_id,v_row.action_transaction_id,null,null','grant execute on function public.copilot_execute_document_draft_v1(uuid,uuid,text,uuid)'])has(documentDraftMigration,marker,'12.3 A3-E migration');
req(!/\b(review_document_draft_v1|request_document_render_v1|finalize_document_draft_v1|submit_document_draft_for_review_v1|update_document_draft_content_v1)\b/.test(documentDraftMigration),'12.3 A3-E may not expose review/render/finalization');
req(state.a3EOutputStatus==='REVIEW_REQUIRED_ONLY'&&state.a3EContactInputAllowed===false&&state.a3EOcrInputAllowed===false&&state.a3EReviewAllowed===false&&state.a3ERenderAllowed===false&&state.a3EFinalizeAllowed===false,'12.3 A3-E restriction drifted');


has(roadmap,'## 12.3 — Agentic ENJAZ Copilot — M9','roadmap');
has(roadmap,'Sensitive mutations require explicit user approval and domain-service validation.','roadmap');

if(errors.length){console.error(errors.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log('ENJAZ PHASE 12.3 A3-E AGENTIC COPILOT AUDIT PASS — A1/A2/A3-A/A3-B/A3-C/A3-D certified; document.draft is the sole new A3-E adapter, review-required only through M7 generate_document_draft_v1, no generic/service-role business execution, frozen budgets preserved, and 12.4 locked.');
