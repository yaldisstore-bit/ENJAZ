import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8'),readJson=(p)=>JSON.parse(read(p));
const state=readJson('docs/PHASE10_2_STATE.json'),predecessor=readJson('docs/PHASE10_1_STATE.json');
const migration=read('database/migrations/phase_10_2_document_intelligence.sql');
const contract=read('src/features/documents/documentIntelligenceContract.ts');
const commands=read('src/features/documents/documentIntelligenceCommands.ts');
const edge=read('supabase/functions/enjaz-document-intelligence/index.ts');
const tests=read('tests/documentIntelligence.test.ts');
const workflow=read('.github/workflows/phase10-2-document-intelligence.yml');
const failures=[];const check=(name,condition)=>{if(!condition)failures.push(name)},has=(s,x)=>s.includes(x);

check('phase_identity',state.phase==='10.2'&&state.name==='Document Intelligence / OCR'&&state.status==='IN_PROGRESS');
check('exact_base',state.baseCommit==='939783b2fc084c06fd9a214654355c42c30473f4');
check('predecessor_closed',state.predecessorPhase==='10.1'&&state.predecessorStatus==='CLOSED'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase10_2Allowed===true);
check('source_authority',state.sourceAuthority==='SOURCE_FILE_REMAINS_AUTHORITATIVE'&&state.extractedContentMayReplaceSource===false&&state.sourceOverwriteAllowed===false);
check('no_silent_promotion',state.silentAuthorityPromotionAllowed===false&&/UNVERIFIED/.test(state.ocrOutputAuthority));
check('governed_flow',Array.isArray(state.extractionFlow)&&state.extractionFlow.join('>')==='EXTRACT>REVIEW>VERIFY');
check('traceability',state.provenanceRequired===true&&state.immutableVersionBindingRequired===true&&state.pageReferenceRequired===true&&state.confidenceRequired===true&&state.verificationStateRequired===true);
check('explicit_failure',state.failureMustBeExplicit===true&&state.staleSourceVerificationAllowed===false);
check('browser_mutation_forbidden',state.directBrowserAnalysisMutationAllowed===false);
check('provider_secret_hidden',state.providerSecretBrowserVisible===false);
check('foundation_progress',state.persistenceContractAdded===true&&state.clientContractAdded===true&&state.contractDestructionTestsAdded===true&&state.serverOrchestrationBrokerAdded===true&&state.clientGatewayAdded===true);
check('provider_not_falsely_certified',state.serverExtractionProviderConnected===false&&state.realCloudVerification==='PENDING'&&state.realBrowserVerification==='PENDING');
check('vault_boundary',state.storageBoundary==='PRIVATE_SIGNED_BROKER_ONLY'&&state.sourceAuthorityTables?.join(',')==='documents,document_versions');
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);
check('successor_locked',state.exitGatePassed===false&&state.phase10_3Allowed===false&&state.nextPhase==='10.3'&&state.successorStatus==='LOCKED');
check('kickoff_present',fs.existsSync('docs/PHASE10_2_KICKOFF.md'));

for(const marker of [
  'document_version_id uuid','source_version_number integer','verification_state text','page_results jsonb','provenance jsonb',
  'foreign key(workspace_id,document_version_id) references public.document_versions(workspace_id,id)',
  "verification_state in ('queued','extracting','review_required','reviewed','verified','rejected','failed','superseded','legacy_unverified')",
  'drop policy if exists document_analysis_insert_workspace','drop policy if exists document_analysis_update_workspace',
  'revoke insert,update,delete on table public.document_analysis from public,anon,authenticated',
  'request_document_extraction_v1','get_document_extraction_claim_v1','mark_document_extraction_started_v1','complete_document_extraction_v1','fail_document_extraction_v1','review_document_extraction_v1','verify_document_extraction_v1','get_document_intelligence_v1',
  "failure_code='SOURCE_VERSION_STALE'","verification_state='superseded'",'SOURCE_FILE_REMAINS_AUTHORITATIVE','promotedToSource',
  'grant execute on function public.complete_document_extraction_v1','to service_role'
])check(`migration:${marker}`,has(migration,marker));
check('no_source_document_update',!/(update|delete\s+from)\s+public\.documents\b/i.test(migration));
check('no_source_version_update',!/(update|delete\s+from)\s+public\.document_versions\b/i.test(migration));
check('no_authenticated_completion',!/grant execute on function public\.complete_document_extraction_v1[\s\S]{0,220}to authenticated/i.test(migration));
check('no_authenticated_failure_mutation',!/grant execute on function public\.fail_document_extraction_v1[\s\S]{0,180}to authenticated/i.test(migration));
check('service_claim_private',has(migration,'revoke all on function public.get_document_extraction_claim_v1(uuid) from public,anon,authenticated'));

