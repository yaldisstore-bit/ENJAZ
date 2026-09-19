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

check('phase_identity',s.phase==='13.5'&&s.name==='Import Destruction Gate'&&s.status==='IN_PROGRESS'&&['A1_DESTRUCTION_CONTRACT','A2_DISPOSABLE_POSTGRES_DESTRUCTION'].includes(s.currentSlice));
check('exact_base',s.baseCommit==='64b78767ebd3b0112e752f979d5448f78bdfd2cf');
check('predecessor_closed',predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase13_5Allowed===true&&predecessor.successorStatus==='AUTHORIZED_NEXT');
check('predecessor_evidence',s.predecessorClosureEvidence==='docs/PHASE13_4_CLOSURE.md'&&exists(s.predecessorClosureEvidence));
check('predecessor_exact_main',s.predecessorCanonicalClosureCommit==='64b78767ebd3b0112e752f979d5448f78bdfd2cf'&&s.predecessorExactMainWorkflowCount===42&&s.predecessorExactMainSuccessCount===42);
check('successor_locked',s.successorPhase==='14.1'&&s.successorStatus==='LOCKED'&&s.phase14_1Allowed===false&&s.exitGatePassed===false);
check('no_new_authority',s.newFeatureAuthorityAllowed===false&&s.newDatabaseTablesAllowed===false&&s.newWriteRpcAuthorityAllowed===false&&s.newEdgeFunctionAuthorityAllowed===false&&s.clientUiAdded===false);
check('destructive_isolation',s.productionDestructiveTestingAllowed===false&&s.isolatedDestructiveEnvironmentRequired===true&&s.zeroResidueRequired===true);
check('import_law',s.exactMappingReuseRequired===true&&s.generatedTargetIdsAllowed===false&&s.inferredLegacyMappingsAllowed===false&&s.unknownLegacyConceptAutoMappingAllowed===false&&s.unreviewedBulkImportAllowed===false);
check('target_scope',s.targetTables?.join(',')==='contacts,companies,transactions'&&s.stageOrder?.join(',')==='contacts,companies,transactions'&&s.maxItems===5000&&s.overLimitFailClosedAt===5001);
check('budget_freeze',s.javascriptBudgetBytes===670000&&s.totalJavascriptBudgetBytes===760000&&s.cssBudgetBytes===180000&&s.budgetIncreaseAllowed===false);
check('matrix_link',s.destructionMatrix==='docs/PHASE13_5_DESTRUCTION_MATRIX.json'&&exists(s.destructionMatrix));
check('a2_fixture',s.a2Fixture==='tests/fixtures/phase13-5-import-destruction-postgres.sql'&&exists(s.a2Fixture)&&s.a2ExpectedPassCount===14&&s.a2ZeroResidueRequired===true);
check('matrix_schema',matrix.schema==='enjaz.phase13-5.import-destruction.matrix.v1'&&matrix.cases?.length===24&&new Set(matrix.cases.map(x=>x.id)).size===24);
for(const d of ['counts','orphan_relations','money','workflow_state','ownership','documents','duplicate_idempotency'])
  check('dimension_'+d,matrix.requiredRoadmapDimensions?.includes(d));
for(const id of ['D01_UNMAPPED_TYPE_QUARANTINE','D05_DUPLICATE_RECORD_KEY','D07_UNSAFE_MONEY_PRECISION','D12_STAGE_ORDER_TAMPER','D17_CHANGED_REPLAY_CONFLICT','D18_NON_OWNER_OR_CROSS_WORKSPACE','D19_LATE_WRITE_FAILURE','D20_MISSING_OR_SOFT_DELETED_TARGET','D21_DURABLE_LEDGER_COUNT_CORRUPTION','D22_SCALE_BOUNDARY_5000_5001','D24_UNKNOWN_CONCEPT_SHADOW_WRITE'])
  check('case_'+id,matrix.cases.some(x=>x.id===id));
check('kickoff',kickoff.includes('A green source branch alone can never close this phase')&&kickoff.includes('Production may be inspected read-only but is forbidden as a destructive target'));
check('roadmap',roadmap.includes('## 13.5 — Import Destruction Gate — IN_PROGRESS / A1 DESTRUCTION CONTRACT'));
check('readme',readme.includes('Phase 13.5 — Import Destruction Gate 🟡 IN PROGRESS / A1 DESTRUCTION CONTRACT'));
check('no_phase135_prod_migration',!exists('database/migrations/phase_13_5_import_destruction.sql'));
check('no_phase135_edge_authority',!exists('supabase/functions/enjaz-import-destruction/index.ts'));

if(failures.length){console.error('ENJAZ PHASE 13.5 IMPORT DESTRUCTION AUDIT FAIL ('+failures.length+')\n- '+failures.join('\n- '));process.exit(1)}
console.log('ENJAZ PHASE 13.5 A1 AUDIT PASS — destructive matrix is explicit, production is not a destructive target, prior import authority is preserved, Phase 14.1 remains locked.');
