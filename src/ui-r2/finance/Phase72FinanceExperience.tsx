import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppError } from '../../core/errors/AppError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  financeCentsToDecimal,
  parseFinanceDecimalToCents,
  type CreateCashboxInput,
  type CreateEngagementInput,
  type FinanceCommandGateway,
  type FinanceEngagementContext,
  type FinancePaymentContext,
  type FinancePaymentMethod,
  type FinanceReceipt,
} from '../../features/finance/financeCommands.ts';
import { useFinanceCommandGateway } from '../../features/finance/FinanceCommandContext.tsx';
import { buildFinanceLedgerSnapshot, formatFinanceMoney, type FinanceLedgerSnapshot } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import { FinanceLedgerExperience } from './FinanceLedgerExperience.tsx';
import './phase72.css';

export interface FinanceTransactionOption {
  readonly id: string;
  readonly companyId: string;
  readonly title: string;
  readonly companyLabel: string;
  readonly feeCents: bigint;
  readonly collectedCents: bigint;
  readonly outstandingCents: bigint;
}

type Drawer = 'payment' | 'cashbox' | 'engagement' | 'receipt' | 'reverse' | null;

type PaymentDraft = Readonly<{
  transactionId: string;
  amount: string;
  method: FinancePaymentMethod;
  paidAt: string;
  cashboxId: string;
  engagementId: string;
  note: string;
  idempotencyKey: string;
}>;

type CashboxDraft = Readonly<{ name: string; openingBalance: string; idempotencyKey: string }>;
type EngagementDraft = Readonly<{
  transactionId: string;
  title: string;
  type: CreateEngagementInput['type'];
  billingMode: CreateEngagementInput['billingMode'];
  reference: string;
  startOn: string;
  endOn: string;
  idempotencyKey: string;
}>;

function secureUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  throw new Error('Secure UUID generation is unavailable');
}

function localDateTimeInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (!value || !Number.isFinite(parsed.getTime())) throw new AppError('Invalid payment time', { code: 'VALIDATION_FAILED', userMessage: 'وقت الدفع غير صالح.' });
  return parsed.toISOString();
}

function blankPayment(transaction?: FinanceTransactionOption): PaymentDraft {
  return Object.freeze({
    transactionId: transaction?.id ?? '',
    amount: transaction && transaction.outstandingCents > 0n ? financeCentsToDecimal(transaction.outstandingCents) : '',
    method: 'cash',
    paidAt: localDateTimeInput(),
    cashboxId: '',
    engagementId: '',
    note: '',
    idempotencyKey: secureUuid(),
  });
}

function blankCashbox(): CashboxDraft {
  return Object.freeze({ name: '', openingBalance: '0.00', idempotencyKey: secureUuid() });
}

function blankEngagement(transaction?: FinanceTransactionOption): EngagementDraft {
  return Object.freeze({
    transactionId: transaction?.id ?? '',
    title: '',
    type: 'contract',
    billingMode: 'per_transaction',
    reference: '',
    startOn: '',
    endOn: '',
    idempotencyKey: secureUuid(),
  });
}

function userError(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'تعذر إكمال العملية المالية.';
}

function methodLabel(method: FinancePaymentMethod): string {
  switch (method) {
    case 'cash': return 'نقداً';
    case 'transfer': return 'تحويل';
    case 'card': return 'بطاقة';
    default: return 'أخرى';
  }
}

function engagementTypeLabel(value: FinanceEngagementContext['type']): string {
  switch (value) {
    case 'contract': return 'عقد';
    case 'retainer': return 'اشتراك / Retainer';
    case 'service_agreement': return 'اتفاق خدمة';
    default: return 'ارتباط تجاري';
  }
}