for(const marker of ['DocumentIntelligenceState','documentVersionId','sourceVersionNumber','pageNumber','confidence','assertDocumentIntelligenceTransition','isAuthoritativeIntelligence',"a.state==='verified'&&!a.stale"])check(`contract:${marker}`,has(contract,marker));
for(const marker of ['get_document_intelligence_v1','review_document_extraction_v1','verify_document_extraction_v1','functions/v1/enjaz-document-intelligence','Authorization:`Bearer ${token}`','crypto.randomUUID()'])check(`commands:${marker}`,has(commands,marker));
check('commands_no_server_secret',!/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|ENJAZ_OCR_PROVIDER_KEY/.test(commands));

for(const marker of ['ENJAZ_OCR_PROVIDER_URL','ENJAZ_OCR_PROVIDER_KEY','OCR_PROVIDER_NOT_CONFIGURED','get_document_extraction_claim_v1','mark_document_extraction_started_v1','complete_document_extraction_v1','fail_document_extraction_v1','enjaz-documents-private','SOURCE_FILE_REMAINS_AUTHORITATIVE','X-Enjaz-OCR-Contract','enjaz.ocr-provider.v1'])check(`edge:${marker}`,has(edge,marker));
check('edge_secret_not_literal',!/(sb_secret_[A-Za-z0-9_-]+|service_role\s*[:=]\s*["'][^"']+|ENJAZ_OCR_PROVIDER_KEY\s*[:=]\s*["'][^"']+)/.test(edge));
check('edge_provider_key_server_only',has(edge,"Deno.env.get('ENJAZ_OCR_PROVIDER_KEY')")&&!/body\.providerKey|body\.apiKey/.test(edge));
check('edge_user_auth_before_service',edge.indexOf('auth.getUser()')>=0&&edge.indexOf('auth.getUser()')<edge.indexOf("get_document_extraction_claim_v1"));
check('edge_private_source_only',has(edge,"c.bucket!=='enjaz-documents-private'")&&has(edge,"sourceAuthority!=='SOURCE_FILE_REMAINS_AUTHORITATIVE'"));

for(const marker of ['rejects non-legacy extraction without immutable version provenance','rejects review-ready OCR with no page evidence','rejects page confidence outside 0..1','rejects extracted field lacking page provenance','verified-but-stale extraction is never authoritative','legacy OCR stays explicitly non-authoritative'])check(`destruction:${marker}`,has(tests,marker));
check('workflow_runs_contract_tests',has(workflow,'tests/documentIntelligence.test.ts'));
check('workflow_preserves_vault_tests',has(workflow,'tests/documentVault.test.ts'));
check('workflow_full_regression',has(workflow,'npm run test:functional'));

if(failures.length){console.error(`ENJAZ PHASE 10.2 AUTHORITY AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);process.exit(1)}
console.log('ENJAZ PHASE 10.2 AUTHORITY AUDIT PASS — immutable source/version authority preserved; OCR broker keeps provider secrets server-side; EXTRACT→REVIEW→VERIFY and stale rejection enforced.');
