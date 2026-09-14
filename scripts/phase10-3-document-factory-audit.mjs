import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const readJson=(p)=>JSON.parse(read(p));
const state=readJson('docs/PHASE10_3_STATE.json');
const predecessor=readJson('docs/PHASE10_2_STATE.json');
const systems=readJson('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const authority=read('database/migrations/phase_10_3_document_factory_authority.sql');
const hardening=read('database/migrations/phase_10_3_document_factory_authority_hardening.sql');
const fkHardening=read('database/migrations/phase_10_3_document_factory_fk_index_hardening.sql');
const liveProbe=read('database/migrations/phase_10_3_live_authenticated_authority_probe.sql');
const runtime=read('database/migrations/phase_10_3_document_factory_runtime.sql');
const renderAuthority=read('database/migrations/phase_10_3_document_factory_render_authority.sql');
const contract=read('src/features/documents/documentFactoryContract.ts');
const tests=read('tests/documentFactory.test.ts');
const workflow=read('.github/workflows/phase10-3-document-factory.yml');
const kickoff=read('docs/PHASE10_3_KICKOFF.md');
const failures=[];
const check=(name,condition)=>{if(!condition)failures.push(name)};
const has=(source,needle)=>source.toLowerCase().includes(needle.toLowerCase());

check('phase_identity',state.phase==='10.3'&&state.name==='Document Factory & Official Form Engine — M7'&&state.status==='IN_PROGRESS');
check('exact_base',state.baseCommit==='667f2cc3892d8167e5880f030a1ff6dd6baf47b9');
check('predecessor_closed',state.predecessorPhase==='10.2'&&state.predecessorStatus==='CLOSED'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase10_3Allowed===true);
check('predecessor_deployed',state.predecessorExactMainVerified===true&&state.predecessorPagesVerified===true&&state.predecessorLiveExternalVerified===true);
check('authority_contract',state.templateVersionRequired===true&&state.factSnapshotRequired===true&&state.provenanceRequired===true&&state.approvalBeforeFinalizationRequired===true&&state.renderProofBeforeFinalizationRequired===true&&state.serviceOnlyRenderCompletionRequired===true);
check('source_authority',Array.isArray(state.sourceDocumentAuthority)&&state.sourceDocumentAuthority.join(',')==='documents,document_versions'&&state.generatedOutputMayMutateSourceRecords===false);
check('browser_sensitive_writes_closed',state.directBrowserFinalizationAllowed===false&&state.directBrowserIssuedArtifactMutationAllowed===false&&state.directBrowserRenderCompletionAllowed===false);
check('ocr_fail_closed',state.unverifiedOcrAllowedInOfficialGeneration===false&&state.verifiedOcrMustBeCurrent===true);
check('successor_locked',state.phase10_4Allowed===false&&state.nextPhase==='10.4'&&state.successorStatus==='LOCKED');
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);
check('foundation_tracking',state.databaseAuthorityMigrationAdded===true&&state.authorityHardeningMigrationAdded===true&&state.fkIndexHardeningMigrationAdded===true&&state.liveAuthenticatedAuthorityProbeAdded===true&&state.domainContractAdded===true&&state.stageFoundationTestsAdded===true&&state.phaseGateAdded===true);
check('live_authority_certified',state.databaseAuthorityExtensionAdded===true&&state.databaseAuthorityLiveVerified===true&&state.databaseAuthorityZeroResidue===true&&state.phaseOwnedUnindexedForeignKeys===0);
const migrationVersions=state.liveMigrationVersions||{};
check('live_migration_versions',migrationVersions.authority==='20260913234238'&&migrationVersions.authorityHardening==='20260913234248'&&migrationVersions.fkIndexHardening==='20260913234402'&&migrationVersions.authenticatedAuthorityProbe==='20260913234855');
const live=state.liveAuthorityVerification||{};
for(const key of ['ownerTemplateVersionCreate','idempotentReplay','requestPayloadDriftRejected','publishAndReplay','checksumVerified','crossWorkspaceReadDenied','crossWorkspaceCreateDenied','browserApprovalSmugglingDenied','publishedTemplateVersionImmutable','invalidDraftTransitionRejected','auditEvidenceVerified','sourceDocumentsUntouched'])check(`live:${key}`,live[key]===true);
for(const key of ['probeUsersRemaining','probeTemplatesRemaining','probeVersionsRemaining','probeDraftsRemaining','probeAuditEventsRemaining','probeHelpersRemaining'])check(`zero_residue:${key}`,live[key]===0);
check('live_status',live.status==='PASS_ZERO_RESIDUE');
check('runtime_source_added',state.runtimeMigrationAdded===true&&state.renderAuthorityMigrationAdded===true&&state.governedTemplateAuthoringAdded===true&&state.authoritativeFactResolutionAdded===true&&state.logicalGenerationRuntimeAdded===true&&state.domainCommandsAdded===true&&state.reviewApprovalFlowAdded===true&&state.vaultFinalizationBindingAdded===true&&state.serviceRenderProofAuthorityAdded===true&&state.arbitraryVaultOutputFinalizationRemoved===true&&state.runtimeContractTestsAdded===true);
check('runtime_direct_dml_closure_source',state.browserTemplateTableMutationClosureAdded===true&&state.browserDraftTableMutationClosureAdded===true&&state.browserPdfJobMutationClosureAdded===true);
check('runtime_live_not_fabricated',state.runtimeLiveApplied===false&&state.renderAuthorityLiveApplied===false&&state.runtimeRealCloudVerified===false&&state.runtimeZeroResidueVerified===false&&state.officialRenderedArtifactRuntimeAdded===false&&state.officialGenerationRuntimeAdded===false&&state.documentFactoryUiAdded===false&&state.premiumDocumentAnalysisCtaAdded===false&&state.realBrowserVerification==='PENDING_RUNTIME_UI'&&state.deployedLiveVerification==='PENDING_RUNTIME_UI'&&state.exitGatePassed===false);
check('real_cloud_state_split',state.realCloudVerification==='AUTHORITY_FOUNDATION_PASS_ZERO_RESIDUE_RUNTIME_PENDING');
const m7=systems.systems?.find((s)=>s.id==='M7');
check('m7_active',m7?.name==='Document Factory & Official Form Engine'&&m7?.status==='ACTIVE');
check('kickoff_authority',has(kickoff,'template version')&&has(kickoff,'immutable')&&has(kickoff,'documents` + immutable `document_versions')&&has(kickoff,'Phase 10.4 is **LOCKED**'));