function compactToken(value: string): string {
  return value.toUpperCase().replace(/-/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function transactionLabel(options: readonly FinanceTransactionOption[], id: string): string {
  return options.find((item) => item.id === id)?.title ?? `معاملة ${id.slice(0, 8)}`;
}

function companyLabel(options: readonly FinanceTransactionOption[], companyId: string): string {
  return options.find((item) => item.companyId === companyId)?.companyLabel ?? 'شركة مرتبطة';
}

function ReconciliationStrip({ context }: { context: FinancePaymentContext }) {
  const { reconciliation } = context;
  const healthy = reconciliation.integrityWarnings === 0;
  return (
    <section className={`r2-f72-reconcile ${healthy ? 'is-healthy' : 'is-warning'}`} aria-label="مطابقة الدفعات">
      <div><span className="r2-f72-signal" aria-hidden="true" /><strong>{healthy ? 'المطابقة المالية سليمة' : 'توجد إشارات مطابقة تحتاج مراجعة'}</strong><small>الدفعات هي مصدر التحصيل الوحيد؛ لا يوجد Shadow Ledger مسموح.</small></div>
      <div className="r2-f72-reconcile__facts">
        <span><b dir="ltr">{formatFinanceMoney(reconciliation.postedTotalCents)}</b><small>دفعات فعالة</small></span>
        <span><b>{reconciliation.integrityWarnings}</b><small>تحذير تكامل</small></span>
        <span><b>{reconciliation.shadowLedgerEntries}</b><small>قيد دفع مكرر</small></span>
      </div>
    </section>
  );
}

function ReceiptCard({ receipt, transactions, onOpen, onReverse }: { receipt: FinanceReceipt; transactions: readonly FinanceTransactionOption[]; onOpen: () => void; onReverse: () => void }) {
  return (
    <article className={`r2-f72-receipt-card ${receipt.status === 'reversed' ? 'is-reversed' : ''}`} data-receipt-ref={receipt.receiptRef}>
      <div className="r2-f72-receipt-card__top"><span>{receipt.status === 'posted' ? 'مُرحّلة' : 'معكوسة'}</span><b dir="ltr">{receipt.receiptRef}</b></div>
      <strong dir="ltr">{formatFinanceMoney(receipt.amountCents)}</strong>
      <p>{companyLabel(transactions, receipt.companyId)}</p>
      <small>{transactionLabel(transactions, receipt.transactionId)} · {methodLabel(receipt.method)}</small>
      <div className="r2-f72-card-actions"><button type="button" onClick={onOpen}>عرض الإيصال</button>{receipt.status === 'posted' && <button type="button" className="is-danger" onClick={onReverse}>عكس</button>}</div>
    </article>
  );
}

function ReceiptSheet({ receipt, transactions, onClose }: { receipt: FinanceReceipt; transactions: readonly FinanceTransactionOption[]; onClose: () => void }) {
  const snapshot = receipt.snapshot as Readonly<Record<string, unknown>>;
  const snapshotCompany = typeof snapshot.companyName === 'string' ? snapshot.companyName : companyLabel(transactions, receipt.companyId);
  const snapshotTransaction = typeof snapshot.transactionLabel === 'string' ? snapshot.transactionLabel : transactionLabel(transactions, receipt.transactionId);
  return (
    <section className="r2-f72-sheet r2-f72-sheet--receipt" role="dialog" aria-modal="true" aria-labelledby="r2-f72-receipt-title">
      <div className="r2-f72-sheet__bar"><button type="button" onClick={onClose} aria-label="إغلاق الإيصال">×</button><div><small>إيصال إنجاز</small><strong id="r2-f72-receipt-title" dir="ltr">{receipt.receiptRef}</strong></div><button type="button" onClick={() => window.print()}>طباعة</button></div>
      <div className="r2-f72-receipt-paper" data-print-receipt="true">
        <header><div><span>ENJAZ</span><b>إيصال قبض</b></div><div><small>المرجع</small><strong dir="ltr">{receipt.receiptRef}</strong></div></header>
        <div className="r2-f72-receipt-amount"><span>المبلغ المستلم</span><strong dir="ltr">{formatFinanceMoney(receipt.amountCents)}</strong><small>{methodLabel(receipt.method)}</small></div>
        <dl>
          <div><dt>الشركة</dt><dd>{snapshotCompany}</dd></div>
          <div><dt>المعاملة</dt><dd>{snapshotTransaction}</dd></div>
          <div><dt>التاريخ</dt><dd>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.paidAt))}</dd></div>
          {receipt.note && <div><dt>ملاحظة</dt><dd>{receipt.note}</dd></div>}
        </dl>
        <div className="r2-f72-verification"><span>رمز تحقق فريد للإيصال</span><code dir="ltr">{compactToken(receipt.receiptToken)}</code><small>هذا الرمز يعرّف Snapshot الإيصال الثابت داخل إنجاز.</small></div>
        {receipt.status === 'reversed' && <aside><strong>هذا الإيصال معكوس</strong><span>{receipt.reversal?.reason ?? 'تم تسجيل عكس مالي.'}</span><b dir="ltr">{receipt.reversal?.reversalRef}</b></aside>}
        <footer><span>نسخة النظام · لا تعتمد على تعديل واجهة المستخدم بعد الإصدار</span><b>ENJAZ Finance</b></footer>
      </div>
    </section>
  );
}

