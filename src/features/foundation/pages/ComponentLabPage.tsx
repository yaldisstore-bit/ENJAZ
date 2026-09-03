import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Dialog,
  EmptyState,
  IconButton,
  ProgressBar,
  SelectField,
  Skeleton,
  Switch,
  Tabs,
  TextAreaField,
  TextField,
} from '../../../design-system/components/index.ts';

const transactionTabs = [
  { id: 'active', label: 'جارية', count: 18 },
  { id: 'stalled', label: 'متلكئة', count: 4 },
  { id: 'done', label: 'منجزة', count: 31 },
] as const;

const priorityOptions = [
  { value: 'normal', label: 'اعتيادية' },
  { value: 'high', label: 'مرتفعة' },
  { value: 'critical', label: 'حرجة' },
] as const;

const longCompanyName = 'تاج الروان للتجارة والمقاولات والانتاج الزراعي والحيواني وتجارة السيارات والمعدات والادوات الاحتياطية محدودة المسؤولية';

export function ComponentLabPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [verified, setVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  return (
    <main className="component-lab-page" id="main-content">
      <div className="component-lab-shell">
        <header className="component-lab-hero">
          <p className="component-lab-kicker type-label">ENJAZ · Core Components 2.4</p>
          <h1 className="type-display">لغة إنجاز البصرية أصبحت مكونات حقيقية قابلة للمس.</h1>
          <p className="type-body-lg">
            هذا المختبر يضغط على الحالات الأساسية قبل بناء الشاشات: أزرار، حقول، بطاقات، حالات، تبويبات، خيارات، نوافذ وBottom Sheets.
          </p>
        </header>

        <div className="component-lab-grid">
          <section className="component-lab-section component-lab-section--wide" aria-labelledby="buttons-title">
            <h2 className="type-title-sm" id="buttons-title">الأزرار والإجراءات</h2>
            <p className="type-body">كل إجراء يملك حالة ولمساً واضحاً، ولا يوجد Icon Button بلا اسم وصول.</p>
            <div className="component-lab-row">
              <Button>إجراء رئيسي</Button>
              <Button variant="secondary">إجراء ثانوي</Button>
              <Button variant="danger">إجراء خطر</Button>
              <Button variant="ghost">إجراء هادئ</Button>
              <Button loading>جارٍ الحفظ</Button>
              <Button disabled>غير متاح</Button>
              <IconButton label="إضافة معاملة" icon="+" tone="brand" />
              <IconButton label="حذف" icon="×" tone="danger" />
            </div>
          </section>

          <section className="component-lab-section component-lab-section--wide" aria-labelledby="cards-title">
            <h2 className="type-title-sm" id="cards-title">البطاقات والعمق</h2>
            <div className="component-lab-card-grid">
              <Card>
                <CardHeader title="المعاملات اليوم" subtitle="مؤشر تشغيلي" aside={<Badge tone="brand">مباشر</Badge>} />
                <CardBody>
                  <div className="component-lab-card-metric">
                    <strong className="type-title-md text-numeric">24</strong>
                    <span className="type-caption">7 تحتاج متابعة</span>
                  </div>
                </CardBody>
                <CardFooter><Button variant="secondary">فتح المركز</Button></CardFooter>
              </Card>

              <Card tone="raised">
                <CardHeader title={longCompanyName} subtitle="اختبار اسم شركة طويل" aside={<Badge tone="success">نشطة</Badge>} />
                <CardBody><p className="text-clamp-2">بطاقة حقيقية يجب أن تبقى داخل عرض الهاتف حتى عند وجود اسم طويل جداً وبيانات إضافية.</p></CardBody>
              </Card>

              <Card tone="prominent">
                <CardHeader title="التحصيل المالي" subtitle="هذا الشهر" aside={<Badge tone="warning">3 مستحقات</Badge>} />
                <CardBody><strong className="type-title-md text-numeric">12,450,000 IQD</strong></CardBody>
                <ProgressBar value={72} label="نسبة التحصيل" />
              </Card>
            </div>
          </section>

          <section className="component-lab-section" aria-labelledby="badges-title">
            <h2 className="type-title-sm" id="badges-title">الحالات</h2>
            <div className="component-lab-row">
              <Badge>محايد</Badge>
              <Badge tone="brand">رئيسي</Badge>
              <Badge tone="success">مكتمل</Badge>
              <Badge tone="warning">تحذير</Badge>
              <Badge tone="danger">متلكئ</Badge>
              <Badge tone="info">معلومة</Badge>
            </div>
          </section>

          <section className="component-lab-section" aria-labelledby="tabs-title">
            <h2 className="type-title-sm" id="tabs-title">التبويبات</h2>
            <Tabs id="transaction-tabs" label="حالات المعاملات" items={transactionTabs} selectedId={activeTab} onChange={setActiveTab} />
            <p className="type-caption">الحالة المختارة: <bdi className="text-code">{activeTab}</bdi></p>
          </section>

          <section className="component-lab-section component-lab-section--wide" aria-labelledby="fields-title">
            <h2 className="type-title-sm" id="fields-title">الحقول والتحقق</h2>
            <div className="component-lab-field-grid">
              <TextField id="company-name" label="اسم الشركة" placeholder="اكتب الاسم الرسمي" hint="يُحفظ الاسم كما في وثائق الشركة." />
              <TextField id="phone" label="رقم الهاتف" type="tel" placeholder="+964 7xx xxx xxxx" inputMode="tel" />
              <SelectField id="priority" label="الأولوية" options={priorityOptions} defaultValue="high" />
              <TextField id="receipt" label="رقم الوصل" defaultValue="RCPT-2026-114" error="رقم الوصل مستخدم مسبقاً." />
              <TextAreaField id="note" label="ملاحظة المتابعة" placeholder="اكتب الملاحظة..." hint="ستظهر في التسلسل الزمني للمعاملة." />
            </div>
          </section>

          <section className="component-lab-section" aria-labelledby="choices-title">
            <h2 className="type-title-sm" id="choices-title">الخيارات</h2>
            <div className="component-lab-stack">
              <Switch id="notify-switch" label="إشعارات المتابعة" description="تنبيه عند اقتراب موعد المعاملة." checked={notificationsOn} onChange={setNotificationsOn} />
              <Checkbox id="verify-check" label="تمت مراجعة الوثائق" description="تأكيد يدوي قبل الإرسال." checked={verified} onChange={setVerified} />
            </div>
          </section>

          <section className="component-lab-section" aria-labelledby="overlays-title">
            <h2 className="type-title-sm" id="overlays-title">النوافذ والـBottom Sheet</h2>
            <div className="component-lab-row">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>فتح Dialog</Button>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>فتح Sheet</Button>
            </div>
          </section>

          <section className="component-lab-section component-lab-section--wide" aria-labelledby="feedback-title">
            <h2 className="type-title-sm" id="feedback-title">التحميل والحالات الفارغة</h2>
            <div className="component-lab-feedback-grid">
              <div className="component-lab-skeleton-stack" aria-label="مثال تحميل">
                <div className="component-lab-skeleton-row">
                  <Skeleton variant="circle" />
                  <div className="component-lab-skeleton-lines"><Skeleton /><Skeleton /></div>
                </div>
                <Skeleton variant="block" />
              </div>
              <EmptyState
                title="لا توجد معاملات متلكئة"
                description="هذه حالة جيدة. ستظهر هنا المعاملات التي تحتاج تدخلاً عند وجودها."
                action={<Button variant="secondary">عرض كل المعاملات</Button>}
              />
            </div>
          </section>
        </div>

        <footer className="component-lab-footer type-label">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <nav aria-label="روابط مختبر الأساس">
            <Link to={ROUTES.typography}>Typography 2.3</Link>
            <Link to={ROUTES.tokens}>Tokens 2.2</Link>
            <Link to={ROUTES.foundation}>حالة الأساس</Link>
          </nav>
        </footer>
      </div>

      <Dialog
        id="save-dialog"
        open={dialogOpen}
        title="اعتماد التغييرات"
        description="مثال Dialog قابل للإغلاق بزر Escape أو زر الإغلاق."
        onClose={() => setDialogOpen(false)}
        actions={<><Button onClick={() => setDialogOpen(false)}>اعتماد</Button><Button variant="ghost" onClick={() => setDialogOpen(false)}>إلغاء</Button></>}
      >
        <p className="component-lab-dialog-copy">سيُستخدم هذا النمط لاحقاً للتأكيدات المهمة دون تحويل كل إجراء إلى نافذة مزعجة.</p>
      </Dialog>

      <BottomSheet
        id="quick-sheet"
        open={sheetOpen}
        title="إجراءات المعاملة"
        description="نمط مهيأ للهاتف وقابل للتوسع في مرحلة Mobile Hardening."
        onClose={() => setSheetOpen(false)}
        actions={<Button onClick={() => setSheetOpen(false)}>تم</Button>}
      >
        <p className="component-lab-sheet-copy">فتح الخزنة، إضافة متابعة، تسجيل دفعة، أو مشاركة تقرير ستستخدم Sheet موحدة بدلاً من واجهات متفرقة.</p>
      </BottomSheet>
    </main>
  );
}
