import { useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinancialReport, financialReportToCsv, serializeFinancialReport, type FinancialReportKind, type FinancialReportQuery, type FinancialReportSnapshot } from '../../features/finance/financeReports.ts';
import { formatFinanceMoney as money, type FinanceSource } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import { buildFinancialReportPdfPlan, type FinancialReportPdfPlan } from '../../features/reports/financialReportPdf.ts';
import { createFinancialReportRenderGateway, type FinancialReportRenderGateway } from '../../features/reports/financialReportRenderCommands.ts';
import './phase74.css';

function localDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function saveText(filename: string, body: string, type: string): void {
  saveBlob(filename, new Blob([body], { type }));
}

function ReportTotals({ report }: { readonly report: FinancialReportSnapshot }) {
  const totals = report.totals;
  return <section className="r2-f74-kpis" aria-label="إجماليات التقرير" data-pdf-block="report-totals">
    <article><span>الأتعاب الحالية</span><b>{money(totals.currentFeesCents)}</b></article>
    <article><span>المحصّل بالفترة</span><b>{money(totals.collectedCents)}</b></article>
    <article><span>الرصيد المفتوح</span><b>{money(totals.outstandingAtSnapshotCents)}</b></article>
    <article><span>صافي الحركة</span><b>{money(totals.netCashMovementCents)}</b></article>
  </section>;
}

function PdfPreflight({ plan }: { readonly plan: FinancialReportPdfPlan }) {
  return <section className="r2-f74-card r2-f74-provenance" data-no-print="true" data-phase10-4-pdf-preflight="safe" aria-label="سلامة PDF">
    <header><h3>PDF 10.4</h3><span>{plan.pageCount} {plan.pageCount === 1 ? 'صفحة' : 'صفحات'} · جاهز للتوليد</span></header>
    <p title={plan.identity}>هوية التقرير: <b>{plan.identity}</b></p>
  </section>;
}

type RenderCertificate = Readonly<{ fingerprint: string; identity: string; pageCount: number }>;