function DrawerFrame({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  return <section className="r2-f72-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="r2-f72-sheet__bar"><button type="button" onClick={onClose} aria-label="إغلاق">×</button><div><small>{eyebrow}</small><strong>{title}</strong></div><span /></div>{children}</section>;
}

export function Phase72FinanceExperience({
  snapshot,
  context,
  transactions,
  commandGateway,
  workspaceId,
  onChanged,
  mode = 'live',
}: {
  readonly snapshot: FinanceLedgerSnapshot;
  readonly context: FinancePaymentContext;
  readonly transactions: readonly FinanceTransactionOption[];
  readonly commandGateway: FinanceCommandGateway;
  readonly workspaceId: string;
  readonly onChanged: () => Promise<void> | void;
  readonly mode?: 'live' | 'preview';
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [payment, setPayment] = useState<PaymentDraft>(() => blankPayment(transactions.find((item) => item.outstandingCents > 0n)));
  const [cashbox, setCashbox] = useState<CashboxDraft>(() => blankCashbox());
  const [engagement, setEngagement] = useState<EngagementDraft>(() => blankEngagement(transactions[0]));
  const [selectedReceipt, setSelectedReceipt] = useState<FinanceReceipt | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseKey, setReverseKey] = useState(() => secureUuid());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openReceivables = transactions.filter((item) => item.outstandingCents > 0n);
  const activeCashboxes = context.cashboxes.filter((item) => item.active);
  const linkedEngagements = useMemo(() => context.engagements.filter((item) => !payment.transactionId || item.transactionIds.includes(payment.transactionId)), [context.engagements, payment.transactionId]);

  function openPayment(transaction?: FinanceTransactionOption) {
    setPayment(blankPayment(transaction ?? openReceivables[0] ?? transactions[0]));
    setError(null); setNotice(null); setDrawer('payment');
  }

  function openEngagement(transaction?: FinanceTransactionOption) {
    setEngagement(blankEngagement(transaction ?? transactions[0]));
    setError(null); setNotice(null); setDrawer('engagement');
  }

  async function refreshAfterWrite() {
    await onChanged();
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      const amountCents = parseFinanceDecimalToCents(payment.amount, 'payment amount');
      if (payment.method === 'cash' && !payment.cashboxId) throw new AppError('Cash payment requires cashbox', { code: 'VALIDATION_FAILED', userMessage: 'اختر خزنة فعالة قبل تسجيل دفعة نقدية.' });
      const receipt = await commandGateway.postPayment({
        workspaceId,
        transactionId: payment.transactionId,
        amountCents,
        method: payment.method,
        paidAt: toIsoDateTime(payment.paidAt),
        note: payment.note.trim() || null,
        idempotencyKey: payment.idempotencyKey,
        cashboxId: payment.cashboxId || null,
        engagementId: payment.engagementId || null,
      });
      setSelectedReceipt(receipt);
      setNotice(receipt.wasDuplicate ? 'تم استرجاع نفس الدفعة بأمان؛ لم تُنشأ دفعة مكررة.' : 'تم ترحيل الدفعة وإصدار الإيصال بنجاح.');
      await refreshAfterWrite();
      setPayment(blankPayment(openReceivables[0] ?? transactions[0]));
      setDrawer('receipt');
    } catch (caught) { setError(userError(caught)); }
    finally { setBusy(false); }
  }

  async function submitCashbox(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const input: CreateCashboxInput = { workspaceId, name: cashbox.name.trim(), openingBalanceCents: parseFinanceDecimalToCents(cashbox.openingBalance, 'opening balance'), idempotencyKey: cashbox.idempotencyKey };
      const result = await commandGateway.createCashbox(input);
      setNotice(result.wasDuplicate ? 'الخزنة موجودة وتم استرجاعها دون تكرار.' : `تم إنشاء ${result.name}.`);
      await refreshAfterWrite();
      setCashbox(blankCashbox());
      setDrawer(null);
    } catch (caught) { setError(userError(caught)); }
    finally { setBusy(false); }
  }

  async function submitEngagement(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const transaction = transactions.find((item) => item.id === engagement.transactionId);
      if (!transaction) throw new AppError('Missing engagement transaction', { code: 'VALIDATION_FAILED', userMessage: 'اختر معاملة صحيحة لربط العقد.' });
      const input: CreateEngagementInput = {
        workspaceId,
        companyId: transaction.companyId,
        transactionId: transaction.id,
        title: engagement.title.trim(),
        type: engagement.type,
        billingMode: engagement.billingMode,
        reference: engagement.reference.trim() || null,
        startOn: engagement.startOn || null,
        endOn: engagement.endOn || null,
        idempotencyKey: engagement.idempotencyKey,
      };
      const result = await commandGateway.createEngagement(input);
      setNotice(result.wasDuplicate ? 'تم استرجاع الارتباط التجاري نفسه دون تكرار.' : `تم إنشاء ${engagementTypeLabel(result.type)} وربطه بالمعاملة.`);
      await refreshAfterWrite();
      setEngagement(blankEngagement(transaction));
      setDrawer(null);
    } catch (caught) { setError(userError(caught)); }
    finally { setBusy(false); }
  }

  async function submitReverse(event: FormEvent) {
    event.preventDefault();
    if (!selectedReceipt) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const reversal = await commandGateway.reversePayment({ workspaceId, paymentId: selectedReceipt.paymentId, reason: reverseReason, idempotencyKey: reverseKey });
      const refreshed = await commandGateway.getReceipt(workspaceId, selectedReceipt.paymentId);
      setSelectedReceipt(refreshed);
      setNotice(reversal.wasDuplicate ? 'تم استرجاع العكس المسجل سابقاً؛ لم يحدث عكس مكرر.' : 'تم عكس الدفعة وتسجيل أثر التدقيق.');
      await refreshAfterWrite();
      setReverseReason(''); setReverseKey(secureUuid()); setDrawer('receipt');
    } catch (caught) { setError(userError(caught)); }
    finally { setBusy(false); }
  }

  function selectTransaction(id: string) {
    const option = transactions.find((item) => item.id === id);
    setPayment((current) => Object.freeze({ ...current, transactionId: id, amount: option && option.outstandingCents > 0n ? financeCentsToDecimal(option.outstandingCents) : current.amount, engagementId: '' }));
  }

  return (
    <div className="r2-screen r2-finance-phase72" data-finance-stage="7.2" data-finance-mode={mode} data-m16-finance="true">
      <header className="r2-f72-header">
        <div><p className="r2-eyebrow">Phase 7.2 · Payments & Receipts · M16</p><h1>المالية والتحصيل</h1><p>تحصيل حقيقي بإيصال ثابت، عكس آمن، خزائن مضبوطة وربط العقود والـRetainers بالمعاملة دون إنشاء مصدر مالي موازٍ.</p></div>
        <div className="r2-f72-header__actions"><button type="button" className="is-primary" onClick={() => openPayment()}>＋ دفعة جديدة</button><button type="button" onClick={() => { setCashbox(blankCashbox()); setDrawer('cashbox'); setError(null); }}>خزنة</button><button type="button" onClick={() => openEngagement()}>عقد / Retainer</button></div>
      </header>

      {notice && <aside className="r2-f72-notice" role="status">{notice}</aside>}
      {error && <aside className="r2-f72-error" role="alert"><strong>لم تُنفذ العملية</strong><span>{error}</span><small>إذا كانت النتيجة غير مؤكدة، أعد المحاولة من نفس النافذة كي يبقى مفتاح Idempotency نفسه.</small></aside>}

      <ReconciliationStrip context={context} />

      <section className="r2-f72-command-grid" aria-label="إجراءات التحصيل">
        <button type="button" className="r2-f72-command-card is-primary" onClick={() => openPayment()}><span>01</span><div><strong>تسجيل دفعة</strong><small>{openReceivables.length} معاملة لديها رصيد مفتوح</small></div><b>←</b></button>
        <button type="button" className="r2-f72-command-card" onClick={() => { setCashbox(blankCashbox()); setDrawer('cashbox'); }}><span>02</span><div><strong>إدارة الخزائن</strong><small>{activeCashboxes.length} خزنة فعالة</small></div><b>←</b></button>
        <button type="button" className="r2-f72-command-card" onClick={() => openEngagement()}><span>03</span><div><strong>M16 · العقود والـRetainers</strong><small>{context.engagements.length} ارتباط تجاري</small></div><b>←</b></button>
      </section>

      <section className="r2-f72-receipts" aria-labelledby="r2-f72-receipts-title">
        <header><div><p className="r2-eyebrow">Receipt stream</p><h2 id="r2-f72-receipts-title">آخر الإيصالات</h2></div><span>{context.recentReceipts.length} إيصال</span></header>
        {context.recentReceipts.length ? <div className="r2-f72-receipt-rail">{context.recentReceipts.map((receipt) => <ReceiptCard key={receipt.paymentId} receipt={receipt} transactions={transactions} onOpen={() => { setSelectedReceipt(receipt); setDrawer('receipt'); setError(null); }} onReverse={() => { setSelectedReceipt(receipt); setReverseReason(''); setReverseKey(secureUuid()); setDrawer('reverse'); setError(null); }} />)}</div> : <div className="r2-f72-empty"><strong>لم تصدر إيصالات بعد</strong><span>أول دفعة ناجحة ستنشئ إيصالاً ثابتاً وتظهر هنا فوراً.</span></div>}
      </section>

      <section className="r2-f72-ledger-wrap" aria-label="دفتر المالية"><FinanceLedgerExperience snapshot={snapshot} mode={mode} /></section>

      {drawer === 'payment' && <DrawerFrame title="تسجيل دفعة جديدة" eyebrow="Authoritative payment" onClose={() => setDrawer(null)}><form className="r2-f72-form" onSubmit={submitPayment}>
        <label><span>المعاملة</span><select required value={payment.transactionId} onChange={(event) => selectTransaction(event.target.value)}><option value="">اختر معاملة</option>{transactions.map((item) => <option key={item.id} value={item.id}>{item.companyLabel} · {item.title} · متبقٍ {formatFinanceMoney(item.outstandingCents)}</option>)}</select></label>
        <div className="r2-f72-form__split"><label><span>المبلغ</span><input required inputMode="decimal" value={payment.amount} onChange={(event) => setPayment((current) => Object.freeze({ ...current, amount: event.target.value }))} placeholder="0.00" /></label><label><span>طريقة الدفع</span><select value={payment.method} onChange={(event) => setPayment((current) => Object.freeze({ ...current, method: event.target.value as FinancePaymentMethod, cashboxId: event.target.value === 'cash' ? current.cashboxId : current.cashboxId }))}><option value="cash">نقداً</option><option value="transfer">تحويل</option><option value="card">بطاقة</option><option value="other">أخرى</option></select></label></div>
        <label><span>وقت الدفع</span><input required type="datetime-local" value={payment.paidAt} onChange={(event) => setPayment((current) => Object.freeze({ ...current, paidAt: event.target.value }))} /></label>
        <label><span>الخزنة {payment.method === 'cash' ? '· مطلوبة للنقد' : '· اختيارية'}</span><select value={payment.cashboxId} onChange={(event) => setPayment((current) => Object.freeze({ ...current, cashboxId: event.target.value }))}><option value="">بدون خزنة</option>{activeCashboxes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>M16 · العقد/Retainer · اختياري</span><select value={payment.engagementId} onChange={(event) => setPayment((current) => Object.freeze({ ...current, engagementId: event.target.value }))}><option value="">بدون ارتباط تجاري</option>{linkedEngagements.map((item) => <option key={item.id} value={item.id}>{item.title}{item.reference ? ` · ${item.reference}` : ''}</option>)}</select></label>
        <label><span>ملاحظة</span><textarea rows={3} maxLength={600} value={payment.note} onChange={(event) => setPayment((current) => Object.freeze({ ...current, note: event.target.value }))} /></label>
        <div className="r2-f72-form__guard"><strong>حماية التكرار فعالة</strong><span>إذا انقطع الاتصال، نفس المحاولة تستخدم نفس المفتاح ولا تنشئ دفعة ثانية.</span></div>
        <button className="r2-f72-submit" disabled={busy || !payment.transactionId} type="submit">{busy ? 'جارٍ تأكيد العملية…' : 'ترحيل الدفعة وإصدار الإيصال'}</button>
      </form></DrawerFrame>}

      {drawer === 'cashbox' && <DrawerFrame title="إنشاء خزنة مالية" eyebrow="Controlled cashbox" onClose={() => setDrawer(null)}><form className="r2-f72-form" onSubmit={submitCashbox}><label><span>اسم الخزنة</span><input required maxLength={180} value={cashbox.name} onChange={(event) => setCashbox((current) => Object.freeze({ ...current, name: event.target.value }))} placeholder="الخزنة الرئيسية" /></label><label><span>الرصيد الافتتاحي</span><input required inputMode="decimal" value={cashbox.openingBalance} onChange={(event) => setCashbox((current) => Object.freeze({ ...current, openingBalance: event.target.value }))} /></label><button className="r2-f72-submit" disabled={busy} type="submit">{busy ? 'جارٍ الإنشاء…' : 'إنشاء الخزنة'}</button></form></DrawerFrame>}

      {drawer === 'engagement' && <DrawerFrame title="ربط عقد أو Retainer" eyebrow="M16 · Commercial engagement" onClose={() => setDrawer(null)}><form className="r2-f72-form" onSubmit={submitEngagement}><label><span>المعاملة</span><select required value={engagement.transactionId} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, transactionId: event.target.value }))}><option value="">اختر معاملة</option>{transactions.map((item) => <option key={item.id} value={item.id}>{item.companyLabel} · {item.title}</option>)}</select></label><label><span>العنوان</span><input required maxLength={320} value={engagement.title} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, title: event.target.value }))} placeholder="عقد متابعة معاملات الشركة" /></label><div className="r2-f72-form__split"><label><span>النوع</span><select value={engagement.type} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, type: event.target.value as EngagementDraft['type'] }))}><option value="contract">عقد</option><option value="retainer">Retainer</option><option value="service_agreement">اتفاق خدمة</option><option value="other">أخرى</option></select></label><label><span>أسلوب الفوترة</span><select value={engagement.billingMode} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, billingMode: event.target.value as EngagementDraft['billingMode'] }))}><option value="per_transaction">لكل معاملة</option><option value="retainer">Retainer</option><option value="fixed">مبلغ ثابت</option><option value="mixed">مختلط</option></select></label></div><label><span>مرجع العقد · اختياري</span><input maxLength={160} value={engagement.reference} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, reference: event.target.value }))} /></label><div className="r2-f72-form__split"><label><span>بداية</span><input type="date" value={engagement.startOn} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, startOn: event.target.value }))} /></label><label><span>نهاية</span><input type="date" value={engagement.endOn} onChange={(event) => setEngagement((current) => Object.freeze({ ...current, endOn: event.target.value }))} /></label></div><div className="r2-f72-form__guard"><strong>لا يوجد دفتر مالي ثانٍ</strong><span>M16 يربط العلاقة التجارية بالمعاملة؛ الأموال تبقى في Payments/Reversals فقط.</span></div><button className="r2-f72-submit" disabled={busy || !engagement.transactionId} type="submit">{busy ? 'جارٍ الربط…' : 'إنشاء وربط'}</button></form></DrawerFrame>}

      {drawer === 'reverse' && selectedReceipt && <DrawerFrame title={`عكس ${selectedReceipt.receiptRef}`} eyebrow="Compensating event" onClose={() => setDrawer(null)}><form className="r2-f72-form" onSubmit={submitReverse}><div className="r2-f72-reverse-summary"><span>المبلغ</span><strong dir="ltr">{formatFinanceMoney(selectedReceipt.amountCents)}</strong><small>العكس لا يحذف الإيصال؛ يضيف حدثاً مقابلاً وأثر تدقيق.</small></div><label><span>سبب العكس</span><textarea required minLength={3} maxLength={600} rows={5} value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} /></label><button className="r2-f72-submit is-danger" disabled={busy || reverseReason.trim().length < 3} type="submit">{busy ? 'جارٍ تأكيد العكس…' : 'تأكيد عكس الدفعة'}</button></form></DrawerFrame>}

      {drawer === 'receipt' && selectedReceipt && <ReceiptSheet receipt={selectedReceipt} transactions={transactions} onClose={() => setDrawer(null)} />}
    </div>
  );
}

