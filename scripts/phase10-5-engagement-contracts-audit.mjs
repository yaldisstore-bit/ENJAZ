import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const json=(path)=>JSON.parse(read(path));
const state=json('docs/PHASE10_5_STATE.json');
const predecessor=json('docs/PHASE10_4_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE10_5_KICKOFF.md');
const contract=read('src/features/engagements/engagementContract.ts');
const tests=read('tests/engagementContract.test.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const failures=[];
const check=(name,condition)=>{if(!condition)failures.push(name)};
const has=(source,needle)=>source.includes(needle);

check('phase_identity',state.phase==='10.5'&&state.name==='Engagement/Contract Document Layer — M16'&&state.status==='IN_PROGRESS');
check('exact_base',state.baseCommit==='7ebdc755fff42c497796b7f3d59c966cc3855393');
check('predecessor_closed',state.predecessorPhase==='10.4'&&state.predecessorStatus==='CLOSED'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase10_5Allowed===true);
check('predecessor_certified',state.predecessorExactMainCertified===true&&state.predecessorPagesCertified===true&&state.predecessorLiveExternalCertified===true&&predecessor.exactMainCertified===true&&predecessor.pagesCertified===true&&predecessor.liveExternalCertified===true);
check('successor_locked',state.phase10_6Allowed===false&&state.nextPhase==='10.6'&&state.successorStatus==='LOCKED');
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);

const m16=registry.systems.find((entry)=>entry.id==='M16');
check('m16_registry',m16&&m16.status==='ACTIVE'&&Array.isArray(m16.anchors)&&m16.anchors.join(',')==='7,10,11'&&m16.closureEvidence===null);
check('m16_global_closure_forbidden',state.majorSystem==='M16'&&state.majorSystemStatus==='ACTIVE'&&state.globalM16ClosureAllowed===false&&state.phase7FinanceAnchorAlreadyCertified===true&&state.phase10DocumentAnchorInProgress===true&&state.phase11CommunicationRenewalAnchorOpen===true);

check('authority_boundary',state.commercialEngagementAuthority==='commercial_engagements'&&state.commercialTransactionLinkAuthority==='commercial_engagement_transactions'&&state.shadowEngagementStoreAllowed===false&&state.shadowMoneyStoreAllowed===false);
check('document_authority',Array.isArray(state.issuedDocumentAuthority)&&state.issuedDocumentAuthority.join(',')==='documents,document_versions'&&Array.isArray(state.documentFactoryAuthority)&&state.documentFactoryAuthority.join(',')==='document_templates,document_drafts,pdf_jobs');
check('lifecycle_guards',state.signedRevisionOverwriteAllowed===false&&state.browserDirectAuthoritativeMutationAllowed===false&&state.crossWorkspaceReferenceAllowed===false&&state.staleArtifactPromotionAllowed===false&&state.signedEffectiveArtifactRequired===true&&state.revisionLineageRequired===true&&state.effectiveDateValidationRequired===true&&state.signatureProvenanceRequired===true);
check('foundation_tracking',state.foundationStage==='AUTHORITY_CONTRACT_AND_DESTRUCTION_TESTS'&&state.authorityContractAdded===true&&state.authorityContractTestsAdded===true&&state.phaseGateAdded===true&&state.databaseAuthorityExtensionAdded===false);

for(const marker of [
  'ENGAGEMENT_CONTRACT_AUTHORITIES',
  "commercialEngagement: 'commercial_engagements'",
  "commercialTransactionLink: 'commercial_engagement_transactions'",
  "issuedDocuments: Object.freeze(['documents', 'document_versions']",
  "documentFactory: Object.freeze(['document_templates', 'document_drafts', 'pdf_jobs']",
  'EngagementContractStatus',
  'validateEngagementContractRevision',
  'assertEngagementContractRevisionChain',
  'assertEngagementContractTransition',
  'engagementContractIdentity',
  'ENGAGEMENT_CONTRACT_SIGNED_ARTIFACT_REQUIRED',
  'ENGAGEMENT_CONTRACT_CROSS_AUTHORITY_CHAIN'
]) check(`contract:${marker}`,has(contract,marker));

check('contract_no_source_mutation',!/(\.insert\(|\.update\(|\.delete\(|from\(['"](?:payments|payment_reversals|financial_ledger_entries|documents|document_versions)['"]\))/i.test(contract));

for(const marker of [
  'preserves existing commercial, finance, vault and factory authorities',
  'allows only governed lifecycle transitions',
  'requires immutable signed document authority for signed and effective states',
  'rejects impossible effective and expiry dates',
  'pre-signature states cannot smuggle signed timestamps or issued artifacts',
  'rejects cross-workspace chains'
]) check(`tests:${marker}`,has(tests,marker));

check('kickoff_scope',has(kickoff,'commercial_engagements')&&has(kickoff,'documents` + immutable `document_versions')&&has(kickoff,'M16 is **not globally CLOSED**'));
check('roadmap_scope',has(roadmap,'## 10.5 — Engagement/Contract Document Layer — M16')&&has(roadmap,'Contract/retainer documents, revisions, signatures/status/effective dates'));

if(failures.length){
  console.error(`ENJAZ PHASE 10.5 ENGAGEMENT CONTRACT AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('ENJAZ PHASE 10.5 ENGAGEMENT CONTRACT AUDIT PASS — governed M16 Phase-10 authority foundation is active, Phase 7 finance authority is reused, signed/effective revision invariants are fail-closed, and Phase 10.6 remains locked.');