for(const marker of [
  'create table public.document_template_versions','enable row level security','revoke all on table public.document_template_versions from public,anon,authenticated','grant select on table public.document_template_versions to authenticated','document_template_versions_immutable_v1','template_version_id uuid','fact_snapshot jsonb','provenance jsonb','content_checksum text','fact_snapshot_checksum text','final_document_id uuid','final_document_version_id uuid','document_drafts_final_immutable_v1','require_document_factory_owner_v1',"v_role<>'owner'",'extensions.digest','create_document_template_version_v1','publish_document_template_version_v1','insert into public.audit_events'
])check(`authority:${marker}`,has(authority,marker));
check('no_template_version_direct_mutation_grant',!/grant\s+(insert|update|delete)[\s\S]{0,160}document_template_versions[\s\S]{0,100}authenticated/i.test(authority));
check('foundation_no_source_document_mutation',!/(?:update|delete\s+from)\s+public\.documents\b/i.test(authority+hardening+fkHardening));
check('foundation_no_source_version_mutation',!/(?:update|delete\s+from)\s+public\.document_versions\b/i.test(authority+hardening+fkHardening));
check('security_definer_search_path',/create or replace function public\.create_document_template_version_v1[\s\S]*?security definer set search_path=''/i.test(authority)&&/create or replace function public\.publish_document_template_version_v1[\s\S]*?security definer set search_path=''/i.test(authority));
for(const marker of ['document_drafts_draft_authority_fields_check','approved_by is null','approved_at is null','finalized_by is null','finalized_at is null','final_document_id is null','final_document_version_id is null'])check(`hardening:${marker}`,has(hardening,marker));
for(const marker of ['document_drafts_final_document_version_fk_idx','workspace_id,final_document_id,final_document_version_id'])check(`fk_hardening:${marker}`,has(fkHardening,marker));
for(const marker of ['authenticated Real Cloud Document Factory authority probe','create_document_template_version_v1','publish_document_template_version_v1','ENJAZ_TEMPLATE_VERSION_REQUEST_DRIFT','ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN','browser smuggled approval insert was accepted','published template version was mutable','template-version audit evidence count is not exactly two','template-version operations mutated source document authority','probe residue remains after cleanup','immutable trigger was not restored'])check(`live_probe:${marker}`,has(liveProbe,marker));

