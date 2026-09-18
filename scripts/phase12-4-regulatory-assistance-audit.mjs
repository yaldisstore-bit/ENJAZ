import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const state=JSON.parse(read('docs/PHASE12_4_STATE.json'));
const prev=JSON.parse(read('docs/PHASE12_3_STATE.json'));
const m8=JSON.parse(read('docs/PHASE9_4_STATE.json'));
const registry=JSON.parse(read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'));
const kickoff=read('docs/PHASE12_4_KICKOFF.md');
const closure=read('docs/PHASE12_3_CLOSURE.md');
const m8Closure=read('docs/PHASE9_4_CLOSURE.md');
const phase124Closure=fs.existsSync('docs/PHASE12_4_CLOSURE.md')?read('docs/PHASE12_4_CLOSURE.md'):'';
const core=read('supabase/functions/enjaz-regulatory-assistant/core.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const a2Kickoff=fs.existsSync('docs/PHASE12_4_A2_KICKOFF.md')?read('docs/PHASE12_4_A2_KICKOFF.md'):'';
const a2Evidence=fs.existsSync('docs/PHASE12_4_A2_EVIDENCE.md')?read('docs/PHASE12_4_A2_EVIDENCE.md'):'';
const edge=fs.existsSync('supabase/functions/enjaz-regulatory-assistant/index.ts')?read('supabase/functions/enjaz-regulatory-assistant/index.ts'):'';
const a3Kickoff=fs.existsSync('docs/PHASE12_4_A3_KICKOFF.md')?read('docs/PHASE12_4_A3_KICKOFF.md'):'';
const a3Evidence=fs.existsSync('docs/PHASE12_4_A3_EVIDENCE.md')?read('docs/PHASE12_4_A3_EVIDENCE.md'):'';

const errors=[],req=(v,m)=>{if(!v)errors.push(m)},has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const m8Registry=registry.systems?.find?.(x=>x.id==='M8');
const p125=fs.existsSync('docs/PHASE12_5_STATE.json')?JSON.parse(read('docs/PHASE12_5_STATE.json')):null;
const downstreamM8Closed=p125?.status==='CLOSED'&&p125?.closureDecision==='PASS'&&m8Registry?.status==='CLOSED'&&m8Registry?.closureEvidence==='docs/M8_ZERO_ESCAPE_CLOSURE.json'&&fs.existsSync('docs/M8_ZERO_ESCAPE_CLOSURE.json');

req(prev.phase==='12.3'&&prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase12_4Allowed===true,'12.3 predecessor is not formally closed/authorized');
req(state.phase==='12.4'&&state.name==='Regulatory Knowledge Assistance'&&state.majorSystem==='M8'&&['IN_PROGRESS','CLOSED'].includes(state.status),'12.4 lifecycle identity invalid');
req(state.baseCommit==='cc01d06be81be27e614d80c9edaa86bdf4e79634','12.4 base must be exact final 12.3 closure merge');
req(state.predecessorClosureMergeCommit===state.baseCommit,'12.4 predecessor lineage drifted');
req(state.successorPhase==='12.5','12.5 successor identity drifted');
if(state.status==='IN_PROGRESS')req(state.successorStatus==='LOCKED'&&state.phase12_5Allowed===false,'12.5 must remain locked while 12.4 is open');
else req(state.successorStatus==='AUTHORIZED_NEXT'&&state.phase12_5Allowed===true,'closed 12.4 may authorize only 12.5');
req(['A1_GROUNDED_REGULATORY_ASSISTANCE_CONTRACT','A2_AUTHENTICATED_M8_RETRIEVAL_EDGE','A3_SEARCH_ENTRY_BINDING_HARDENING'].includes(state.slice),'12.4 current slice drifted');

req(m8.phase==='9.4'&&m8.status==='CLOSED'&&m8.majorSystem?.id==='M8'&&m8.majorSystem?.status==='ACTIVE','Phase 9.4 M8 foundation must remain closed/active');
req(m8.majorSystem?.anchors?.join(',')==='9,12'&&m8.majorSystem?.globalClosureAllowed===false,'M8 anchor/global closure law drifted');
req(m8.authority?.regulatoryTruth==='APPEND_VERSIONED_EFFECTIVE_DATED','M8 regulatory truth law drifted');
req(m8.authority?.officialSourceProvenance==='REQUIRED','M8 provenance law drifted');
req(m8.authority?.officialAndCuratedTruthMustRemainDistinct===true,'M8 official/curated separation drifted');
req(m8.authority?.aiOutputAuthority==='NEVER_AUTHORITATIVE'&&m8.authority?.editorialInterpretationAuthority==='NEVER_AUTHORITATIVE','M8 interpretation authority drifted');
req(m8.authority?.ambiguousAsOfResolution==='FAIL_CLOSED','M8 asOf ambiguity law drifted');
if(downstreamM8Closed) req(m8Registry?.anchors?.join(',')==='9,12','M8 closed anchors drifted'); else req(m8Registry?.status==='ACTIVE'&&m8Registry?.anchors?.join(',')==='9,12'&&m8Registry?.closureEvidence===null,'M8 registry must remain ACTIVE until Phase 12.5 closure');

req(state.officialTruthAuthority==='PHASE9_4_M8_ONLY','12.4 created or lost regulatory truth authority');
req(JSON.stringify(state.existingReadAuthorities)===JSON.stringify(['search_regulatory_knowledge_v1','get_regulatory_knowledge_entry_v1']),'12.4 read authority allowlist drifted');
for(const key of ['officialAndCuratedTruthMustRemainDistinct','sourceVersionBindingRequired','sourceHashBindingRequired','sourceProvenanceRequired','explicitAsOfRequired','officialSourceTextAuthoritative','structuredSourceFactsAuthoritative'])req(state[key]===true,`${key} must remain true`);
for(const key of ['editorialInterpretationAuthoritative','aiInterpretationAuthoritative','assistanceInterpretationAuthoritative','directBusinessTableWritesAllowed','directRegulatoryTableReadsAllowed','directRegulatoryTableWritesAllowed','sourceIngestionAllowed','sourceMutationAllowed','derivedArtifactPersistenceAllowed','genericRpcExecutionAllowed','genericSqlExecutionAllowed','serviceRoleRegulatoryReadsAllowed','browserProviderCallsAllowed','browserSecretCredentialsAllowed','rawQueryPersistenceAllowed','rawSourceTextPersistenceAllowed','generatedInterpretationPersistenceAllowed','providerRequired','providerConfigured','databaseMigrationAdded','clientUiAdded','budgetIncreaseAllowed'])req(state[key]===false,`${key} must remain false in 12.4-A1`);
req(state.ambiguousAsOfBehavior==='FAIL_CLOSED'&&state.missingAuthorityBehavior==='FAIL_CLOSED_NO_FABRICATION','12.4 fail-closed behavior drifted');
req(state.generationMode==='DETERMINISTIC_REGULATORY_GROUNDING_V1','12.4 A1 generation mode drifted');
req(JSON.stringify(state.openingOperations)===JSON.stringify(['answer']),'12.4 A1 operation registry drifted');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000,'frozen client ceilings drifted');
req(state.a1Certification==='PASS_GROUNDED_REGULATORY_ASSISTANCE_CONTRACT'&&state.a1CertificationStatus==='CERTIFIED','12.4 A1 certification missing');
req(state.a1SourceGateVerification==='PASS'&&state.a1SourceGateRunId===35379162122&&state.a1SourceGateRunNumber===3&&state.a1SourceGateHead==='da314e4eb25be023260f8d43619337d2e3cf643c','12.4 A1 source certificate drifted');
req(state.a1CoreTests===7&&state.a1CoreTestFailures===0&&state.a1BudgetVerification==='PASS_FROZEN_CAPS','12.4 A1 test/budget certificate drifted');
if(state.slice==='A1_GROUNDED_REGULATORY_ASSISTANCE_CONTRACT')req(state.edgeDeployed===false,'12.4 A1 may not deploy an Edge boundary');

for(const marker of ['Status:** CLOSED / CERTIFIED','0353e15d0e8299ba5410d6fff5bf540b41b90443','Phase 12.4 — Regulatory Knowledge Assistance — M8 is now **AUTHORIZED_NEXT**'])has(closure,marker,'12.3 closure');
for(const marker of ['Status: **CLOSED','official-global ingestion remains **SERVICE_ROLE_ONLY**','editorial interpretation and AI summaries remain permanently **NON-AUTHORITATIVE**','M8 remains `ACTIVE`'])has(m8Closure,marker,'Phase 9.4 M8 closure');

for(const marker of ['A1 — Grounded Regulatory Assistance Contract','second regulatory source of truth','explicit ISO `asOf`','official source text','structured source facts','assistance / interpretation','Phase 12.5 — AI Zero-Escape & Safety Gate — **LOCKED**'])has(kickoff,marker,'12.4 kickoff');

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

if(state.status==='IN_PROGRESS')has(roadmap,'## 12.4 — Regulatory Knowledge Assistance — M8 — IN_PROGRESS','roadmap'); else has(roadmap,'## 12.4 — Regulatory Knowledge Assistance — M8 ✅ CLOSED','roadmap');
has(roadmap,'**A1 — Grounded Regulatory Assistance Contract: CERTIFIED**','roadmap');
if(['A2_AUTHENTICATED_M8_RETRIEVAL_EDGE','A3_SEARCH_ENTRY_BINDING_HARDENING'].includes(state.slice)){
  if(state.a2Status==='CERTIFIED')has(roadmap,'**A2 — Authenticated M8 Retrieval Edge: CERTIFIED**','roadmap'); else has(roadmap,'**A2 — Authenticated M8 Retrieval Edge: IN_PROGRESS**','roadmap');
  for(const marker of ['caller JWT is mandatory','no service-role/secret key is used','search_regulatory_knowledge_v1','get_regulatory_knowledge_entry_v1','exact official version'])has(a2Kickoff,marker,'12.4 A2 kickoff');
  req(state.a2EdgeAuthority==='CALLER_JWT_ONLY'&&state.a2ServiceRoleAllowed===false&&state.a2DatabaseMigrationRequired===false,'12.4 A2 authority state drifted');
  req(state.a2VerifyJwtRequired===true&&state.a2DirectTableAccessAllowed===false&&state.a2MutationRpcAllowed===false,'12.4 A2 Edge restrictions drifted');
  for(const marker of ["userClient.auth.getUser(token)","userClient.rpc('search_regulatory_knowledge_v1'","userClient.rpc('get_regulatory_knowledge_entry_v1'","p_as_of:parsed.asOf","assertRegulatoryEntryMatchesSearchReference(response.data,ref,parsed)","buildRegulatoryAssistanceResult(parsed,entries)"])has(edge,marker,'12.4 A2 Edge');
  req(!/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS|serviceKey\(|\badmin\b/.test(edge),'12.4 A2 service-role/admin authority forbidden');
  req(!/\.from\(/.test(edge),'12.4 A2 direct table access forbidden');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(edge),'12.4 A2 provider path forbidden');
  req(!/save_regulatory|insert_regulatory|update_regulatory|delete_regulatory|ingest_regulatory|create_regulatory/i.test(edge),'12.4 A2 regulatory mutation path forbidden');
  req(state.edgeDeployed===true&&state.a2EdgeDeployed===true&&state.a2EdgeVersion===2&&state.a2EdgeVerifyJwt===true&&state.a2EdgeDeploymentDigest==='a6c5332b1b9e382730f9518c1a684d8a1dea993f3685c65fd8fdd5e70c874a64','12.4 A2 live Edge certificate drifted');
  req(state.a2Status==='CERTIFIED'&&state.a2Certification==='PASS_AUTHENTICATED_M8_RETRIEVAL_REAL_CLOUD'&&state.a2CertificationStatus==='CERTIFIED','12.4 A2 certification missing');
  req(state.a2SourceGateVerification==='PASS'&&state.a2SourceGateRunId===35379906297&&state.a2SourceGateRunNumber===3&&state.a2SourceGateHead==='1cc82ee01da3a8de863820448e7e57585c4f0ae3','12.4 A2 source certificate drifted');
  req(state.a2RealCloudVerification==='PASS'&&state.a2RealCloudRunId===35380158712&&state.a2RealCloudRunNumber===2&&state.a2RealCloudChecks===18&&state.a2RealCloudFailureCount===0,'12.4 A2 Real Cloud certificate drifted');
  req(state.a2RealCloudZeroRegulatoryMutation===true&&state.a2RealCloudZeroResidue===true&&state.a2RealCloudEmptyStoreFailClosed===true&&state.a2RealCloudCrossWorkspaceDenied===true,'12.4 A2 safety evidence drifted');
  req(state.a2SecurityAdvisorTotal===65&&state.a2NewSecurityAdvisorFindings===0&&state.a2UnindexedForeignKeys===28&&state.a2NewPerformanceWarnFindings===0,'12.4 A2 advisor evidence drifted');
  req(state.a2RealCloudArtifactId===10561173790&&state.a2RealCloudArtifactDigest==='sha256:7e8efac16e3ca078268be2e52a4afb7f62f5bd902fdeb582975e6936a82c7020','12.4 A2 artifact evidence drifted');
  for(const marker of ['18/18 PASS','cleanup: **PASS**','zero regulatory mutation','cross-workspace regulatory assistance denied','Phase 12.5 remains **LOCKED**'])has(a2Evidence,marker,'12.4 A2 evidence');
}

if(state.slice==='A3_SEARCH_ENTRY_BINDING_HARDENING'){
  if(state.a3Status==='CERTIFIED')has(roadmap,'**A3 — Search↔Entry Binding Hardening: CERTIFIED**','roadmap'); else has(roadmap,'**A3 — Search↔Entry Binding Hardening: IN_PROGRESS**','roadmap');
  for(const marker of ['Search↔Entry Binding Hardening','sourceId','versionId','sourceHash','scope','rollback-only','Phase 12.5 remains LOCKED.'])has(a3Kickoff,marker,'12.4 A3 kickoff');
  req(state.a2FinalSourceGateVerification==='PASS'&&state.a2FinalSourceGateRunId===35380605634&&state.a2FinalSourceGateRunNumber===7&&state.a2FinalSourceGateHead==='0b0c61ce3399713b86dd768cdf5550304e2eede5','12.4 A2 final certification gate drifted');
  req(['IN_PROGRESS','CERTIFIED'].includes(state.a3Status)&&state.a3SearchRootBindingRequired===true&&state.a3ScopeWorkspaceShapeRequired===true&&state.a3UnconfiguredEntryAfterSearchAllowed===false,'12.4 A3 state contract drifted');
  req(state.a3DatabaseMigrationRequired===false&&state.a3PermanentFixtureSeedingAllowed===false&&state.a3PopulatedLiveHttpJourneyClaimed===false,'12.4 A3 must not invent DB authority or fake live truth');
  req(JSON.stringify(state.a3BindingFields)===JSON.stringify(['workspaceId','asOf','sourceId','versionId','sourceHash','scope']),'12.4 A3 binding allowlist drifted');
  for(const marker of [
    'parseRegulatorySearchEvidence','REGULATORY_SEARCH_WORKSPACE_MISMATCH','REGULATORY_SEARCH_ASOF_MISMATCH',
    'REGULATORY_SEARCH_SCOPE_WORKSPACE_MISMATCH','REGULATORY_SEARCH_VERSION_AMBIGUOUS','REGULATORY_SEARCH_DUPLICATE_SOURCE',
    'assertRegulatoryEntryMatchesSearchReference','REGULATORY_SEARCH_ENTRY_MISSING','REGULATORY_SOURCE_BINDING_CONFLICT'
  ])has(core,marker,'12.4 A3 core binding');
  for(const marker of ['parseRegulatorySearchEvidence(search.data,parsed)','assertRegulatoryEntryMatchesSearchReference(response.data,ref,parsed)'])has(edge,marker,'12.4 A3 Edge binding');
  if(state.a3Status==='CERTIFIED'){
    req(state.a3Certification==='PASS_SEARCH_ENTRY_BINDING_HARDENING'&&state.a3CertificationStatus==='CERTIFIED','12.4 A3 certification missing');
    req(state.a3SourceGateVerification==='PASS'&&state.a3SourceGateRunId===35381052846&&state.a3SourceGateRunNumber===3&&state.a3SourceGateHead==='d70fc17539885c2c45a35023a2b40769492f0edc','12.4 A3 source certificate drifted');
    req(state.a3BindingTests===8&&state.a3BindingTestFailures===0&&state.a3Phase94RuntimePreservation==='PASS'&&state.a3Phase94RollbackProbeContractPreservation==='PASS','12.4 A3 binding/preservation certificate drifted');
    req(state.a3EdgeDeployed===true&&state.a3EdgeVersion===3&&state.a3EdgeVerifyJwt===true&&state.a3EdgeDeploymentDigest==='6b6f3c5d00c8db41ad06c7a3e4ee7e1ee702c3f25c369fd1477fe9ed56bcc8d9','12.4 A3 live Edge certificate drifted');
    req(state.a3RealCloudVerification==='PASS'&&state.a3RealCloudRunId===35381162760&&state.a3RealCloudRunNumber===1&&state.a3RealCloudChecks===18&&state.a3RealCloudFailureCount===0,'12.4 A3 Real Cloud certificate drifted');
    req(state.a3RealCloudZeroRegulatoryMutation===true&&state.a3RealCloudZeroResidue===true,'12.4 A3 zero-mutation/residue certificate drifted');
    req(state.a3LiveM8SourceCount===0&&state.a3LiveM8VersionCount===0&&state.a3LiveM8DerivedArtifactCount===0&&state.a3PopulatedLiveHttpJourneyClaimed===false,'12.4 A3 empty-live-store truth claim drifted');
    req(state.a3RealCloudArtifactId===10562785271&&state.a3RealCloudArtifactDigest==='sha256:ba4d51d43e7c3024c36c631e8a1ec89562131a0bc0be1e42e8423287da59c888','12.4 A3 artifact evidence drifted');
    for(const marker of ['8/8 A3 adversarial binding tests','version: **3**','18/18 PASS','cleanup: **PASS**','populated-source HTTP journey is **not claimed**','Phase 12.5 remains **LOCKED**'])has(a3Evidence,marker,'12.4 A3 evidence');
  }
}

if(state.status==='CLOSED'){
  req(state.closureDecision==='PASS'&&state.exitGatePassed===true&&state.closureEvidence==='docs/PHASE12_4_CLOSURE.md'&&phase124Closure.length>0,'12.4 formal closure evidence missing');
  req(state.sourceGateVerification==='PASS_PR_A1_A2_A3'&&state.realCloudVerification==='PASS_A2_A3'&&state.realBrowserVerification==='PASS_EXACT_MAIN_CUMULATIVE','12.4 final source/cloud/browser certificate missing');
  req(state.pagesVerification==='PASS'&&state.liveExternalVerification==='PASS','12.4 deployed-live certificate missing');
  req(state.knownCriticalDefects===0&&state.knownHighDefects===0&&state.knownFunctionalBlockers===0,'12.4 defect ledger not clean');
  req(state.implementationPullRequest===203&&state.implementationHead==='940862eb22d9876038958942475f90b7179ab6f5'&&state.implementationMergeCommit==='974ff00abab45bfa6615b39cd4c31e0b20b7dfa0','12.4 implementation lineage invalid');
  req(state.pullRequestWorkflowCount===86&&state.pullRequestSuccessCount===85&&state.pullRequestSkippedCount===1&&state.pullRequestFailureCount===0,'12.4 PR inventory invalid');
  req(state.pullRequestA1GateRunId===35383132904&&state.pullRequestA2GateRunId===35383132829&&state.pullRequestA3GateRunId===35383133541,'12.4 PR source gate lineage invalid');
  req(state.pullRequestPhase94RegulatoryRunId===35383132884&&state.pullRequestRealBrowserRunId===35383132517,'12.4 PR regulatory/browser lineage invalid');
  req(state.postMergeMainSha==='974ff00abab45bfa6615b39cd4c31e0b20b7dfa0'&&state.postMergeTotalWorkflowCount===38&&state.postMergeTotalSuccessCount===38&&state.postMergeTotalFailureCount===0&&state.postMergeTotalQueuedCount===0&&state.postMergeTotalInProgressCount===0,'12.4 exact-main inventory invalid');
  req(state.postMergePhase94RegulatoryRunId===35383591750&&state.postMergeCumulativeRealBrowserRunId===35383591860&&state.postMergeZeroEscapeRunId===35383591949,'12.4 exact-main regulatory/browser/zero-escape lineage invalid');
  req(state.postMergePagesPreviewRunId===35383653660&&state.postMergeLiveExternalRunId===35383771057&&state.postMergePublishedPortalRunId===35383770968,'12.4 published-live lineage invalid');
  req(state.finalInitialJavascriptBytes===431246&&state.finalTotalJavascriptBytes===759985&&state.finalCssBytes===179989&&state.finalTotalJavascriptMarginBytes===15,'12.4 published budget certificate invalid');
  req(state.finalBudgetVerification==='PASS_FROZEN_CAPS_PUBLISHED_LIVE','12.4 final budget status invalid');
  req(state.m8GlobalStatus==='ACTIVE'&&state.m8GlobalClosureAllowed===false,'12.4 historical M8 law drifted'); if(!downstreamM8Closed) req(m8Registry?.status==='ACTIVE'&&m8Registry?.closureEvidence===null,'M8 cannot close before Phase 12.5');
  for(const marker of ['Status:** CLOSED / CERTIFIED','974ff00abab45bfa6615b39cd4c31e0b20b7dfa0','86/86 completed = 85 success + 1 expected skipped; 0 failures','workflows: **38**','Phase 12.5 — AI Zero-Escape & Safety Gate is now **AUTHORIZED_NEXT**'])has(phase124Closure,marker,'12.4 closure');
}

if(errors.length){console.error(`ENJAZ PHASE 12.4 A1 AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log(state.status==='CLOSED'?'ENJAZ PHASE 12.4 FORMAL CLOSURE AUDIT PASS — A1/A2/A3 certified, PR + exact-main + published-live evidence locked, M8 remains ACTIVE pending 12.5, and 12.5 is authorized next.':'ENJAZ PHASE 12.4 REGULATORY ASSISTANCE AUDIT PASS — A1+A2 preserved; current slice keeps Phase 9.4 M8 as the only truth authority, caller-JWT retrieval is certified, search↔entry binding is fail-closed where enabled, no shadow authority/provider/persistence/UI/DB delta exists, frozen budgets are preserved, and 12.5 remains locked.');
