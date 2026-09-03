import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';
import { Button, IconButton } from '../../../design-system/components/index.ts';
import { MotionReveal } from '../../../design-system/motion/index.ts';
import {
  ActionMenuPattern,
  AutomationPattern,
  CommandModulePattern,
  CompanyPattern,
  ContactPattern,
  FinanceSummaryPattern,
  FollowUpPattern,
  PatternSkeleton,
  RiskSignalPattern,
  SearchResultPattern,
  SystemStatePattern,
  TimelinePattern,
  TransactionPattern,
  WorkflowPattern,
} from '../../../design-system/patterns/index.ts';

const longCompanyName = 'تاج الروان للتجارة والمقاولات والانتاج الزراعي والحيواني وتجارة السيارات والمعدات والادوات الاحتياطية محدودة المسؤولية';

const timelineItems = [
  { id: 't1', title: 'تم استلام كتاب الدائرة', meta: '10:42', description: 'أضيف المستند إلى الخزنة وربط بالمعاملة.', tone: 'success' },
  { id: 't2', title: 'انتقلت المعاملة إلى التدقيق', meta: '09:18', description: 'المرحلة الحالية بانتظار مراجعة المستمسكات.', tone: 'brand' },
  { id: 't3', title: 'تم تسجيل متابعة', meta: 'أمس', description: 'موعد المتابعة القادم خلال يومين.', tone: 'warning' },
] as const;

const workflowSteps = [
  { id: 'w1', label: 'فتح المعاملة', state: 'completed', meta: 'مكتملة' },
  { id: 'w2', label: 'تدقيق الوثائق', state: 'completed', meta: 'مكتملة' },
  { id: 'w3', label: 'مراجعة الدائرة', state: 'current', meta: 'المرحلة الحالية' },
  { id: 'w4', label: 'استلام القرار', state: 'upcoming', meta: 'قادمة' },
] as const;

const blockedWorkflowSteps = [
  { id: 'b1', label: 'تسجيل الطلب', state: 'completed' },
  { id: 'b2', label: 'تسديد الرسم', state: 'blocked', meta: 'مطلوب إجراء مالي' },
  { id: 'b3', label: 'الإرسال', state: 'upcoming' },
] as const;

