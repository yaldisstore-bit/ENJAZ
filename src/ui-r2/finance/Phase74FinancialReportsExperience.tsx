import { useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinancialReport, financialReportToCsv, serializeFinancialReport, type FinancialReportKind, type FinancialReportSnapshot } from '../../features/finance/financeReports.ts';
import { formatFinanceMoney as money, type FinanceSource } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
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

function saveText(filename: string, body: string, type: string): void {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ReportTotals({ report }: { readonly report: FinancialReportSnapshot }) {
  const totals = report.totals;
  return <section className="r2-f74-kpis" aria-label="إجماليات التقرير">
    <article><span>الأتعاب الحالية</span><b>{money(totals.currentFeesCents)}</b></article>
    <article><span>المحصّل بالفترة</span><b>{money(totals.collectedCents)}</b></article>
    <article><span>الرصيد المفتوح</span><b>{money(totals.outstandingAtSnapshotCents)}</b></article>
    <article><span>صافي الحركة</span><b>{money(totals.netCashMovementCents)}</b></article>
  </section>;
}

export function FinancialReportsPanel({ source }: { readonly source: FinanceSource }) {
  const now = useMemo(() => new Date(), []);
  const [kind, setKind] = useState<FinancialReportKind>('period');
  const [from, setFrom] = useState(firstDayOfMonth(now));
  const [to, setTo] = useState(localDateInput(now));
  const [companyId, setCompanyId] = useState(source.companies[0]?.id ?? '');
  const [transactionId, setTransactionId] = useState(source.transactions[0]?.id ?? '');
  const [cashboxId, setCashboxId] = useState(source.cashboxes[0]?.id ?? '');

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

  const result = useMemo(() => {
    try {
      return { report: buildFinancialReport(source, {
        kind,
        from,
        to,
        companyId: kind === 'company' ? companyId : null,
        transactionId: kind === 'transaction' ? transactionId : null,
        cashboxId: kind === 'cashbox' ? cashboxId : null,
      }), error: null } as const;
    } catch (error) {
      return { report: null, error: error instanceof Error ? error.message : 'تعذر إنشاء التقرير' } as const;
    }
  }, [cashboxId, companyId, from, kind, source, to, transactionId]);

  const report = result.report;
  return <section className="r2-f74-reports" data-m16-reporting-hook="reserved-no-shadow-store">
    <header className="r2-f74-hero">
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
          <button type="button" onClick={() => window.print()}>طباعة / PDF</button>
          <button type="button" onClick={() => saveText(`enjaz-finance-${report.fingerprint}.csv`, financialReportToCsv(report), 'text/csv;charset=utf-8')}>CSV</button>
          <button type="button" onClick={() => saveText(`enjaz-finance-${report.fingerprint}.json`, serializeFinancialReport(report), 'application/json;charset=utf-8')}>JSON</button>
        </div>
      </section>
      <ReportTotals report={report} />

      <section className="r2-f74-grid">
        <article className="r2-f74-card">
          <header><h3>حركة الفترة</h3><span>{report.movements.length} سطر</span></header>
          <div className="r2-f74-table-wrap"><table><thead><tr><th>التاريخ</th><th>المصدر</th><th>المرجع</th><th>الحالة</th><th>القيمة الفعالة</th></tr></thead><tbody>{report.movements.length ? report.movements.map((item) => <tr key={item.id} data-report-source={item.source}><td>{item.occurredAt.slice(0, 10)}</td><td>{item.source === 'payment' ? 'دفعة' : 'قيد'}</td><td title={item.evidenceRef}>{item.title}</td><td>{item.status === 'reversed' ? 'معكوس' : 'مرحّل'}</td><td>{money(item.effectiveCents)}</td></tr>) : <tr><td colSpan={5}>لا توجد حركة مثبتة ضمن هذا النطاق.</td></tr>}</tbody></table></div>
        </article>
        <article className="r2-f74-card">
          <header><h3>الأرصدة الحالية</h3><span>{report.receivables.length} سطر</span></header>
          <div className="r2-f74-table-wrap"><table><thead><tr><th>المعاملة</th><th>الشركة</th><th>الأتعاب</th><th>المفتوح</th></tr></thead><tbody>{report.receivables.length ? report.receivables.map((item) => <tr key={item.transactionId}><td>{item.transactionLabel}</td><td>{item.companyLabel}</td><td>{money(item.currentFeeCents)}</td><td>{money(item.outstandingCents)}</td></tr>) : <tr><td colSpan={4}>لا توجد أرصدة حالية في النطاق.</td></tr>}</tbody></table></div>
        </article>
      </section>

      <section className="r2-f74-card r2-f74-provenance" data-pdf-ready="true">
        <header><h3>المصدر والتدقيق</h3><span>نفس الإجماليات للشاشة والطباعة والتصدير</span></header>
        <p>Finance authority: {report.provenance.financeAuthority}</p>
        <p>الحركة: {report.provenance.movementLineCount} · الأرصدة: {report.provenance.receivableLineCount}</p>
        <p>بصمة حتمية: <b>{report.fingerprint}</b></p>
        {report.disclosures.map((text) => <p key={text}>{text}</p>)}
      </section>
    </>}
  </section>;
}

export function ConnectedPhase74FinancialReportsExperience() {
  const user = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [source, setSource] = useState<FinanceSource | false>();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user) throw new Error('missing user');
        const loaded = await loadFinanceSource(factory, user);
        if (active) setSource(loaded.source);
      } catch {
        if (active) setSource(false);
      }
    })();
    return () => { active = false; };
  }, [factory, user]);
  if (source === undefined) return <div className="r2-screen r2-finance-phase74"><h1>التقارير المالية</h1><p>جارٍ تحميل المصدر المالي…</p></div>;
  if (source === false) return <div className="r2-screen r2-finance-phase74"><h1>التقارير المالية غير متاحة</h1><p>تعذر تحميل المصدر المالي الموثوق.</p></div>;
  return <div className="r2-screen r2-finance-phase74" data-finance-stage="7.4" data-finance-report-authority="canonical"><FinancialReportsPanel source={source} /></div>;
}
