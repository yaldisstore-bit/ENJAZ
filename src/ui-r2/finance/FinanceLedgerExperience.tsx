import { formatFinanceMoney, type FinanceLedgerItem, type FinanceLedgerSnapshot } from '../../features/finance/financeModel.ts';
import { useFinanceLedger } from '../../features/finance/useFinance.ts';

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function SignedMoney({ entry }: { entry: FinanceLedgerItem }) {
  const sign = entry.direction === 'in' ? '+' : '−';
  return <b className={`r2-finance-money r2-finance-money--${entry.direction}`} dir="ltr">{sign} {formatFinanceMoney(entry.amountCents)}</b>;
}

function SummaryMetric({ label, value, meta, emphasis = false }: { label: string; value: bigint; meta: string; emphasis?: boolean }) {
  return <div className={emphasis ? 'r2-finance-metric is-emphasis' : 'r2-finance-metric'}><span>{label}</span><strong dir="ltr">{formatFinanceMoney(value)}</strong><small>{meta}</small></div>;
}

function LedgerRows({ snapshot }: { snapshot: FinanceLedgerSnapshot }) {
  if (!snapshot.entries.length) return <div className="r2-finance-empty"><strong>لا توجد حركة مالية بعد</strong><span>ستظهر الدفعات والقيود هنا فور وجودها في المصادر المعتمدة.</span></div>;
  return <div className="r2-finance-ledger-list">{snapshot.entries.map((entry) => (
    <article key={entry.id} className={`r2-finance-ledger-row${entry.status === 'reversed' ? ' is-reversed' : ''}`}>
      <span className={`r2-finance-direction r2-finance-direction--${entry.direction}`} aria-hidden="true" />
      <div className="r2-finance-ledger-copy"><div><strong>{entry.title}</strong>{entry.status === 'reversed' && <em>معكوس</em>}</div><small>{[entry.companyLabel, entry.transactionLabel, formatDate(entry.occurredAt)].filter(Boolean).join(' · ')}</small>{(entry.category || entry.method) && <span>{[entry.category, entry.method].filter(Boolean).join(' / ')}</span>}</div>
      <SignedMoney entry={entry} />
    </article>
  ))}</div>;
}

function Receivables({ snapshot }: { snapshot: FinanceLedgerSnapshot }) {
  const items = snapshot.receivables.filter((item) => item.outstandingCents > 0n).slice(0, 12);
  if (!items.length) return <div className="r2-finance-empty r2-finance-empty--compact"><strong>لا توجد ذمم مستحقة</strong><span>كل الرسوم الحالية مغطاة بالتحصيلات المسجلة.</span></div>;
  return <div className="r2-finance-receivables">{items.map((item) => <article key={item.transactionId}><div><strong>{item.transactionLabel}</strong><span>{item.companyLabel}</span></div><div className="r2-finance-receivable-amount"><b dir="ltr">{formatFinanceMoney(item.outstandingCents)}</b><small>متبقٍ من {formatFinanceMoney(item.feeCents)}</small></div></article>)}</div>;
}

