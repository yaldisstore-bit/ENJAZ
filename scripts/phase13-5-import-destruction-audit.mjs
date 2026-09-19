import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(new URL(p,root));
const s=json('docs/PHASE13_5_STATE.json');
const prev=json('docs/PHASE13_4_STATE.json');
const tests=read('tests/phase13-5-import-destruction.test.ts');
const matrix=json('docs/PHASE13_5_DESTRUCTION_MATRIX.json');
const kickoff=read('docs/PHASE13_5_KICKOFF.md');
const mapping=read('src/features/import/legacyMappingContract.ts');
const ordered=read('src/features/import/legacyOrderedImportContract.ts');
const binding=read('src/features/import/legacyOrderedImportBinding.ts');
const execution=read('src/features/import/legacyOrderedImportExecution.ts');
const readme=read('README.md');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(v,m,l)=>req(v.includes(m),l+' missing marker: '+m);

req(prev.status==='CLOSED'&&prev.closureDecision==='PASS'&&prev.phase13_5Allowed===true&&
  prev.successorStatus==='AUTHORIZED_NEXT'&&prev.a2ProductionFunctionInstalled===true&&
  prev.a3ProductionFunctionInstalled===true&&prev.productionFunctionAuthority==='SECURITY_INVOKER_STABLE_AUTHENTICATED_ONLY',
  'Phase 13.4 corrected production predecessor is not certified/authorized');

req(s.phase==='13.5'&&s.name==='Import Destruction Gate'&&s.status==='IN_PROGRESS'&&
  s.mode==='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY'&&s.currentSlice==='A1_STATIC_CROSS_BOUNDARY_DESTRUCTION',
  '13.5 A1 lifecycle invalid');
req(s.baseCommit==='64b78767ebd3b0112e752f979d5448f78bdfd2cf'&&s.predecessor?.productionRecordCorrectionMerge===s.baseCommit,
  '13.5 exact corrected base drifted');
req(s.successorPhase==='14.1'&&s.successorStatus==='LOCKED'&&s.phase14_1Allowed===false&&
  s.exitGatePassed===false&&s.closureDecision==='PENDING','Phase 14.1 must remain locked');
for(const k of ['newFeatureAuthorityAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed',
  'newEdgeFunctionAuthorityAllowed','newClientUiAllowed','automaticRepairAllowed','inferredLegacyMappingAllowed',
  'generatedTargetIdsAllowed','unreviewedBulkImportAllowed','budgetIncreaseAllowed'])req(s[k]===false,k+' must remain false');
req(JSON.stringify(s.productionBaseline?.allowedTargetTables)===JSON.stringify(['contacts','companies','transactions'])&&
  s.productionBaseline?.reconciliationAuthority==='SECURITY_INVOKER_STABLE_AUTHENTICATED_ONLY'&&
  s.productionBaseline?.historicalImportReconciliationClaimed===false,'production baseline authority drifted');
req(s.javascriptBudgetBytes===670000&&s.totalJavascriptBudgetBytes===760000&&s.cssBudgetBytes===180000,
  'frozen client budgets drifted');
req(s.productionDestructiveTestingAllowed===false&&s.isolatedDestructiveEnvironmentRequired===true&&s.zeroResidueRequired===true,
  'destructive certification must remain isolated and zero-residue');
req(s.destructionMatrix==='docs/PHASE13_5_DESTRUCTION_MATRIX.json'&&s.destructionCaseCount===24,
  '13.5 destruction matrix binding drifted');
req(matrix.schema==='enjaz.phase13-5.import-destruction.matrix.v1'&&matrix.cases?.length===24&&
  new Set(matrix.cases.map(x=>x.id)).size===24,'destruction matrix completeness drifted');
for(const d of ['counts','orphan_relations','money','workflow_state','ownership','documents','duplicate_idempotency'])
  req(matrix.requiredRoadmapDimensions?.includes(d),'destruction matrix missing roadmap dimension '+d);

for(const marker of [
 'expanded-model target escape','unknown legacy concepts','5001-record/item overflow','orphan/dangling relations',
 'duplicate source keys','duplicate caller-supplied target IDs','unsafe money precision','workflow/procedure state',
 'ownership/governance','hidden control fields','idempotency-key corruption','Phase 14.1 — Cross-domain Journeys — **LOCKED**'
])has(kickoff,marker,'kickoff');

for(const marker of [
 'expanded-model target escape is forbidden','workflow ownership and document authority fields',
 'unknown legacy concepts remain quarantined','orphan relationships fail closed','duplicate source keys fail closed',
 'duplicate caller target IDs fail closed','money precision and ambiguous numeric syntax','5001 snapshot records and 5001 execution items',
 'hidden control fields fail closed','write repair permission and reconciliation preclaims','expanded target table cannot be injected',
 'relationship endpoint order and authority drift','idempotency binding is explicit','replay is deterministic'
])has(tests,marker,'A1 destruction tests');

for(const marker of ["'companies','contacts','transactions'","LEGACY_MAPPING_TARGET_TABLE_FORBIDDEN",
 "LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN"])has(mapping,marker,'mapping contract');
for(const marker of ['LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES','LEGACY_ORDERED_IMPORT_DUPLICATE_KEYS',
 'LEGACY_ORDERED_IMPORT_DANGLING_LINKS','LEGACY_ORDERED_IMPORT_UNMAPPED_RELATIONSHIPS'])has(ordered,marker,'ordered import plan');
for(const marker of ['LEGACY_IMPORT_TARGET_ID_DUPLICATE','targetIdsGenerated:false','foreignKeyAssignmentPerformed:false'])has(binding,marker,'binding contract');
for(const marker of ['LEGACY_IMPORT_EXECUTION_TARGET_TABLE_INVALID','LEGACY_IMPORT_EXECUTION_CLIENT_AUTHORITY_FORBIDDEN',
 'LEGACY_IMPORT_EXECUTION_TARGET_MUTATION_PRECLAIM_FORBIDDEN',"functionName:'execute_legacy_ordered_import_v1'"])has(execution,marker,'execution contract');

has(readme,'Phase 13.5 — Import Destruction Gate 🟡 IN PROGRESS / A1 STATIC DESTRUCTION','README');
has(roadmap,'## 13.5 — Import Destruction Gate — IN_PROGRESS / A1 STATIC DESTRUCTION','roadmap');
req(!exists('database/migrations/phase_13_5_import_destruction.sql'),'A1 must not add a database migration');
req(!exists('supabase/functions/enjaz-legacy-import-destruction/index.ts'),'A1 must not add an Edge write authority');

if(errors.length){console.error('ENJAZ PHASE 13.5 A1 AUDIT FAIL ('+errors.length+')');for(const e of errors)console.error('- '+e);process.exit(1)}
console.log('ENJAZ PHASE 13.5 A1 AUDIT PASS — cross-boundary import escape attacks fail closed; no new authority; Phase 14.1 locked.');
