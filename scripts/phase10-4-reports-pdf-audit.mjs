import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const json=(path)=>JSON.parse(read(path));
const state=json('docs/PHASE10_4_STATE.json');
const predecessor=json('docs/PHASE10_3_STATE.json');
const contract=read('src/features/reports/reportPdfContract.ts');
const tests=read('tests/reportPdfContract.test.ts');
const financeAdapter=read('src/features/reports/financialReportPdf.ts');
const financeAdapterTests=read('tests/financialReportPdf.test.ts');
const financeUi=read('src/ui-r2/finance/Phase74FinancialReportsExperience.tsx');
const financeCss=read('src/ui-r2/finance/phase74.css');
const renderer=read('supabase/functions/enjaz-document-render/index.ts');
const reportRenderer=read('supabase/functions/enjaz-financial-report-render/index.ts');
const reportGateway=read('src/features/reports/financialReportRenderCommands.ts');
const browserWorkflow=read('.github/workflows/phase10-4-reports-browser.yml');
const browserSpec=read('tests-external/phase10-4-reports-pdf-browser.spec.cjs');
const browserHarness=read('src/ui-r2/finance/phase104-reports-preview-main.tsx');
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
check('foundation_tracking',['CONTRACT_AND_DESTRUCTION_TESTS','FINANCIAL_REPORT_INTEGRATION','BROWSER_CERTIFIED_CLOUD_PENDING'].includes(state.foundationStage)&&state.foundationContractAdded===true&&state.foundationTestsAdded===true&&state.phaseGateAdded===true);
check('financial_integration_tracking',state.financialReportAdapterAdded===true&&state.financialReportPreflightAdded===true&&state.financialReportAdapterTestsAdded===true&&state.financePreviewWorkspaceIdentityBound===true);
check('server_renderer_tracking',state.financialServerRendererAdded===true&&state.financialServerRendererDeployed===true&&state.financialServerRendererVerifyJwt===true&&state.financialServerRendererVersion===1&&state.clientServerParityRequired===true&&state.clientServerParityCertified===true);
check('print_stage_truth',state.browserPrintBaselinePreserved===true&&state.financialPrintHardeningAdded===true&&state.finalRendererHardeningPending===true);
check('browser_certificate_truth',state.realBrowserCertificateAdded===true&&state.realBrowserCertificatePassed===true&&state.realBrowserCertificateTests===8&&state.realBrowserCertificateSha==='aa57241310e3321654676c557c3550bb30f52ac6'&&state.mobilePrintPreviewCertified===true&&state.minimumCertifiedViewportPx===320);
check('closure_still_blocked_truth',state.realCloudPdfOutputCertified===false&&state.exactMainCertified===false&&state.pagesCertified===false&&state.liveExternalCertified===false&&state.exitGatePassed===false&&state.phase10_5Allowed===false);

for(const marker of [
  'A4_WIDTH_PT','A4_HEIGHT_PT','DEFAULT_REPORT_PDF_LAYOUT','reportPdfReservedZones','planReportPdfPages','assertReportPdfPlanSafe','buildReportPdfIdentity',
  'REPORT_PDF_BLANK_PAGE','REPORT_PDF_OVERFLOW','REPORT_PDF_OVERLAP','REPORT_PDF_BLOCK_TOO_TALL','REPORT_PDF_ROW_TOO_TALL','ENJAZ:REPORT:v'
]) check(`contract:${marker}`,has(contract,marker));
check('contract_no_source_mutation',!/(update|delete|insert)\s+(companies|transactions|documents|document_versions|payments|financial_ledger_entries)/i.test(contract));
check('blank_page_eliminated_by_construction',has(contract,'pages.filter((page) => page.fragments.length > 0)')&&has(contract,"page.fragments.length === 0"));
check('reserved_zone_geometry',has(contract,'signatureTop')&&has(contract,'identityTop')&&has(contract,'footerTop')&&has(contract,'bodyBottom'));
check('table_header_repetition',has(contract,'repeatsTableHeader: true')&&has(contract,'REPORT_PDF_ROW_TOO_TALL'));
for(const marker of ['never emits blank pages','cannot enter signature, identity or footer reserved zones','long tables split by rows','fail closed instead of clipping','stable QR/barcode identity']) check(`tests:${marker}`,has(tests,marker));