export function FinanceLedgerExperience({ snapshot, mode = 'live' }: { snapshot: FinanceLedgerSnapshot; mode?: 'live' | 'preview' }) {
  const { summary } = snapshot;
  const openReceivables = snapshot.receivables.filter((item) => item.outstandingCents > 0n).length;
  return (
    <div className="r2-screen r2-finance-workspace" data-finance-stage="7.1" data-finance-mode={mode} data-finance-readonly="true">
      <header className="r2-finance-header"><div><p className="r2-eyebrow">Phase 7.1 · Financial Ledger & Summary</p><h1>المالية</h1><p>دفتر موحّد يقرأ الدفعات والذمم والقيود والخزائن من مصادر إنجاز المعتمدة، دون كتابة أو تسوية صامتة.</p></div><span className="r2-finance-stage-badge">قراءة موثوقة</span></header>
      <section className="r2-finance-balance-hero" aria-label="الرصيد والذمم"><div className="r2-finance-balance-main"><span>الرصيد التقديري من المصادر المعتمدة</span><strong dir="ltr">{formatFinanceMoney(summary.estimatedBalanceCents)}</strong><small>الرصيد الافتتاحي + التحصيلات + قيود الداخل − قيود الخارج</small></div><div className="r2-finance-balance-signal"><span>إجمالي المتبقي</span><strong dir="ltr">{formatFinanceMoney(summary.outstandingCents)}</strong><small>{openReceivables} معاملة لديها ذمة</small></div></section>
      {summary.paymentIntegrityWarnings > 0 && <aside className="r2-finance-integrity-warning" role="alert"><strong>توجد {summary.paymentIntegrityWarnings} إشارة تحتاج مطابقة</strong><span>حالة دفعة لا تطابق سجل العكس المرتبط بها. استُبعدت القيم المعكوسة من التحصيل مع إبقاء الإشارة ظاهرة.</span></aside>}
      <section className="r2-finance-metrics" aria-label="ملخص مالي"><SummaryMetric label="الرسوم الحالية" value={summary.totalFeesCents} meta={`${snapshot.counts.transactions} معاملة في المصدر`} /><SummaryMetric label="المحصل" value={summary.collectedCents} meta={`${summary.postedPayments} دفعة فعالة`} emphasis /><SummaryMetric label="الرصيد الافتتاحي" value={summary.openingBalanceCents} meta={`${summary.activeCashboxes} خزائن فعالة`} /><SummaryMetric label="صافي القيود الأخرى" value={summary.ledgerInCents - summary.ledgerOutCents} meta={`${snapshot.counts.ledger} قيد في الدفتر`} /></section>
      <div className="r2-finance-grid"><section className="r2-finance-panel" aria-labelledby="r2-finance-ledger-title"><header className="r2-finance-panel-head"><div><p className="r2-eyebrow">الحركة</p><h2 id="r2-finance-ledger-title">آخر القيود</h2></div><span>{snapshot.entries.length} ظاهر</span></header><LedgerRows snapshot={snapshot} /></section><section className="r2-finance-panel r2-finance-panel--receivables" aria-labelledby="r2-finance-receivables-title"><header className="r2-finance-panel-head"><div><p className="r2-eyebrow">الاستحقاق</p><h2 id="r2-finance-receivables-title">الذمم المفتوحة</h2></div><span>{openReceivables}</span></header><Receivables snapshot={snapshot} />{summary.creditCents > 0n && <div className="r2-finance-credit"><span>رصيد زائد على الرسوم</span><strong dir="ltr">{formatFinanceMoney(summary.creditCents)}</strong></div>}</section></div>
      <aside className="r2-finance-truth" role="note"><strong>{mode === 'live' ? 'مصادر إنتاج معتمدة' : 'عينة 7.1 للمعاينة فقط'}</strong><span>{mode === 'live' ? 'هذه الشاشة للقراءة في 7.1. إنشاء الدفعات والإيصالات والعكس يبقى مقفلاً حتى Phase 7.2.' : 'الأرقام هنا بيانات اختبار ثابتة لا تُعرض على أنها أرقام إنتاج.'}</span></aside>
    </div>
  );
}

function FinanceLoading() {
  return <div className="r2-screen r2-finance-workspace"><header className="r2-finance-header"><div><p className="r2-eyebrow">Phase 7.1</p><h1>المالية</h1><p>جارٍ التحقق من المصادر المالية المعتمدة…</p></div></header><div className="r2-finance-loading" aria-live="polite"><span /><span /><span /></div></div>;
}

function FinanceError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="r2-screen r2-finance-workspace"><header className="r2-finance-header"><div><p className="r2-eyebrow">Phase 7.1 · Fail closed</p><h1>لم نعرض أرقامًا غير موثوقة</h1><p>{message}</p></div></header><button type="button" className="r2-finance-retry" onClick={retry}>إعادة القراءة</button></div>;
}

export function ConnectedFinanceLedgerExperience() {
  const controller = useFinanceLedger();
  if (controller.status === 'loading') return <FinanceLoading />;
  if (controller.status === 'error' || !controller.snapshot) return <FinanceError message={controller.errorMessage ?? 'تعذر تحميل الدفتر المالي.'} retry={controller.retry} />;
  return <FinanceLedgerExperience snapshot={controller.snapshot} />;
}
