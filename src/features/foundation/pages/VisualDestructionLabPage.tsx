import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';
import {
  MIXED_DIRECTION_STRESS_TEXT,
  VISUAL_DESTRUCTION_CONTRACT,
  createDenseTimeline,
  createLongCompanyName,
  createNotificationStorm,
} from '../../../core/quality/visualDestructionContract.ts';
import { Button, TextField } from '../../../design-system/components/index.ts';
import {
  ActionMenuPattern,
  CompanyPattern,
  FinanceSummaryPattern,
  FollowUpPattern,
  SearchResultPattern,
  SystemStatePattern,
  TimelinePattern,
  TransactionPattern,
} from '../../../design-system/patterns/index.ts';

const longCompanyName = createLongCompanyName();
const notificationStorm = createNotificationStorm();
const denseTimeline = createDenseTimeline();
const hugeMoney = VISUAL_DESTRUCTION_CONTRACT.hugeMoneyValue;

export function VisualDestructionLabPage() {
  return (
    <main className="destruction-lab-page" id="main-content">
      <div className="destruction-lab-shell">
        <header className="destruction-lab-hero">
          <div className="destruction-lab-hero__copy">
            <p className="destruction-lab-kicker type-label">ENJAZ · Visual Destruction & Quality Gate 2.8</p>
            <h1 className="type-display">نحاول كسر النظام قبل أن نسمح ببناء الشاشات.</h1>
            <p className="type-body-lg">
              هذه الصفحة ليست واجهة منتج. إنها سطح تعذيب مرئي يكدّس أسوأ الحالات المقصودة فوق Design System 1.0 لكشف القص، التسرب، ضعف التباين، انهيار RTL ومشاكل الهاتف قبل Phase 3.
            </p>
          </div>
          <div className="destruction-lab-score" aria-label="Phase 2.8 quality gate">
            <strong className="type-title-md text-numeric">2.8</strong>
            <span className="type-label">Destruction Gate</span>
            <span className="type-caption">Phase 3 locked</span>
          </div>
        </header>

        <section className="destruction-section" aria-labelledby="long-text-title">
          <div className="destruction-heading">
            <div><p className="type-label">Long content</p><h2 id="long-text-title" className="type-title-md">200+ حرف وRTL/LTR مختلط</h2></div>
            <span className="destruction-chip type-caption text-numeric">{longCompanyName.length} chars</span>
          </div>
          <div className="destruction-grid destruction-grid--two">
            <CompanyPattern
              name={longCompanyName}
              location="العراق · بغداد · المنصور · محلة 605 · زقاق 13 · دار 75"
              activeTransactions={987}
              stalledTransactions={42}
              receivableLabel="8,888,888,888,888,888 IQD"
              action={<Button variant="secondary">عرض الشركة ذات الاسم الطويل</Button>}
            />
            <div className="destruction-stack">
              <SearchResultPattern
                kind="company"
                title={MIXED_DIRECTION_STRESS_TEXT}
                subtitle={longCompanyName}
                reference="REF-2026-998877-ENJAZ-VERY-LONG-REFERENCE"
                meta={['Arabic + English', '+964 770 123 4567', '8,888,888,888 IQD']}
                statusLabel="مختلط الاتجاه"
                statusTone="warning"
              />
              <SystemStatePattern
                tone="warning"
                title="اختبار التفاف النص لا الاختصار الوهمي"
                description={longCompanyName}
                detail={MIXED_DIRECTION_STRESS_TEXT}
              />
            </div>
          </div>
        </section>

        <section className="destruction-section" aria-labelledby="money-title">
          <div className="destruction-heading">
            <div><p className="type-label">Financial overflow</p><h2 id="money-title" className="type-title-md">قيم مالية قريبة من حد Number الآمن</h2></div>
            <span className="destruction-chip type-caption">No scientific notation</span>
          </div>
          <FinanceSummaryPattern
            total={hugeMoney}
            paid={4_444_444_444_444_444}
            outstanding={4_444_444_444_444_444}
            overdue={888_888_888_888_888}
            periodLabel="اختبار مالي تدميري · 2026/09"
            action={<Button variant="secondary">فتح المصدر المالي</Button>}
          />
        </section>

        <section className="destruction-section" aria-labelledby="storm-title">
          <div className="destruction-heading">
            <div><p className="type-label">Notification storm</p><h2 id="storm-title" className="type-title-md">20 تنبيهاً متراكماً دون انهيار الكثافة</h2></div>
            <span className="destruction-chip type-caption text-numeric">{notificationStorm.length}/20</span>
          </div>
          <ol className="destruction-notification-storm" aria-label="اختبار عشرين تنبيهاً">
            {notificationStorm.map((notification) => (
              <li key={notification.id} className={notification.urgent ? 'destruction-notification destruction-notification--urgent' : 'destruction-notification'}>
                <span className="destruction-notification__dot" aria-hidden="true" />
                <span className="destruction-notification__copy">
                  <strong className="type-body">{notification.title}</strong>
                  <span className="type-caption text-numeric">{notification.meta}</span>
                </span>
                <Button variant={notification.urgent ? 'danger' : 'ghost'}>فتح</Button>
              </li>
            ))}
          </ol>
        </section>

        <section className="destruction-section" aria-labelledby="viewport-title">
          <div className="destruction-heading">
            <div><p className="type-label">Mobile torture</p><h2 id="viewport-title" className="type-title-md">320px + لوحة مفاتيح مفتوحة + محتوى كثيف</h2></div>
            <span className="destruction-chip type-caption text-numeric">320 × 360</span>
          </div>
          <div className="destruction-viewport-grid">
            <div className="destruction-device destruction-device--narrow" data-viewport="320">
              <p className="destruction-device__label type-caption">Narrow viewport · 320px</p>
              <TransactionPattern
                title="معاملة باسم شديد الطول لا يجوز أن يهرب خارج الشاشة أو يخفي الإجراء الرئيسي"
                reference="TRX-2026-VERY-LONG-0000009988"
                company={longCompanyName}
                state="stalled"
                progress={99}
                stage="مرحلة ذات تسمية طويلة جداً لاختبار الالتفاف"
                dueLabel="متأخرة 999 يوماً"
                risk="critical"
                density="compact"
              />
              <FollowUpPattern
                title="متابعة حرجة على شاشة شديدة الضيق"
                dateLabel="03/09/2026 · 23:59"
                state="overdue"
                entityLabel={longCompanyName}
                note={MIXED_DIRECTION_STRESS_TEXT}
                density="compact"
              />
            </div>
            <div className="destruction-device destruction-device--keyboard" data-keyboard="open">
              <p className="destruction-device__label type-caption">Keyboard-open viewport · 360px height</p>
              <TextField
                id="destruction-keyboard-field"
                label="حقل يجب أن يبقى قابلاً للوصول فوق لوحة المفاتيح"
                defaultValue="نص طويل لاختبار Android keyboard + visual viewport"
                hint="الاختبار يتحقق من scroll-margin وdvh والعقد الموروث من 2.6."
              />
              <TextField
                id="destruction-reference-field"
                label="مرجع مختلط الاتجاه"
                defaultValue="REF-2026-998877 / +964 770 123 4567"
              />
              <Button variant="primary">إجراء يبقى قابلاً للوصول</Button>
            </div>
          </div>
        </section>

        <section className="destruction-section" aria-labelledby="timeline-title">
          <div className="destruction-heading">
            <div><p className="type-label">Density</p><h2 id="timeline-title" className="type-title-md">Timeline طويل بـ24 حدثاً</h2></div>
            <span className="destruction-chip type-caption text-numeric">{denseTimeline.length} events</span>
          </div>
          <div className="destruction-timeline-frame">
            <TimelinePattern title="سجل نشاط تدميري" items={denseTimeline} density="compact" />
          </div>
        </section>

        <section className="destruction-section" aria-labelledby="states-title">
          <div className="destruction-heading">
            <div><p className="type-label">Failure surfaces</p><h2 id="states-title" className="type-title-md">Offline / Error / Conflict / Recovery معاً</h2></div>
            <span className="destruction-chip type-caption">No happy-path bias</span>
          </div>
          <div className="destruction-grid destruction-grid--four">
            <SystemStatePattern tone="offline" title="انقطع الاتصال" description="لا نفترض نجاح الكتابة أثناء غياب الشبكة." />
            <SystemStatePattern tone="error" title="فشلت العملية" description="خطأ صريح مع بقاء التخطيط ثابتاً." primaryAction={{ label: 'إعادة المحاولة' }} />
            <SystemStatePattern tone="conflict" title="تعارض كتابة" description="هناك نسخة أحدث ولا يسمح بالاستبدال الصامت." primaryAction={{ label: 'مقارنة' }} />
            <SystemStatePattern tone="recovery" title="استعادة الاتصال" description="نراجع العمليات غير المحسومة قبل إعلان النجاح." />
          </div>
        </section>

        <section className="destruction-section" aria-labelledby="focus-title">
          <div className="destruction-heading">
            <div><p className="type-label">Accessibility & focus</p><h2 id="focus-title" className="type-title-md">مسار تركيز ولوحة مفاتيح دون مصائد</h2></div>
            <span className="destruction-chip type-caption">Zoom stays enabled</span>
          </div>
          <div className="destruction-focus-probe">
            <Button variant="primary">أول إجراء</Button>
            <Button variant="secondary">ثاني إجراء</Button>
            <TextField id="destruction-focus-field" label="حقل في مسار التركيز" placeholder="اكتب هنا" />
            <ActionMenuPattern items={[
              { id: 'focus-a', label: 'إجراء اعتيادي', description: 'زر native داخل القائمة', icon: '◉' },
              { id: 'focus-b', label: 'إجراء خطير', description: 'يبقى واضحاً عند التركيز', icon: '!', tone: 'danger' },
            ]} />
            <Link className="destruction-focus-link" to={ROUTES.patterns}>العودة إلى Pattern Library 2.7</Link>
          </div>
        </section>

        <section className="destruction-section" aria-labelledby="contrast-title">
          <div className="destruction-heading">
            <div><p className="type-label">Contrast & motion</p><h2 id="contrast-title" className="type-title-md">التباين وReduced Motion</h2></div>
            <span className="destruction-chip type-caption">Token governed</span>
          </div>
          <div className="destruction-grid destruction-grid--two">
            <SystemStatePattern tone="success" title="Reduced Motion محفوظ" description="عند طلب تقليل الحركة، تلغى الحركة غير الضرورية وتبقى المعاني والحالات واضحة." />
            <SystemStatePattern tone="empty" title="Dark mode غير مفعّل في 2.8" description="لا نخترع وضعاً داكناً للاختبار. شرط dark/light يطبق فقط إذا كان كلا الوضعين مدعومين فعلياً." />
          </div>
        </section>

        <footer className="destruction-lab-footer type-label">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <nav aria-label="روابط بوابة الجودة">
            <Link to={ROUTES.patterns}>Patterns 2.7</Link>
            <Link to={ROUTES.mobile}>Mobile 2.6</Link>
            <Link to={ROUTES.foundation}>حالة الأساس</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
