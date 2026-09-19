import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const s=json('docs/PHASE13_5_STATE.json');
const predecessor=json('docs/PHASE13_4_STATE.json');
const matrix=json('docs/PHASE13_5_DESTRUCTION_MATRIX.json');
const kickoff=read('docs/PHASE13_5_KICKOFF.md');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme=read('README.md');
const failures=[];
const check=(name,ok)=>{if(!ok)failures.push(name)};
const exists=p=>fs.existsSync(p);

check('phase_identity',
  s.phase==='13.5'&&s.name==='Import Destruction Gate'&&s.status==='IN_PROGRESS'&&
  s.currentSlice==='FORMAL_CLOSURE_CANDIDATE_AWAITING_POSTMERGE_RECERTIFICATION');
check('exact_base',s.baseCommit==='64b78767ebd3b0112e752f979d5448f78bdfd2cf');
check('predecessor_closed',
  predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&
  predecessor.phase13_5Allowed===true&&predecessor.successorStatus==='AUTHORIZED_NEXT');
check('predecessor_evidence',
  s.predecessorClosureEvidence==='docs/PHASE13_4_CLOSURE.md'&&exists(s.predecessorClosureEvidence));
check('predecessor_exact_main',
  s.predecessorCanonicalClosureCommit==='64b78767ebd3b0112e752f979d5448f78bdfd2cf'&&
  s.predecessorExactMainWorkflowCount===42&&s.predecessorExactMainSuccessCount===42);

check('successor_locked',
  s.successorPhase==='14.1'&&s.successorStatus==='LOCKED'&&
  s.phase14_1Allowed===false&&s.exitGatePassed===false&&
  s.closureDecision==='IMPLEMENTATION_AND_EXACT_MAIN_PASS_PENDING_CLOSURE_MAIN_RECERTIFICATION');

check('no_new_authority',
  s.newFeatureAuthorityAllowed===false&&s.newDatabaseTablesAllowed===false&&
  s.newWriteRpcAuthorityAllowed===false&&s.newEdgeFunctionAuthorityAllowed===false&&
  s.clientUiAdded===false);
check('destructive_isolation',
  s.productionDestructiveTestingAllowed===false&&
  s.isolatedDestructiveEnvironmentRequired===true&&s.zeroResidueRequired===true);
check('import_law',
  s.exactMappingReuseRequired===true&&s.generatedTargetIdsAllowed===false&&
  s.inferredLegacyMappingsAllowed===false&&s.unknownLegacyConceptAutoMappingAllowed===false&&
  s.unreviewedBulkImportAllowed===false);
check('target_scope',
  s.targetTables?.join(',')==='contacts,companies,transactions'&&
  s.stageOrder?.join(',')==='contacts,companies,transactions'&&
  s.maxItems===5000&&s.overLimitFailClosedAt===5001);
check('budget_freeze',
  s.javascriptBudgetBytes===670000&&s.totalJavascriptBudgetBytes===760000&&
  s.cssBudgetBytes===180000&&s.budgetIncreaseAllowed===false);

check('matrix_link',
  s.destructionMatrix==='docs/PHASE13_5_DESTRUCTION_MATRIX.json'&&exists(s.destructionMatrix));
check('matrix_schema',
  matrix.schema==='enjaz.phase13-5.import-destruction.matrix.v1'&&
  matrix.cases?.length===24&&new Set(matrix.cases.map(x=>x.id)).size===24);
for(const d of ['counts','orphan_relations','money','workflow_state','ownership','documents','duplicate_idempotency'])
  check('dimension_'+d,matrix.requiredRoadmapDimensions?.includes(d));
for(const id of [
  'D01_UNMAPPED_TYPE_QUARANTINE','D05_DUPLICATE_RECORD_KEY','D07_UNSAFE_MONEY_PRECISION',
  'D12_STAGE_ORDER_TAMPER','D17_CHANGED_REPLAY_CONFLICT','D18_NON_OWNER_OR_CROSS_WORKSPACE',
  'D19_LATE_WRITE_FAILURE','D20_MISSING_OR_SOFT_DELETED_TARGET',
  'D21_DURABLE_LEDGER_COUNT_CORRUPTION','D22_SCALE_BOUNDARY_5000_5001',
  'D24_UNKNOWN_CONCEPT_SHADOW_WRITE'
]) check('case_'+id,matrix.cases.some(x=>x.id===id));

check('a2_fixture',
  s.a2Fixture==='tests/fixtures/phase13-5-import-destruction-postgres.sql'&&exists(s.a2Fixture)&&
  s.a2ExpectedPassCount===14&&s.a2ObservedPassCount===14&&
  s.a2ZeroResidueRequired===true&&s.a2ZeroResidueVerified===true);