type ConnectedState = Readonly<{
  status: 'loading' | 'ready' | 'error';
  workspaceId: string | null;
  snapshot: FinanceLedgerSnapshot | null;
  context: FinancePaymentContext | null;
  transactions: readonly FinanceTransactionOption[];
  error: string | null;
}>;

function initialState(): ConnectedState { return Object.freeze({ status: 'loading', workspaceId: null, snapshot: null, context: null, transactions: Object.freeze([]), error: null }); }

export function ConnectedPhase72FinanceExperience() {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const commandGateway = useFinanceCommandGateway();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ConnectedState>(() => initialState());

  const reload = useCallback(async () => {
    if (!userId) { setState(Object.freeze({ ...initialState(), status: 'error', error: 'انتهت الجلسة.' })); return; }
    setState((current) => Object.freeze({ ...current, status: 'loading', error: null }));
    try {
      const loaded = await loadFinanceSource(factory, userId);
      const snapshot = buildFinanceLedgerSnapshot(loaded.source);
      const context = await commandGateway.loadContext(loaded.workspaceId);
      const receivableById = new Map(snapshot.receivables.map((item) => [item.transactionId, item] as const));
      const companiesById = new Map(loaded.source.companies.map((item) => [item.id, item] as const));
      const transactions = loaded.source.transactions
        .filter((item) => item.deleted_at === null)
        .map((item): FinanceTransactionOption => {
          const receivable = receivableById.get(item.id);
          const company = companiesById.get(item.company_id);
          const feeCents = receivable?.feeCents ?? BigInt(Math.round(item.current_fee * 100));
          const collectedCents = receivable?.collectedCents ?? feeCents;
          return Object.freeze({
            id: item.id,
            companyId: item.company_id,
            title: item.legacy_id?.trim() ? `معاملة ${item.legacy_id.trim()}` : item.type,
            companyLabel: company?.display_name?.trim() || company?.legal_name?.trim() || 'شركة غير متاحة',
            feeCents,
            collectedCents,
            outstandingCents: receivable?.outstandingCents ?? 0n,
          });
        });
      setState(Object.freeze({ status: 'ready', workspaceId: loaded.workspaceId, snapshot, context, transactions: Object.freeze(transactions), error: null }));
    } catch (caught) {
      setState(Object.freeze({ status: 'error', workspaceId: null, snapshot: null, context: null, transactions: Object.freeze([]), error: userError(caught) }));
    }
  }, [commandGateway, factory, userId]);

  useEffect(() => { void reload(); }, [attempt, reload]);

  if (state.status === 'loading') return <div className="r2-screen r2-finance-phase72"><header className="r2-f72-header"><div><p className="r2-eyebrow">Phase 7.2 · Payments & Receipts</p><h1>المالية والتحصيل</h1><p>جارٍ مطابقة الدفتر مع أوامر التحصيل…</p></div></header><div className="r2-finance-loading" aria-live="polite"><span /><span /><span /></div></div>;
  if (state.status === 'error' || !state.workspaceId || !state.snapshot || !state.context) return <div className="r2-screen r2-finance-phase72"><header className="r2-f72-header"><div><p className="r2-eyebrow">Phase 7.2 · Fail closed</p><h1>لم نفتح الكتابة المالية</h1><p>{state.error ?? 'تعذر تحميل سياق التحصيل.'}</p></div></header><button className="r2-finance-retry" type="button" onClick={() => setAttempt((value) => value + 1)}>إعادة التحقق</button></div>;

  return <Phase72FinanceExperience snapshot={state.snapshot} context={state.context} transactions={state.transactions} commandGateway={commandGateway} workspaceId={state.workspaceId} onChanged={reload} />;
}
