import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_2_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_1_STATE.json'));
const kickoff=read('docs/PHASE12_2_KICKOFF.md');
const migration=read('database/migrations/phase_12_2_contextual_assistance.sql');
const edge=read('supabase/functions/enjaz-copilot-context/index.ts');
const core=read('supabase/functions/enjaz-copilot-context/core.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_2Allowed===true,'12.1 predecessor is not formally closed/authorized');
req(state.phase==='12.2'&&state.name==='Contextual Assistance'&&state.status==='IN_PROGRESS','12.2 lifecycle identity invalid');
req(state.baseCommit==='47ac47ce131dec324f3a34f450a2e6bafd025b29','12.2 base must be exact formal 12.1 closure');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.2 predecessor lineage drifted');
req(state.successorPhase==='12.3'&&state.successorStatus==='LOCKED'&&state.phase12_3Allowed===false,'12.3 must remain locked');
req(JSON.stringify(state.contextualOperations)===JSON.stringify(['search','summarize','compare','draft','explain']),'12.2 operation registry drifted');
req(state.authoritativeContextSource==='global_search_v1'&&state.authoritativeContextSourceSchema==='enjaz.global-search-result.v1','12.2 authority source drifted');
for(const key of ['businessMutationToolsAllowed','directBusinessTableWritesAllowed','serviceRoleBusinessReadsAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed','rawPromptPersistenceAllowed','rawQueryPersistenceAllowed','rawModelOutputPersistenceAllowed','responsePersistenceAllowed','budgetIncreaseAllowed'])req(state[key]===false,`${key} must remain false`);
req(state.requestIdempotencyRequired===true&&state.rateLimitPerMinute===20&&state.traceEvidencePrivate===true&&state.workspacePermissionRequired===true,'12.1 safety boundary not preserved');
req(state.citationsRequired===true&&state.provenanceRequired===true,'12.2 grounding requirements must remain enabled');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'frozen client budgets drifted');
req(state.clientUiAdded===false&&state.newClientCssAdded===false,'opening 12.2 slice must remain server-first');

for(const marker of [
  'global_search_v1','service role may manage Copilot trace evidence','must not be used to widen contextual business reads',
  'search','summarize','compare','draft','explain','fresh_on_replay',
  '**Phase 12.3 — Agentic ENJAZ Copilot remains LOCKED.**'
])has(kickoff,marker,'12.2 kickoff');

for(const marker of [
  'copilot_request_traces_operation_check',
  "'search','summarize','compare','draft','explain'",
  'copilot_begin_request_v2_impl',
  'public.workspace_memberships',
  'pg_advisory_xact_lock',
  'ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT',
  'to service_role'
])has(migration,marker,'12.2 migration');

for(const marker of [
  "userClient.rpc('global_search_v1'",
  "admin.rpc('copilot_begin_request_v2'",
  "admin.rpc('copilot_finish_request_v1'",
  'parseSearchReferences',
  'buildContextResult'
])has(edge,marker,'12.2 edge');

req(!edge.includes("admin.rpc('global_search_v1'"),'service role must not read business context');
req(!/\.from\(['"][^'"]+['"]\)/.test(edge),'12.2 Edge must not directly read/write tables');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText/.test(edge+core),'opening 12.2 slice unexpectedly introduced provider path');

for(const marker of [
  "CONTEXT_SCHEMA='enjaz.copilot.context.v1'",
  "CONTEXT_OPERATIONS=['search','summarize','compare','draft','explain']",
  "'enjaz.global-search-result.v1'",
  "generationMode:'deterministic_grounded_v1'",
  "readSemantics:'fresh_on_replay'"
])has(core,marker,'12.2 core');

has(roadmap,'## 12.2 — Contextual Assistance','roadmap');
has(roadmap,'Search, summarize, compare, draft and explain authoritative ENJAZ information with citations/provenance where applicable.','roadmap');

if(errors.length){console.error(errors.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log('ENJAZ PHASE 12.2 CONTEXTUAL ASSISTANCE AUDIT PASS — exact 12.1 lineage, permission-scoped global-search reuse, cited deterministic assistance, no business writes/provider leakage/raw-content persistence, frozen client budgets, and 12.3 successor lock preserved.');