for(const marker of ['buildFinancialReportPdfPlan','financialReportPdfBlocks','planReportPdfPages','buildReportPdfIdentity','enjaz.financial-report-pdf-plan.v1']) check(`finance_adapter:${marker}`,has(financeAdapter,marker));
check('finance_adapter_no_shadow_facts',!/(payments|financial_ledger_entries|document_versions).*\.(insert|update|delete)/i.test(financeAdapter));
for(const marker of ['safe deterministic pages and stable identity','represented exactly once','different report fingerprints produce different QR/barcode identities']) check(`finance_adapter_tests:${marker}`,has(financeAdapterTests,marker));
check('financial_same_snapshot_preserved',has(financeUi,'window.print()')&&has(financeUi,'financialReportToCsv(report)')&&has(financeUi,'serializeFinancialReport(report)')&&has(financeUi,'data-pdf-ready="true"'));
check('financial_preflight_enforced',has(financeUi,'buildFinancialReportPdfPlan(workspaceId, report)')&&has(financeUi,'disabled={!pdfPreflight.plan')&&has(financeUi,'data-phase10-4-pdf-preflight="safe"')&&has(financeUi,'data-phase10-4-report-pdf="governed"'));
check('financial_real_workspace_identity',has(financeUi,'workspaceId={loaded.workspaceId}')&&has(financeUi,'loadFinanceSource(factory, user)'));
check('server_pdf_wired',has(financeUi,'renderGateway.renderPdf')&&has(financeUi,'expectedFingerprint: report.fingerprint')&&has(financeUi,'data-phase10-4-server-pdf="certified"'));
check('server_pdf_fail_closed',has(reportRenderer,'REPORT_FINGERPRINT_STALE')&&has(reportRenderer,'WORKSPACE_FORBIDDEN')&&has(reportRenderer,'workspace_memberships')&&has(reportRenderer,'buildServerFinancialReport'));
check('server_pdf_rtl_identity',has(reportRenderer,"arabic-bidi-shaper")&&has(reportRenderer,"bwip-js")&&has(reportRenderer,"QRCode")&&has(reportRenderer,'منطقة التوقيع والختم')&&has(reportRenderer,'X-ENJAZ-Report-Pages'));
check('server_pdf_no_privileged_key',!/(SERVICE_ROLE|SECRET_KEY|sb_secret_)/.test(reportRenderer));
check('gateway_uses_authenticated_edge_transport',has(reportGateway,"client.edge('enjaz-financial-report-render'")&&has(reportGateway,'REPORT_FINGERPRINT_STALE'));
check('browser_print_baseline_preserved',has(financeCss,'@media print')&&has(financeCss,'.r2-f74-table-wrap { overflow: visible; }')&&has(financeCss,'.r2-f74-card table { min-width: 0; }')&&has(financeCss,'[data-no-print="true"] { display: none !important; }'));
check('browser_certificate_workflow',has(browserWorkflow,'Real Chromium / Mobile / Print Media / Governed PDF Journey')&&has(browserWorkflow,'vite.phase10-4-reports-preview.config.ts')&&has(browserWorkflow,'phase10-4-reports-pdf-browser.spec.cjs')&&has(browserWorkflow,'playwright@1.55.0'));
for(const marker of ['1280, 900','430, 920','390, 844','360, 800','320, 760','mobile print media hides controls','scope changes invalidate prior server certificate','data-phase10-4-server-pdf']) check(`browser_spec:${marker}`,has(browserSpec,marker));
check('browser_harness_isolated_and_governed',has(browserHarness,'data-phase10-4-browser-certificate="enabled"')&&has(browserHarness,'FinancialReportPdfRenderInput')&&has(browserHarness,'FinancialReportRenderGateway')&&has(browserHarness,'renderGateway={browserRenderer}'));
check('renderer_identity_foundation_preserved',has(renderer,"import QRCode from 'npm:qrcode@1.5.4'")&&has(renderer,'ENJAZ:DRAFT:')&&has(renderer,'ENJAZ:PACK:'));
check('roadmap_scope',has(roadmap,'## 10.4 — Reports & PDF')&&has(roadmap,'deterministic pagination/footer/signature/QR/barcode handling'));
check('kickoff_scope',has(kickoff,'A page may never be emitted blank')&&has(kickoff,'Oversized content must either split')&&has(kickoff,'QR/barcode identity must be stable'));

if(failures.length){console.error(`ENJAZ PHASE 10.4 REPORTS & PDF AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);process.exit(1)}
console.log('ENJAZ PHASE 10.4 REPORTS & PDF AUDIT PASS — deterministic PDF authority, authenticated server renderer, client/server parity, and 8-test real-browser/mobile/print certificate are governed; real-cloud output, exact-main, Pages, and Live External remain explicitly pending, so 10.5 stays locked.');