check('a3_real_cloud',
  s.a3Status==='REAL_CLOUD_DESTRUCTION_CERTIFIED'&&
  s.a3HostedDbMigration==='phase13_5_hosted_db_destruction_certificate_v2'&&
  s.a3HostedDbPassed===true&&s.a3HostedDbZeroResidue===true&&
  s.a3AuthCertificateSchema==='enjaz.phase13-5.auth-destruction-certificate.v1'&&
  s.a3AuthRunId===35448348574&&s.a3AuthJobId===105911092315&&
  s.a3AuthCheckCount===11&&s.a3AuthPassCount===11&&s.a3AuthFailCount===0&&
  s.a3AuthFunctionalPassed===true&&s.a3AuthCleanupPassed===true&&
  s.a3AuthFunctionFinalVersion===2&&s.a3AuthFunctionFinalVerifyJwt===true&&
  s.a3AuthFunctionFinalStatus==='410_GONE'&&s.a3AuthMarkedUserResidueCount===0&&
  s.a3HostedSecurityAdvisorFindings===0&&s.a3HostedPerformanceAdvisorFindings===0&&
  s.a3Evidence==='docs/PHASE13_5_REAL_CLOUD_EVIDENCE.md'&&exists(s.a3Evidence));

check('implementation_pr',
  s.implementationPullRequest===219&&
  s.implementationHead==='8fc9fd74ff89538455e2aab856d6d0d6d1959096'&&
  s.implementationMergeCommit==='bee38b1208e6de000a7e295609c0fbc7490fff89'&&
  s.pullRequestWorkflowCount===88&&s.pullRequestSuccessCount===87&&
  s.pullRequestSkippedCount===1&&s.pullRequestFailureCount===0&&
  s.pullRequestPhaseGateRunId===35448557057&&
  s.pullRequestQualityRunId===35448556998&&
  s.pullRequestRealBrowserRunId===35448556867&&
  s.pullRequestConstitutionRunId===35448556958&&
  s.pullRequestMajorSystemsRunId===35448557644);

check('implementation_main',
  s.postMergeImplementationRecertification==='PASS'&&
  s.postMergeImplementationMainSha==='bee38b1208e6de000a7e295609c0fbc7490fff89'&&
  s.postMergeImplementationMainWorkflowCount===42&&
  s.postMergeImplementationMainSuccessCount===42&&
  s.postMergeImplementationMainSkippedCount===0&&
  s.postMergeImplementationMainFailureCount===0&&
  s.postMergeImplementationMainQueuedCount===0&&
  s.postMergeImplementationMainInProgressCount===0);
check('implementation_main_runs',
  s.postMergeQualityRunId===35455171149&&
  s.postMergeRealBrowserRunId===35455171188&&
  s.postMergePagesBuildRunId===35455170316&&
  s.postMergePagesPreviewRunId===35455202099&&
  s.postMergeLiveExternalRunId===35455266187&&
  s.postMergePublishedPortalRunId===35455266240&&
  s.postMergeConstitutionRunId===35455171243&&
  s.postMergeMajorSystemsRunId===35455171233&&
  s.postMergePreservedPhase134RunId===35455171304);

check('implementation_certificate',
  s.implementationCertificate==='docs/PHASE13_5_IMPLEMENTATION_CERTIFICATE.md'&&
  exists(s.implementationCertificate));
check('production_zero_delta',
  s.productionPhase135MigrationCount===0&&
  s.productionPhase135NamedFunctionCount===0&&
  s.productionLatestMigrationVersion==='20260919125253');

check('quality_tracks',
  s.projectQualityConstitution?.tracks?.product==='PASS_IMPLEMENTATION_AND_EXACT_MAIN'&&
  s.projectQualityConstitution?.tracks?.uiUx==='PASS_NO_CLIENT_DELTA_CUMULATIVE_BROWSER'&&
  s.projectQualityConstitution?.tracks?.engineering==='PASS_A1_A2_A3_DESTRUCTION_ZERO_RESIDUE'&&
  s.projectQualityConstitution?.tracks?.certification==='PASS_IMPLEMENTATION_EXACT_HEAD_AND_MAIN_PENDING_CLOSURE_MAIN'&&
  s.projectQualityConstitution?.decision==='IN_PROGRESS_FORMAL_CLOSURE_CANDIDATE');

check('kickoff',
  kickoff.includes('A green source branch alone can never close this phase')&&
  kickoff.includes('Production may be inspected read-only but is forbidden as a destructive target')&&
  kickoff.includes('88/88')&&kickoff.includes('42/42'));
check('roadmap',
  roadmap.includes('## 13.5 — Import Destruction Gate — CLOSURE_CANDIDATE / IMPLEMENTATION + EXACT-MAIN CERTIFIED'));
check('readme',
  readme.includes('Phase 13.5 — Import Destruction Gate 🟠 CLOSURE CANDIDATE / IMPLEMENTATION + EXACT-MAIN CERTIFIED'));

check('no_phase135_prod_migration',!exists('database/migrations/phase_13_5_import_destruction.sql'));
check('no_phase135_edge_authority',!exists('supabase/functions/enjaz-import-destruction/index.ts'));

if(failures.length){
  console.error('ENJAZ PHASE 13.5 CLOSURE-CANDIDATE AUDIT FAIL ('+failures.length+')\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('ENJAZ PHASE 13.5 CLOSURE-CANDIDATE AUDIT PASS — A1/A2/A3 + exact PR-head + implementation exact-main certified; canonical post-merge 13.5 recertification still required; Phase 14.1 locked.');