export function FinancialReportsPanel({ source, workspaceId, renderGateway = null }: { readonly source: FinanceSource; readonly workspaceId: string; readonly renderGateway?: FinancialReportRenderGateway | null }) {
  const now = useMemo(() => new Date(), []);
  const [kind, setKind] = useState<FinancialReportKind>('period');
  const [from, setFrom] = useState(firstDayOfMonth(now));
  const [to, setTo] = useState(localDateInput(now));
  const [companyId, setCompanyId] = useState(source.companies[0]?.id ?? '');
  const [transactionId, setTransactionId] = useState(source.transactions[0]?.id ?? '');
  const [cashboxId, setCashboxId] = useState(source.cashboxes[0]?.id ?? '');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderCertificate, setRenderCertificate] = useState<RenderCertificate | null>(null);

  useEffect(() => {
    if (companyId && source.companies.some((item) => item.id === companyId)) return;
    setCompanyId(source.companies[0]?.id ?? '');
  }, [companyId, source.companies]);
  useEffect(() => {
    if (transactionId && source.transactions.some((item) => item.id === transactionId)) return;
    setTransactionId(source.transactions[0]?.id ?? '');
  }, [source.transactions, transactionId]);
  useEffect(() => {
    if (cashboxId && source.cashboxes.some((item) => item.id === cashboxId)) return;
    setCashboxId(source.cashboxes[0]?.id ?? '');
  }, [cashboxId, source.cashboxes]);

  const query = useMemo<FinancialReportQuery>(() => ({
    kind,
    from,
    to,
    companyId: kind === 'company' ? companyId : null,
    transactionId: kind === 'transaction' ? transactionId : null,
    cashboxId: kind === 'cashbox' ? cashboxId : null,
  }), [cashboxId, companyId, from, kind, to, transactionId]);

  const result = useMemo(() => {
    try {
      return { report: buildFinancialReport(source, query), error: null } as const;
    } catch (error) {
      return { report: null, error: error instanceof Error ? error.message : 'تعذر إنشاء التقرير' } as const;
    }
  }, [query, source]);

  const report = result.report;
  const pdfPreflight = useMemo(() => {
    if (!report) return { plan: null, error: null } as const;
    try {
      return { plan: buildFinancialReportPdfPlan(workspaceId, report), error: null } as const;
    } catch (error) {
      return { plan: null, error: error instanceof Error ? error.message : 'فشل فحص PDF' } as const;
    }
  }, [report, workspaceId]);

  useEffect(() => {
    setRenderCertificate(null);
    setRenderError(null);
  }, [report?.fingerprint]);

  const print = async () => {
    if (!pdfPreflight.plan || !report || rendering) return;
    if (!renderGateway) {
      window.print();
      return;
    }
    setRendering(true);
    setRenderError(null);
    setRenderCertificate(null);
    try {
      const rendered = await renderGateway.renderPdf({ workspaceId, query, expectedFingerprint: report.fingerprint });
      saveBlob(rendered.filename, rendered.file);
      setRenderCertificate(Object.freeze({ fingerprint: rendered.fingerprint, identity: rendered.identity, pageCount: rendered.pageCount }));
    } catch (error) {
      setRenderError(error instanceof DataAccessError && error.dataCode === 'DATA_CONFLICT'
        ? 'تغيرت البيانات المالية بعد فتح التقرير. حدّث التقرير ثم أعد إنشاء PDF لضمان تطابق الأرقام.'
        : 'تعذر إنشاء PDF المعتمد. لم يتم تنزيل ملف غير موثّق.');
    } finally {
      setRendering(false);
    }
  };

  return <section className="r2-f74-reports" data-m16-reporting-hook="reserved-no-shadow-store" data-phase10-4-report-pdf="governed">
    <header className="r2-f74-hero" data-pdf-block="report-header">
      <div><p>Phase 7.4 · Financial Reports · deterministic source totals</p><h1>التقارير المالية</h1></div>
      {report ? <strong className="r2-f74-fingerprint" title="بصمة التقرير">{report.fingerprint}</strong> : null}
    </header>

    <section className="r2-f74-controls" aria-label="مرشحات التقرير">
      <label>نوع التقرير<select aria-label="نوع التقرير" value={kind} onChange={(event) => setKind(event.target.value as FinancialReportKind)}><option value="period">الفترة</option><option value="company">الشركة</option><option value="transaction">المعاملة</option><option value="cashbox">الصندوق</option></select></label>
      <label>من<input aria-label="من" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>إلى<input aria-label="إلى" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      {kind === 'company' ? <label>الشركة<select aria-label="الشركة" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{source.companies.map((item) => <option key={item.id} value={item.id}>{item.display_name?.trim() || item.legal_name}</option>)}</select></label> : null}
      {kind === 'transaction' ? <label>المعاملة<select aria-label="المعاملة" value={transactionId} onChange={(event) => setTransactionId(event.target.value)}>{source.transactions.map((item) => <option key={item.id} value={item.id}>{item.legacy_id?.trim() ? `معاملة ${item.legacy_id.trim()}` : item.type}</option>)}</select></label> : null}
      {kind === 'cashbox' ? <label>الصندوق<select aria-label="الصندوق" value={cashboxId} onChange={(event) => setCashboxId(event.target.value)}>{source.cashboxes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    </section>

    {!report ? <section className="r2-f74-error" role="alert"><h2>تعذر بناء التقرير</h2><p>{result.error}</p></section> : <>
      <section className="r2-f74-report-head">
        <div><h2>{report.title}</h2><p>{report.from?.slice(0, 10) ?? 'بداية السجل'} ← {report.to?.slice(0, 10) ?? 'نهاية السجل'}</p></div>
        <div className="r2-f74-actions" data-no-print="true">
          <button type="button" disabled={!pdfPreflight.plan || rendering} onClick={() => void print()}>{rendering ? 'جارٍ إنشاء PDF…' : 'طباعة / PDF'}</button>
          <button type="button" onClick={() => saveText(`enjaz-finance-${report.fingerprint}.csv`, financialReportToCsv(report), 'text/csv;charset=utf-8')}>CSV</button>
          <button type="button" onClick={() => saveText(`enjaz-finance-${report.fingerprint}.json`, serializeFinancialReport(report), 'application/json;charset=utf-8')}>JSON</button>
        </div>
      </section>
      {pdfPreflight.plan ? <PdfPreflight plan={pdfPreflight.plan} /> : <section className="r2-f74-error" data-no-print="true" role="alert"><h2>PDF غير آمن للطباعة</h2><p>{pdfPreflight.error}</p></section>}
      {renderError ? <section className="r2-f74-error" data-no-print="true" role="alert"><h2>لم يتم إنشاء PDF</h2><p>{renderError}</p></section> : null}
      {renderCertificate ? <section className="r2-f74-card r2-f74-provenance" data-no-print="true" data-phase10-4-server-pdf="certified"><header><h3>PDF معتمد</h3><span>{renderCertificate.pageCount} {renderCertificate.pageCount === 1 ? 'صفحة' : 'صفحات'}</span></header><p>البصمة الخادمية: <b>{renderCertificate.fingerprint}</b></p><p title={renderCertificate.identity}>هوية QR / Barcode: <b>{renderCertificate.identity}</b></p></section> : null}
      <ReportTotals report={report} />

      <section className="r2-f74-grid">
        <article className="r2-f74-card" data-pdf-table="report-movements">
          <header><h3>حركة الفترة</h3><span>{report.movements.length} سطر</span></header>
          <div className="r2-f74-table-wrap"><table><thead><tr><th>التاريخ</th><th>المصدر</th><th>المرجع</th><th>الحالة</th><th>القيمة الفعالة</th></tr></thead><tbody>{report.movements.length ? report.movements.map((item) => <tr key={item.id} data-report-source={item.source}><td>{item.occurredAt.slice(0, 10)}</td><td>{item.source === 'payment' ? 'دفعة' : 'قيد'}</td><td title={item.evidenceRef}>{item.title}</td><td>{item.status === 'reversed' ? 'معكوس' : 'مرحّل'}</td><td>{money(item.effectiveCents)}</td></tr>) : <tr><td colSpan={5}>لا توجد حركة مثبتة ضمن هذا النطاق.</td></tr>}</tbody></table></div>
        </article>
        <article className="r2-f74-card" data-pdf-table="report-receivables">
          <header><h3>الأرصدة الحالية</h3><span>{report.receivables.length} سطر</span></header>
          <div className="r2-f74-table-wrap"><table><thead><tr><th>المعاملة</th><th>الشركة</th><th>الأتعاب</th><th>المفتوح</th></tr></thead><tbody>{report.receivables.length ? report.receivables.map((item) => <tr key={item.transactionId}><td>{item.transactionLabel}</td><td>{item.companyLabel}</td><td>{money(item.currentFeeCents)}</td><td>{money(item.outstandingCents)}</td></tr>) : <tr><td colSpan={4}>لا توجد أرصدة حالية في النطاق.</td></tr>}</tbody></table></div>
        </article>
      </section>

      <section className="r2-f74-card r2-f74-provenance" data-pdf-ready="true" data-pdf-block="report-provenance">
        <header><h3>المصدر والتدقيق</h3><span>نفس الإجماليات للشاشة والطباعة والتصدير</span></header>
        <p>Finance authority: {report.provenance.financeAuthority}</p>
        <p>الحركة: {report.provenance.movementLineCount} · الأرصدة: {report.provenance.receivableLineCount}</p>
        <p>بصمة حتمية: <b>{report.fingerprint}</b></p>
        {report.disclosures.map((text) => <p key={text}>{text}</p>)}
      </section>
    </>}
  </section>;
}

type LoadedFinance = Readonly<{ workspaceId: string; source: FinanceSource }>;

export function ConnectedPhase74FinancialReportsExperience() {
  const user = useCurrentUserId();
  const factory = useDataLayerFactory();
  const renderGateway = useMemo(() => factory.edge ? createFinancialReportRenderGateway({ edge: (name, init) => factory.edge!(name, init) }) : null, [factory]);
  const [loaded, setLoaded] = useState<LoadedFinance | false>();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user) throw new Error('missing user');
        const result = await loadFinanceSource(factory, user);
        if (active) setLoaded(result);
      } catch {
        if (active) setLoaded(false);
      }
    })();
    return () => { active = false; };
  }, [factory, user]);
  if (loaded === undefined) return <div className="r2-screen r2-finance-phase74"><h1>التقارير المالية</h1><p>جارٍ تحميل المصدر المالي…</p></div>;
  if (loaded === false) return <div className="r2-screen r2-finance-phase74"><h1>التقارير المالية غير متاحة</h1><p>تعذر تحميل المصدر المالي الموثوق.</p></div>;
  return <div className="r2-screen r2-finance-phase74" data-finance-stage="7.4" data-finance-report-authority="canonical"><FinancialReportsPanel source={loaded.source} workspaceId={loaded.workspaceId} renderGateway={renderGateway} /></div>;
}
