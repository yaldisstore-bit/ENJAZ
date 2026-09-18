import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8'),json=p=>JSON.parse(read(p)),exists=p=>fs.existsSync(new URL(p,root));
const s=json('docs/PHASE13_2_STATE.json'),source=read('src/features/import/legacyMappingContract.ts'),tests=read('tests/phase13-2-destruction.test.ts'),errors=[];
const req=(v,m)=>{if(!v)errors.push(m)},has=(x,m)=>req(x.includes(m),'missing marker: '+m);
req(s.phase==='13.2'&&s.status==='IN_PROGRESS'&&s.currentSlice==='A3_DESTRUCTION_AND_CLOSURE_READINESS','13.2 A3 lifecycle invalid');
req(s.a1Status==='CERTIFIED'&&s.a2Status==='CERTIFIED'&&s.a3Status==='IN_PROGRESS','13.2 predecessor slices not certified');
req(s.a2GateRunId===35399419189&&s.a2GateRunNumber===6&&s.a2GateHead==='f049451551ea5f4b4c7a8a626654011c91db7980','A2 gate lineage invalid');
req(s.a2TestCount===10&&s.a2PassCount===10&&s.a2A1RegressionPassCount===12&&s.a2FunctionalPassCount===219&&s.a2DbSelftestPassCount===25,'A2 counts invalid');
req(s.a2InitialJavascriptBytes===431032&&s.a2TotalJavascriptBytes===759568&&s.a2CssBytes===179989,'A2 frozen budget evidence invalid');
req(s.a3Mode==='DESTRUCTION_AND_CLOSURE_READINESS_ONLY'&&s.a3NewFeatureAuthorityAllowed===false,'A3 may not add feature authority');
req(s.precisionSafeNumberRequired===true&&s.deterministicReplayRequired===true&&s.mutationTrapVerificationRequired===true&&s.hiddenControlFieldRejectionRequired===true,'A3 destruction contract incomplete');
for(const k of ['persistenceAllowed','databaseWritesAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed','edgeFunctionAdded','clientUiAdded','orderedImportAllowed','importExecutionAllowed','targetEnjazMutationAllowed','targetAuthorityAssigned','relationshipForeignKeyAssignmentAllowed','generatedIdAuthorityAllowed','importPlanGenerationAllowed'])req(s[k]===false,k+' must remain false in A3');
req(s.successorStatus==='LOCKED'&&s.phase13_3Allowed===false&&s.exitGatePassed===false&&s.closureDecision==='PENDING','A3 must keep Phase 13.3 locked');
for(const m of ['LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE','Number.MAX_SAFE_INTEGER','foreignKeyAssignmentPerformed:false','idGenerationPerformed:false','eligibleForOrderedImport:false'])has(source,m);
for(const m of ['beyond safe exact two-decimal boundary','hidden plan/type/field/relation control fields','replay is deterministic','dangling relationship never synthesizes','never authorizes ordered import'])has(tests,m);
req(!exists('database/migrations/phase_13_2_normalize_map.sql'),'A3 must not add DB migration');
req(!exists('supabase/functions/enjaz-legacy-import/index.ts'),'A3 must not add import Edge Function');
if(errors.length){console.error('ENJAZ PHASE 13.2 A3 AUDIT FAIL ('+errors.length+')');errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log('ENJAZ PHASE 13.2 A3 AUDIT PASS — precision, replay, hidden-control, duplicate/dangling and mutation attacks are fail-closed; Phase 13.3 remains locked.');