for(const marker of [
  'validate_document_factory_template_v1','save_document_template_v1','drop policy if exists document_templates_insert_workspace','revoke insert,update,delete on table public.document_templates','drop policy if exists document_drafts_direct_insert_workspace','revoke insert,update,delete on table public.document_drafts','generate_document_draft_v1','assert_document_factory_provenance_current_v1','select * into v_company from public.companies','select * into v_tx from public.transactions','select * into v_contact from public.contacts','select * into v_analysis from public.document_analysis','ENJAZ_DOCUMENT_FACTORY_OCR_NOT_VERIFIED','ENJAZ_DOCUMENT_FACTORY_OCR_STALE','update_document_draft_content_v1','submit_document_draft_for_review_v1','review_document_draft_v1','ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT','get_document_factory_v1'
])check(`runtime:${marker}`,has(runtime,marker));
check('runtime_no_authoritative_source_mutation',!/(?:update|delete\s+from)\s+public\.(companies|transactions|contacts|document_analysis)\b/i.test(runtime+renderAuthority));

for(const marker of [
  'source_draft_id uuid','source_template_version_id uuid','source_content_checksum text','source_fact_snapshot_checksum text','output_document_version_id uuid','pdf_jobs_official_render_consistency_check','drop policy if exists pdf_jobs_insert_workspace','drop policy if exists pdf_jobs_update_workspace','revoke insert,update,delete on table public.pdf_jobs','require_document_render_service_v1','request_document_render_v1','mark_document_render_running_v1','complete_document_render_v1','fail_document_render_v1','grant execute on function public.complete_document_render_v1(uuid,text,uuid,uuid) to service_role','drop function if exists public.finalize_document_draft_v1(uuid,uuid,uuid,uuid)','p_render_job_id uuid','ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED','ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_DRIFT','document.factory.finalized'
])check(`render_authority:${marker}`,has(renderAuthority,marker));
check('render_completion_not_browser_executable',!/grant execute on function public\.complete_document_render_v1[^\n]+authenticated/i.test(renderAuthority));
check('render_does_not_mutate_vault_source_rows',!/(?:update|delete\s+from)\s+public\.(documents|document_versions)\b/i.test(renderAuthority));

for(const marker of ['validateFactoryTokenSchema','validateDocumentFactoryGenerationInput','validateDocumentFactoryDraftContent','validateDocumentFactoryReview','validateDocumentFactoryFinalization','renderJobId','validateOfficialGenerationProvenance',"normalized.kind==='ocr'",'isOfficialDraftFinalizable'])check(`contract:${marker}`,has(contract,marker));
for(const marker of ['rejects undeclared, malformed and unsupported authoritative tokens','governed runtime closes browser table writes and resolves facts server-side','render authority closes pdf_jobs browser mutation and requires service-only completion proof','finalization consumes exact succeeded render proof, not caller-selected Vault ids','official generation rejects unverified OCR','official generation rejects stale verified OCR'])check(`tests:${marker}`,has(tests,marker));
for(const marker of ['scripts/phase10-3-document-factory-audit.mjs','tests/documentFactory.test.ts','tests/documentFactoryFinalizationGuard.test.ts','tests/documentIntelligence.test.ts','tests/documentVault.test.ts','npm run test:functional','npm run db:audit','npm run audit:secrets','npm run typecheck','npm run build','Re-enforce Phase 10.3 certified state'])check(`workflow:${marker}`,has(workflow,marker));

if(failures.length){
  console.error(`ENJAZ PHASE 10.3 AUTHORITY AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 10.3 AUTHORITY AUDIT PASS — live authority foundation is certified; governed generation/review/render-proof runtime is present in source but deliberately not claimed live or complete. Phase 10.4 remains locked.');
