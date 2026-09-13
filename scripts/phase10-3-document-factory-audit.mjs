import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const readJson=(p)=>JSON.parse(read(p));
const state=readJson('docs/PHASE10_3_STATE.json');
const predecessor=readJson('docs/PHASE10_2_STATE.json');
const systems=readJson('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const authority=read('database/migrations/phase_10_3_document_factory_authority.sql');
const hardening=read('database/migrations/phase_10_3_document_factory_authority_hardening.sql');
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
check('authority_contract',state.templateVersionRequired===true&&state.factSnapshotRequired===true&&state.provenanceRequired===true&&state.approvalBeforeFinalizationRequired===true);
check('source_authority',Array.isArray(state.sourceDocumentAuthority)&&state.sourceDocumentAuthority.join(',')==='documents,document_versions'&&state.generatedOutputMayMutateSourceRecords===false);
check('browser_finalization_closed',state.directBrowserFinalizationAllowed===false&&state.directBrowserIssuedArtifactMutationAllowed===false);
check('ocr_fail_closed',state.unverifiedOcrAllowedInOfficialGeneration===false&&state.verifiedOcrMustBeCurrent===true);
check('successor_locked',state.phase10_4Allowed===false&&state.nextPhase==='10.4'&&state.successorStatus==='LOCKED');
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);
check('foundation_tracking',state.databaseAuthorityMigrationAdded===true&&state.domainContractAdded===true&&state.stageFoundationTestsAdded===true&&state.phaseGateAdded===true&&state.databaseAuthorityExtensionAdded===false);
const m7=systems.systems?.find((s)=>s.id==='M7');
check('m7_active',m7?.name==='Document Factory & Official Form Engine'&&m7?.status==='ACTIVE');
check('kickoff_authority',has(kickoff,'template version')&&has(kickoff,'immutable')&&has(kickoff,'documents` + immutable `document_versions')&&has(kickoff,'Phase 10.4 is **LOCKED**'));

for(const marker of [
  'create table public.document_template_versions',
  'enable row level security',
  'revoke all on table public.document_template_versions from public,anon,authenticated',
  'grant select on table public.document_template_versions to authenticated',
  'document_template_versions_immutable_v1',
  'template_version_id uuid',
  'fact_snapshot jsonb',
  'provenance jsonb',
  'content_checksum text',
  'fact_snapshot_checksum text',
  'final_document_id uuid',
  'final_document_version_id uuid',
  'document_drafts_final_immutable_v1',
  'require_document_factory_owner_v1',
  "v_role<>'owner'",
  'extensions.digest',
  'create_document_template_version_v1',
  'publish_document_template_version_v1',
  'insert into public.audit_events',
  'grant execute on function public.create_document_template_version_v1',
  'grant execute on function public.publish_document_template_version_v1'
])check(`authority:${marker}`,has(authority,marker));

check('no_template_version_direct_mutation_grant',!/grant\s+(insert|update|delete)[\s\S]{0,160}document_template_versions[\s\S]{0,100}authenticated/i.test(authority));
check('no_source_document_mutation',!/(?:update|delete\s+from)\s+public\.documents\b/i.test(authority+hardening));
check('no_source_version_mutation',!/(?:update|delete\s+from)\s+public\.document_versions\b/i.test(authority+hardening));
check('security_definer_search_path',/create or replace function public\.create_document_template_version_v1[\s\S]*?security definer set search_path=''/i.test(authority)&&/create or replace function public\.publish_document_template_version_v1[\s\S]*?security definer set search_path=''/i.test(authority));

for(const marker of [
  'document_drafts_draft_authority_fields_check',
  'approved_by is null',
  'approved_at is null',
  'finalized_by is null',
  'finalized_at is null',
  'final_document_id is null',
  'final_document_version_id is null',
  'for insert to authenticated',
  'for update to authenticated'
])check(`hardening:${marker}`,has(hardening,marker));

for(const marker of [
  'validateTemplateVersionInput',
  'assertTemplateVersionTransition',
  'validateOfficialGenerationProvenance',
  "normalized.kind==='ocr'",
  "normalized.verificationState!=='verified'",
  'normalized.stale',
  'isOfficialDraftFinalizable'
])check(`contract:${marker}`,has(contract,marker));

for(const marker of [
  'official generation rejects unverified OCR',
  'official generation rejects stale verified OCR',
  'final artifacts require template version, approval and exact output document version',
  'direct browser drafts cannot smuggle approval or finalization authority fields'
])check(`tests:${marker}`,has(tests,marker));

for(const marker of [
  'scripts/phase10-3-document-factory-audit.mjs',
  'tests/documentFactory.test.ts',
  'tests/documentIntelligence.test.ts',
  'tests/documentVault.test.ts',
  'npm run test:functional',
  'npm run db:audit',
  'npm run audit:secrets',
  'npm run typecheck',
  'npm run build',
  'PHASE10_3_STATE.json'
])check(`workflow:${marker}`,has(workflow,marker));

if(failures.length){
  console.error(`ENJAZ PHASE 10.3 AUTHORITY AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 10.3 AUTHORITY AUDIT PASS — M7 foundation is fail-closed: immutable template versions, clean draft authority, verified-current OCR contract, source-document non-mutation and Phase 10.4 lock are enforced.');
