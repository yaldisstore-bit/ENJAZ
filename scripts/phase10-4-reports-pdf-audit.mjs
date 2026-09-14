import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const json=(path)=>JSON.parse(read(path));
const state=json('docs/PHASE10_4_STATE.json');
const predecessor=json('docs/PHASE10_3_STATE.json');
const contract=read('src/features/reports/reportPdfContract.ts');
const tests=read('tests/reportPdfContract.test.ts');
const financeUi=read('src/ui-r2/finance/Phase74FinancialReportsExperience.tsx');
const financeCss=read('src/ui-r2/finance/phase74.css');
const renderer=read('supabase/functions/enjaz-document-render/index.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const kickoff=read('docs/PHASE10_4_KICKOFF.md');
const failures=[];
const check=(name,condition)=>{if(!condition)failures.push(name)};
const has=(source,needle)=>source.includes(needle);

check('phase_identity',state.phase==='10.4'&&state.name==='Reports & PDF'&&state.status==='IN_PROGRESS');
check('exact_base',state.baseCommit==='94cbec8143aaf95664da091781e82936357ff9ae');
check('predecessor_closed',state.predecessorPhase==='10.3'&&state.predecessorStatus==='CLOSED'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase10_4Allowed===true);
check('predecessor_evidence',state.predecessorClosureEvidence==='docs/PHASE10_3_CLOSURE.md'&&fs.existsSync(state.predecessorClosureEvidence));
check('successor_locked',state.phase10_5Allowed===false&&state.nextPhase==='10.5'&&state.successorStatus==='LOCKED');
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);
check('authority_boundary',state.authoritativeReportSourcesRemainExternal===true&&state.reportPdfMayMutateSourceRecords===false&&state.sameSnapshotForScreenExportPrintRequired===true);
check('layout_safety',state.deterministicPagePlanningRequired===true&&state.blankPageAllowed===false&&state.overflowCorruptionAllowed===false&&state.footerOverlapAllowed===false&&state.signatureOverlapAllowed===false);
check('identity_rtl_mobile',state.qrBarcodeStableIdentityRequired===true&&state.rtlArabicRequired===true&&state.mobilePrintPreviewRequired===true);
check('foundation_tracking',state.foundationStage==='CONTRACT_AND_DESTRUCTION_TESTS'&&state.foundationContractAdded===true&&state.foundationTestsAdded===true&&state.phaseGateAdded===true);

for(const marker of [
  'A4_WIDTH_PT','A4_HEIGHT_PT','DEFAULT_REPORT_PDF_LAYOUT','reportPdfReservedZones','planReportPdfPages','assertReportPdfPlanSafe','buildReportPdfIdentity',
  'REPORT_PDF_BLANK_PAGE','REPORT_PDF_OVERFLOW','REPORT_PDF_OVERLAP','REPORT_PDF_BLOCK_TOO_TALL','REPORT_PDF_ROW_TOO_TALL','ENJAZ:REPORT:v'
]) check(`contract:${marker}`,has(contract,marker));
check('contract_no_source_mutation',!/(update|delete|insert)\s+(companies|transactions|documents|document_versions|payments|financial_ledger_entries)/i.test(contract));
check('blank_page_eliminated_by_construction',has(contract,'pages.filter((page) => page.fragments.length > 0)')&&has(contract,"page.fragments.length === 0"));
check('reserved_zone_geometry',has(contract,'signatureTop')&&has(contract,'identityTop')&&has(contract,'footerTop')&&has(contract,'bodyBottom'));
check('table_header_repetition',has(contract,'repeatsTableHeader: true')&&has(contract,'REPORT_PDF_ROW_TOO_TALL'));

for(const marker of [
  'never emits blank pages','cannot enter signature, identity or footer reserved zones','long tables split by rows','fail closed instead of clipping','stable QR/barcode identity'
]) check(`tests:${marker}`,has(tests,marker));

check('financial_same_snapshot_preserved',has(financeUi,'window.print()')&&has(financeUi,'financialReportToCsv(report)')&&has(financeUi,'serializeFinancialReport(report)')&&has(financeUi,'data-pdf-ready="true"'));
check('financial_print_path_known',has(financeCss,'@media print')&&has(financeCss,'.r2-f74-table-wrap { overflow: visible; }'));
check('renderer_identity_foundation_preserved',has(renderer,"import QRCode from 'npm:qrcode@1.5.4'")&&has(renderer,'ENJAZ:DRAFT:')&&has(renderer,'ENJAZ:PACK:'));
check('roadmap_scope',has(roadmap,'## 10.4 — Reports & PDF')&&has(roadmap,'deterministic pagination/footer/signature/QR/barcode handling'));
check('kickoff_scope',has(kickoff,'A page may never be emitted blank')&&has(kickoff,'Oversized content must either split')&&has(kickoff,'QR/barcode identity must be stable'));

if(failures.length){
  console.error(`ENJAZ PHASE 10.4 REPORTS & PDF AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 10.4 REPORTS & PDF AUDIT PASS — predecessor closed, successor locked, deterministic pagination/zone/identity contract present, legacy report and renderer foundations preserved, budgets frozen.');