export function PatternLabPage() {
  return (
    <main className="pattern-lab-page" id="main-content">
      <div className="pattern-lab-shell">
        <MotionReveal preset="rise">
          <header className="pattern-lab-hero">
            <div className="pattern-lab-hero__copy">
              <p className="pattern-lab-kicker type-label">ENJAZ · Premium Pattern Library 2.7</p>
              <h1 className="type-display">هنا تتحول لغة إنجاز إلى أنماط تشغيلية حقيقية.</h1>
              <p className="type-body-lg">
                ليست شاشات كاملة. هذه هي القطع المركبة التي ستبني كل شاشة لاحقاً بنفس العمق، الحالة، الحركة، RTL وسلوك الهاتف.
              </p>
            </div>
            <div className="pattern-lab-hero__seal" aria-label="Phase 2.7">
              <span className="type-label">Pattern System</span>
              <strong className="type-title-md text-numeric">2.7</strong>
              <span className="type-caption">Domain-aware</span>
            </div>
          </header>
        </MotionReveal>

        <section className="pattern-lab-section" aria-labelledby="entities-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Entities</p><h2 id="entities-title" className="type-title-md">المعاملات والشركات والأشخاص</h2></div>
            <span className="pattern-lab-heading__count text-numeric">01</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--three">
            <TransactionPattern
              title="تعديل عقد وتثبيت مدير مفوض"
              reference="TRX-2026-00481"
              company={longCompanyName}
              state="active"
              progress={64}
              stage="مراجعة المسجل"
              dueLabel="متابعة بعد يومين"
              owner="أحمد"
              risk="medium"
              followUpLabel="05/09/2026"
              action={<Button variant="secondary">فتح 360°</Button>}
            />
            <TransactionPattern
              title="استحصال قرار التأسيس"
              reference="TRX-2026-00419"
              company="روز بغداد لإدارة واستثمار المطاعم محدودة المسؤولية"
              state="stalled"
              progress={38}
              stage="انتظار إجراء"
              dueLabel="متأخرة 4 أيام"
              risk="critical"
              action={<Button variant="danger">معالجة التلكؤ</Button>}
            />
            <CompanyPattern
              name={longCompanyName}
              location="بغداد · المنصور"
              activeTransactions={12}
              stalledTransactions={2}
              receivableLabel="18,500,000 IQD"
              action={<Button variant="secondary">عرض الشركة</Button>}
            />
            <ContactPattern
              name="سلام عادل إبراهيم"
              role="مدير مفوض"
              company="روز بغداد لإدارة واستثمار المطاعم وخدمات الضيافة والخدمات العامة محدودة المسؤولية"
              phone="+964 770 123 4567"
              openItems={4}
              status="attention"
              action={<Button variant="ghost">فتح الملف</Button>}
            />
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="finance-risk-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Money & Risk</p><h2 id="finance-risk-title" className="type-title-md">المالية والمخاطر والأولوية</h2></div>
            <span className="pattern-lab-heading__count text-numeric">02</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--two">
            <FinanceSummaryPattern
              total={1250000000}
              paid={875500000}
              outstanding={374500000}
              overdue={82500000}
              periodLabel="أيلول 2026"
              action={<Button variant="secondary">فتح المالية</Button>}
            />
            <div className="pattern-lab-stack">
              <RiskSignalPattern
                level="critical"
                title="معاملة معرضة للتوقف"
                entityLabel="TRX-2026-00419 · روز بغداد"
                reason="المتابعة متأخرة والرسم المطلوب لم يسجل حتى الآن. استمرار التأخير سيؤثر على الموعد المستهدف."
                nextAction="تسجيل الدفعة ثم إعادة جدولة المتابعة."
                action={<IconButton label="فتح الإجراء المقترح" icon="←" tone="danger" />}
              />
              <RiskSignalPattern
                level="low"
                title="المسار مستقر"
                reason="لا توجد إشارات حرجة، وجميع المتابعات القادمة ضمن المدة."
              />
            </div>
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="activity-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Activity</p><h2 id="activity-title" className="type-title-md">التسلسل الزمني والمتابعات</h2></div>
            <span className="pattern-lab-heading__count text-numeric">03</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--two">
            <TimelinePattern items={timelineItems} />
            <div className="pattern-lab-stack">
              <FollowUpPattern
                title="مراجعة قسم الشركات"
                dateLabel="05/09/2026 · 10:30"
                state="upcoming"
                entityLabel="شعار بابل للتجارة والمقاولات العامة والاستثمار والتطوير العقاري محدودة المسؤولية"
                owner="مصطفى"
                action={<Button variant="secondary">فتح</Button>}
              />
              <FollowUpPattern
                title="استلام كتاب الموافقة"
                dateLabel="30/08/2026"
                state="overdue"
                entityLabel="معاملة TRX-2026-00381"
                note="تجاوز الموعد المخطط ويحتاج إجراء اليوم."
                action={<Button variant="danger">معالجة</Button>}
              />
              <FollowUpPattern
                title="تأكيد استلام الوثائق"
                dateLabel="01/09/2026"
                state="completed"
                entityLabel="قمر السلطان للتجارة العامة وإدارة واستثمار المطاعم محدودة المسؤولية"
              />
            </div>
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="workflow-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Workflow & Automation</p><h2 id="workflow-title" className="type-title-md">المسارات والأتمتة</h2></div>
            <span className="pattern-lab-heading__count text-numeric">04</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--two">
            <WorkflowPattern title="تأسيس شركة" steps={workflowSteps} action={<Button variant="secondary">تفاصيل المسار</Button>} />
            <div className="pattern-lab-stack">
              <WorkflowPattern title="حجز نطاق" steps={blockedWorkflowSteps} density="compact" />
              <AutomationPattern
                title="تنبيه المتابعة المتأخرة"
                trigger="تجاوز موعد المتابعة ولم تُغلق"
                outcome="أنشئ إشعاراً عالي الأولوية في صندوق العمل"
                state="active"
                lastRun="03/09/2026 · 11:40"
                action={<Button variant="ghost">إدارة القاعدة</Button>}
              />
              <AutomationPattern
                title="مطابقة دفعة ناقصة"
                trigger="وصول دفعة دون رقم وصل صالح"
                outcome="أوقف الإكمال واطلب مراجعة بشرية"
                state="error"
                density="compact"
              />
            </div>
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="command-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Command Center</p><h2 id="command-title" className="type-title-md">وحدات مركز السيطرة</h2></div>
            <span className="pattern-lab-heading__count text-numeric">05</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--two">
            <CommandModulePattern
              title="العمل الذي يحتاجك الآن"
              description="تجميع العناصر المتأخرة والحرجة والمتوقفة دون إنشاء منطق أعمال ثانٍ."
              metrics={[{ label: 'حرجة', value: 3, tone: 'danger' }, { label: 'اليوم', value: 11, tone: 'warning' }, { label: 'مستقرة', value: 28, tone: 'success' }]}
            />
            <CommandModulePattern
              title="الموقف المالي"
              description="ملخص تشغيلي يقرأ من المصدر المالي نفسه وليس من أرقام واجهة منفصلة."
              icon="◈"
              metrics={[{ label: 'مستحقات', value: 8, tone: 'warning' }, { label: 'دفعات اليوم', value: 5, tone: 'success' }]}
            />
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="search-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Discovery & Actions</p><h2 id="search-title" className="type-title-md">البحث والإجراءات السياقية</h2></div>
            <span className="pattern-lab-heading__count text-numeric">06</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--two">
            <div className="pattern-lab-stack">
              <SearchResultPattern kind="transaction" title="تعديل عقد وتثبيت مدير مفوض" subtitle={longCompanyName} reference="TRX-2026-00481" meta={['جارية', 'مراجعة المسجل']} statusLabel="متابعة" statusTone="warning" />
              <SearchResultPattern kind="company" title={longCompanyName} subtitle="بغداد · المنصور" meta={['12 معاملة', '2 متلكئة']} statusLabel="نشطة" statusTone="success" density="compact" />
              <SearchResultPattern kind="document" title="شهادة تأسيس.pdf" subtitle="مرتبطة بالشركة والمعاملة" reference="DOC-00219" meta={['PDF', '3 صفحات']} />
            </div>
            <ActionMenuPattern
              items={[
                { id: 'a1', label: 'فتح العرض 360°', description: 'كل سياق المعاملة في مكان واحد', icon: '◉' },
                { id: 'a2', label: 'إضافة متابعة', description: 'إنشاء موعد متابعة مرتبط', icon: '+' },
                { id: 'a3', label: 'تسجيل دفعة', description: 'يذهب إلى المصدر المالي المعتمد', icon: '₫' },
                { id: 'a4', label: 'أرشفة المعاملة', description: 'تغيير دورة الحياة بعد التأكيد', icon: '⌑', tone: 'danger' },
              ]}
            />
          </div>
        </section>

        <section className="pattern-lab-section" aria-labelledby="states-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">System States</p><h2 id="states-title" className="type-title-md">الحالات الفارغة والخطأ والتعارض والاتصال</h2></div>
            <span className="pattern-lab-heading__count text-numeric">07</span>
          </div>
          <div className="pattern-lab-grid pattern-lab-grid--three">
            <SystemStatePattern tone="empty" title="لا توجد متابعات متأخرة" description="لن نملأ المساحة ببطاقة زائفة. تظهر هنا فقط العناصر التي تحتاج تدخلاً." />
            <SystemStatePattern tone="success" title="تم حفظ التغيير" description="تمت مزامنة البيانات مع المصدر المعتمد." detail="REF · EVT-2026-9081" />
            <SystemStatePattern tone="warning" title="المعلومة تحتاج مراجعة" description="القيمة المستخرجة لا تطابق البيانات المؤكدة." primaryAction={{ label: 'مراجعة' }} />
            <SystemStatePattern tone="error" title="تعذر إتمام العملية" description="لم نعتبر العملية ناجحة ولم نخف الخطأ." primaryAction={{ label: 'إعادة المحاولة' }} secondaryAction={{ label: 'إغلاق' }} />
            <SystemStatePattern tone="conflict" title="هناك تعديل أحدث" description="لا يمكن الكتابة فوق نسخة أحدث بصمت." primaryAction={{ label: 'مقارنة النسخ' }} />
            <SystemStatePattern tone="offline" title="أنت غير متصل" description="يمكنك قراءة ما هو متاح، لكن الكتابة ستنتظر عودة الاتصال." />
            <SystemStatePattern tone="recovery" title="عاد الاتصال" description="نعيد مزامنة الحالة ونراجع نتائج العمليات غير المحسومة." />
            <SystemStatePattern tone="loading" title="جارٍ تحضير البيانات" description="يستمر الهيكل البصري مستقراً أثناء التحميل." />
            <PatternSkeleton rows={4} />
          </div>
        </section>

        <section className="pattern-lab-section pattern-lab-section--compact" aria-labelledby="compact-title">
          <div className="pattern-lab-heading">
            <div><p className="type-label">Compact Mobile</p><h2 id="compact-title" className="type-title-md">الكثافة العالية على الهاتف</h2></div>
            <span className="pattern-lab-heading__count text-numeric">08</span>
          </div>
          <div className="pattern-lab-mobile-frame">
            <TransactionPattern
              title="معاملة مختصرة للاختبار"
              reference="TRX-2026-09999"
              company={longCompanyName}
              state="active"
              progress={81}
              stage="التدقيق النهائي"
              dueLabel="اليوم"
              density="compact"
              risk="low"
            />
            <FollowUpPattern title="مراجعة عاجلة" dateLabel="اليوم · 14:00" state="upcoming" entityLabel={longCompanyName} density="compact" />
            <PatternSkeleton rows={2} compact />
          </div>
        </section>

        <footer className="pattern-lab-footer type-label">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <nav aria-label="روابط مختبرات النظام">
            <Link to={ROUTES.mobile}>Mobile 2.6</Link>
            <Link to={ROUTES.motion}>Motion 2.5</Link>
            <Link to={ROUTES.components}>Components 2.4</Link>
            <Link to={ROUTES.foundation}>حالة الأساس</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
