import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_4_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_3_STATE.json'));
const m8=JSON.parse(read('docs/PHASE9_4_STATE.json'));
const registry=JSON.parse(read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'));
const kickoff=read('docs/PHASE12_4_KICKOFF.md');
const closure=read('docs/PHASE12_3_CLOSURE.md');
const m8Closure=read('docs/PHASE9_4_CLOSURE.md');
const core=read('supabase/functions/enjaz-regulatory-assistant/core.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const m8Registry=registry.systems?.find?.(x=>x.id==='M8');

req(prev.phase==='12.3'&&prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_4Allowed===true,'12.3 predecessor is not formally closed/authorized');
req(state.phase==='12.4'&&state.name==='Regulatory Knowledge Assistance'&&state.majorSystem==='M8'&&state.status==='IN_PROGRESS','12.4 lifecycle identity invalid');
req(state.baseCommit==='cc01d06be81be27e614d80c9edaa86bdf4e79634','12.4 base must be exact final 12.3 closure merge');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.4 predecessor lineage drifted');
req(state.successorPhase==='12.5'&&state.successorStatus==='LOCKED'&&state.phase12_5Allowed===false,'12.5 must remain locked');
req(state.slice==='A1_GROUNDED_REGULATORY_ASSISTANCE_CONTRACT','12.4 opening slice drifted');

req(m8.phase==='9.4'&&m8.status==='CLOSED'&&m8.majorSystem?.id==='M8'&&m8.majorSystem?.status==='ACTIVE','Phase 9.4 M8 foundation must remain closed/active');
req(m8.majorSystem?.anchors?.join(',')==='9,12'&&m8.majorSystem?.globalClosureAllowed===false,'M8 anchor/global closure law drifted');
req(m8.authority?.regulatoryTruth==='APPEND_VERSIONED_EFFECTIVE_DATED','M8 regulatory truth law drifted');
req(m8.authority?.officialSourceProvenance==='REQUIRED','M8 provenance law drifted');
req(m8.authority?.officialAndCuratedTruthMustRemainDistinct===true,'M8 official/curated separation drifted');
req(m8.authority?.aiOutputAuthority==='NEVER_AUTHORITATIVE'&&m8.authority?.editorialInterpretationAuthority==='NEVER_AUTHORITATIVE','M8 interpretation authority drifted');
req(m8.authority?.ambiguousAsOfResolution==='FAIL_CLOSED','M8 asOf ambiguity law drifted');
req(m8Registry?.status==='ACTIVE'&&m8Registry?.anchors?.join(',')==='9,12'&&m8Registry?.closureEvidence===null,'M8 registry must remain ACTIVE through Phase 12 anchor');

req(state.officialTruthAuthority==='PHASE9_4_M8_ONLY','12.4 created or lost regulatory truth authority');
req(JSON.stringify(state.existingReadAuthorities)===JSON.stringify(['search_regulatory_knowledge_v1','get_regulatory_knowledge_entry_v1']),'12.4 read authority allowlist drifted');
for(const key of ['officialAndCuratedTruthMustRemainDistinct','sourceVersionBindingRequired','sourceHashBindingRequired','sourceProvenanceRequired','explicitAsOfRequired','officialSourceTextAuthoritative','structuredSourceFactsAuthoritative'])req(state[key]===true,`${key} must remain true`);
for(const key of ['editorialInterpretationAuthoritative','aiInterpretationAuthoritative','assistanceInterpretationAuthoritative','directBusinessTableWritesAllowed','directRegulatoryTableReadsAllowed','directRegulatoryTableWritesAllowed','sourceIngestionAllowed','sourceMutationAllowed','derivedArtifactPersistenceAllowed','genericRpcExecutionAllowed','genericSqlExecutionAllowed','serviceRoleRegulatoryReadsAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed','rawQueryPersistenceAllowed','rawSourceTextPersistenceAllowed','generatedInterpretationPersistenceAllowed','providerRequired','providerConfigured','databaseMigrationAdded','edgeDeployed','clientUiAdded','budgetIncreaseAllowed'])req(state[key]===false,`${key} must remain false in 12.4-A1`);
req(state.ambiguousAsOfBehavior==='FAIL_CLOSED'&&state.missingAuthorityBehavior==='FAIL_CLOSED_NO_FABRICATION','12.4 fail-closed behavior drifted');
req(state.generationMode==='DETERMINISTIC_REGULATORY_GROUNDING_V1','12.4 A1 generation mode drifted');
req(JSON.stringify(state.openingOperations)===JSON.stringify(['answer']),'12.4 A1 operation registry drifted');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'frozen client ceilings drifted');

for(const marker of ['Status:** CLOSED / CERTIFIED','cc01d06be81be27e614d80c9edaa86bdf4e79634','Phase 12.4 — Regulatory Knowledge Assistance — M8 is now **AUTHORIZED_NEXT**'])has(closure,marker,'12.3 closure');
for(const marker of ['Status: **CLOSED','official-global ingestion remains **SERVICE_ROLE_ONLY**','editorial interpretation and AI summaries remain permanently **NON-AUTHORITATIVE**','M8 remains `ACTIVE`'])has(m8Closure,marker,'Phase 9.4 M8 closure');

for(const marker of ['A1 — Grounded Regulatory Assistance Contract','must not create a second regulatory source of truth','explicit ISO `asOf`','official source text','structured source facts','assistance / interpretation','Phase 12.5 — AI Zero-Escape & Safety Gate — **LOCKED**'])has(kickoff,marker,'12.4 kickoff');

for(const marker of [
  "REGULATORY_ASSISTANCE_SCHEMA='enjaz.regulatory.assistance.v1'",
  "REGULATORY_ASSISTANCE_OPERATIONS=['answer']",
  "ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','query','asOf','limit'])",
  "ambiguousAsOfBehavior:'fail_closed'",
  "missingAuthorityBehavior:'fail_closed_no_fabrication'",
  "authoritative:false as const",
  "providerUsed:false as const",
  "REGULATORY_ASOF_AMBIGUOUS"
])has(core,marker,'12.4 A1 core');
req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(core),'12.4 A1 provider path forbidden');
req(!/\.from\(|\.rpc\(/.test(core),'12.4 A1 pure core may not read tables or call RPCs');
req(!/\b(insert into|update\s+public\.|delete from|service_role)\b/i.test(core),'12.4 A1 source/mutation/service-role escape forbidden');

has(roadmap,'## 12.4 — Regulatory Knowledge Assistance — M8 — IN_PROGRESS','roadmap');
has(roadmap,'**A1 — Grounded Regulatory Assistance Contract: IN_PROGRESS**','roadmap');

if(errors.length){console.error(`ENJAZ PHASE 12.4 A1 AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log('ENJAZ PHASE 12.4 A1 REGULATORY ASSISTANCE AUDIT PASS — exact 12.3 closure lineage, Phase 9.4 M8 truth reused without shadow authority, explicit asOf/version/hash/provenance grounding, non-authoritative interpretation, no provider/persistence/UI/Edge/DB delta, frozen budgets preserved, and 12.5 locked.');
