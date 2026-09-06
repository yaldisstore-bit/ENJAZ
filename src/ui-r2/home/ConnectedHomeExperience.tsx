import { useState } from 'react';
import { useExecutiveBriefing } from '../../features/executive-briefing/useExecutiveBriefing.ts';
import type { ExecutiveBriefingDestination } from '../../features/executive-briefing/executiveBriefingModel.ts';
import { useHomeDashboard } from '../../features/home/useHomeDashboard.ts';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type Navigate = (id: R2DestinationId) => void;

function money(value: number, safe: boolean): string {
  if (!safe) return 'قيمة غير آمنة للعرض الدقيق';
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع`;
}

function LiveState(props: Readonly<{ title: string; body: string; retry?: (() => void) | undefined }>) {
  return (
    <div className="r2-screen r2-live-state" data-r2-live-state="true">
      <section className="r2-section-heading r2-section-heading--hero">
        <div><p className="r2-eyebrow">بيانات مساحة العمل</p><h1>{props.title}</h1><p className="r2-supporting">{props.body}</p></div>
        {props.retry ? <button type="button" className="r2-action r2-action--secondary" onClick={props.retry}>إعادة المحاولة</button> : null}
      </section>
    </div>
  );
}

function ExecutiveBriefing(props: Readonly<{ navigate: Navigate; close(): void }>) {
  const controller = useExecutiveBriefing();
  if (controller.status === 'loading') return <LiveState title="جارٍ تجهيز الملخص التنفيذي" body="تُجمع الإشارات التشغيلية والمالية من المصادر الموثوقة داخل مساحة العمل." />;
  if (controller.status === 'error' || !controller.snapshot) return <LiveState title="تعذر تجهيز الملخص التنفيذي" body={controller.errorMessage ?? 'تعذر قراءة المصادر الموثوقة.'} retry={controller.retry} />;

  const snapshot = controller.snapshot;
  const open = (destination: ExecutiveBriefingDestination) => {
    props.close();
    props.navigate(destination === 'transactions' ? 'transactions' : destination === 'today' ? 'today' : 'finance');
  };

  return (
    <div className="r2-screen r2-live-briefing" data-r2-live="executive-briefing">
      <header className="r2-section-heading r2-section-heading--hero">
        <div><p className="r2-eyebrow">نظرة الإدارة · بيانات حية</p><h1>الملخص التنفيذي</h1><p className="r2-supporting">{snapshot.headline}</p></div>
        <button type="button" className="r2-action r2-action--secondary" onClick={props.close}>العودة للرئيسية</button>
      </header>

      <section className="r2-live-briefing__summary" aria-label="حالة الملخص التنفيذي">
        <div><span>الحالة</span><strong>{snapshot.state === 'critical' ? 'تحتاج قرارًا' : snapshot.state === 'watch' ? 'تحتاج مراقبة' : 'مستقرة'}</strong><small>{snapshot.summary}</small></div>
        <div><span>العمل المفتوح</span><strong>{snapshot.workload.total}</strong><small>{snapshot.workload.overdue} متأخر · {snapshot.workload.blocked} عائق</small></div>
        <div><span>تحصيل 7 أيام</span><strong>{money(snapshot.finance.posted7d, snapshot.finance.precisionSafe)}</strong><small>{snapshot.finance.postedCount7d} دفعة مثبتة</small></div>
      </section>

      <section className="r2-home-flow">
        <div className="r2-section-heading"><div><p className="r2-eyebrow">قرارات مقترحة من الحقائق</p><h2>ما الذي يحتاج حسمًا؟</h2></div></div>
        <div className="r2-focus-list">
          {snapshot.decisions.length ? snapshot.decisions.map((item, index) => (
            <button type="button" className="r2-focus-row" key={item.id} onClick={() => open(item.destination)}>
              <span className="r2-focus-row__marker">{String(index + 1).padStart(2, '0')}</span>
              <span className="r2-focus-row__content"><strong>{item.title}</strong><small>{item.detail}</small></span>
              <span aria-hidden="true">←</span>
            </button>
          )) : <div className="r2-live-empty"><strong>لا توجد قرارات استثنائية الآن</strong><p>لم يصنع إنجاز عناصر بديلة لملء الصفحة.</p></div>}
        </div>
      </section>
    </div>
  );
}

export function ConnectedR2Home({ navigate }: Readonly<{ navigate: Navigate }>) {
  const controller = useHomeDashboard();
  const [briefingOpen, setBriefingOpen] = useState(false);

  if (briefingOpen) return <ExecutiveBriefing navigate={navigate} close={() => setBriefingOpen(false)} />;
  if (controller.status === 'loading') return <LiveState title="جارٍ تجهيز مساحة العمل" body="تُقرأ المعاملات والمتابعات والعوائق والدفعات من مساحة العمل الحالية." />;
  if (controller.status === 'error' || !controller.snapshot) return <LiveState title="تعذر تجهيز الرئيسية" body={controller.errorMessage ?? 'تعذر قراءة مساحة العمل.'} retry={controller.retry} />;

  const snapshot = controller.snapshot;
  const priorityCount = snapshot.priorities.length;

  return (
    <div className="r2-screen r2-home-screen" data-screen="home" data-r2-live="home">
      <section className="r2-hero" aria-labelledby="r2-live-home-title">
        <div className="r2-hero__graphic" aria-hidden="true"><span /><span /><span /></div>
        <div className="r2-hero__copy">
          <p className="r2-eyebrow">مساحة العمل · بيانات حية</p>
          <h1 id="r2-live-home-title">ما الذي يحتاج انتباهك الآن؟</h1>
          <p>{snapshot.activeTransactions} معاملة نشطة · {snapshot.openFollowups} متابعة مفتوحة · {snapshot.openBlockers} عائق مفتوح.</p>
          <div className="r2-hero__actions">
            <button type="button" className="r2-shell-button r2-action r2-action--light" onClick={() => navigate('transactions')}>فتح المعاملات <span aria-hidden="true">←</span></button>
            <button type="button" className="r2-shell-button r2-action r2-action--ghost" onClick={() => setBriefingOpen(true)}>الملخص التنفيذي</button>
          </div>
        </div>
        <div className="r2-hero__signal"><span>الأولوية الآن</span><strong>{priorityCount ? `${priorityCount} ${priorityCount === 1 ? 'عنصر يحتاج قرارًا' : 'عناصر تحتاج قرارًا'}` : 'لا توجد أولوية حرجة'}</strong><small>{snapshot.criticalBlockers} عائق حرج · {snapshot.overdueFollowups} متابعة متأخرة</small></div>
      </section>

      <section className="r2-live-home__facts" aria-label="حقائق مساحة العمل">
        <div><span>نشطة</span><strong>{snapshot.activeTransactions}</strong><small>{snapshot.urgentTransactions} عاجلة</small></div>
        <div><span>متلكئة</span><strong>{snapshot.stalledTransactions}</strong><small>تحتاج تحديد الخطوة التالية</small></div>
        <div><span>المتبقي النشط</span><strong>{money(snapshot.finance.outstandingActive, snapshot.finance.precisionSafe)}</strong><small>من الدفعات المثبتة فقط</small></div>
      </section>

      <section className="r2-home-flow">
        <div className="r2-section-heading"><div><p className="r2-eyebrow">أولوية حقيقية</p><h2>أكمل من حيث يحتاج العمل</h2></div><button type="button" className="r2-shell-button r2-link-button" onClick={() => navigate('today')}>عرض اليوم <span aria-hidden="true">←</span></button></div>
        <div className="r2-focus-list">
          {snapshot.priorities.length ? snapshot.priorities.map((item, index) => (
            <button type="button" key={item.id} className="r2-focus-row" onClick={() => navigate('transactions')}>
              <span className="r2-focus-row__marker">{String(index + 1).padStart(2, '0')}</span>
              <span className="r2-focus-row__content"><strong>{item.title}</strong><small>{item.companyLabel ? `${item.companyLabel} · ${item.reason}` : item.reason}</small></span>
              <span aria-hidden="true">←</span>
            </button>
          )) : <div className="r2-live-empty"><strong>لا توجد أولوية استثنائية الآن</strong><p>يمكنك متابعة عمل اليوم أو فتح المعاملات دون عناصر مصطنعة.</p></div>}
        </div>
      </section>
    </div>
  );
}
