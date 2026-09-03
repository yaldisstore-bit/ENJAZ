import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';
import {
  MOBILE_BREAKPOINT_PX,
  MOBILE_TOUCH_TARGET_PX,
  MOBILE_VIEWPORT_META,
  supportsDynamicViewport,
  usesCoarsePointer,
} from '../../../core/mobile/mobileContract';
import { BottomSheet, Button, TextField } from '../../../design-system/components';

const hardeningRules = [
  'Viewport آمن مع viewport-fit=cover و interactive-widget=resizes-content',
  'دعم 100dvh مع fallback إلى 100vh',
  'Safe Areas للأعلى والأسفل والجانبين',
  'منع الانكسار الأفقي والتسرب خارج الشاشة',
  'Touch targets لا تقل عن 44px على المؤشر الخشن',
  'Keyboard-aware scroll margins للحقول',
  'Bottom Sheet محدود بارتفاع الشاشة وقابل للتمرير باللمس',
] as const;

export function MobileLabPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const coarsePointer = usesCoarsePointer();
  const dynamicViewport = supportsDynamicViewport();

  return (
    <main className="mobile-lab-page" id="main-content">
      <section className="mobile-lab-shell" aria-labelledby="mobile-lab-title">
        <header className="mobile-lab-hero">
          <div>
            <p className="mobile-lab-eyebrow">Phase 2.6 · Mobile / Android Hardening</p>
            <h1 id="mobile-lab-title">مختبر صلابة الهاتف</h1>
            <p className="mobile-lab-lead">
              سطح إثبات مخصص لاختبار Android والموبايل الحقيقي: الـViewport، لوحة المفاتيح، اللمس، Safe Area والـBottom Sheet.
            </p>
          </div>
          <span className="mobile-lab-phase">2.6</span>
        </header>

        <section className="mobile-lab-grid" aria-label="حالة بيئة الهاتف">
          <article className="mobile-lab-card">
            <p className="mobile-lab-label">Dynamic Viewport</p>
            <strong>{dynamicViewport ? '100dvh مدعوم' : 'Fallback 100vh فعال'}</strong>
            <p>يمنع تغير شريط المتصفح من قص المحتوى أو تمديد الصفحة بصورة غير مستقرة.</p>
          </article>
          <article className="mobile-lab-card">
            <p className="mobile-lab-label">Touch / Pointer</p>
            <strong>{coarsePointer ? 'مؤشر لمس خشن' : 'مؤشر دقيق أو بيئة سطح مكتب'}</strong>
            <p>الحد الأدنى لعناصر اللمس: {MOBILE_TOUCH_TARGET_PX}px.</p>
          </article>
          <article className="mobile-lab-card">
            <p className="mobile-lab-label">Mobile Breakpoint</p>
            <strong>{MOBILE_BREAKPOINT_PX}px</strong>
            <p>عند هذا النطاق تتحول الطبقات إلى سلوك مناسب للشاشات الضيقة.</p>
          </article>
        </section>

        <section className="mobile-lab-section" aria-labelledby="mobile-viewport-title">
          <div className="mobile-lab-section__copy">
            <p className="mobile-lab-kicker">Viewport & Safe Area</p>
            <h2 id="mobile-viewport-title">المساحة المرئية تبقى هي المصدر الحقيقي للتخطيط</h2>
            <p>العقد الرسمي المستخدم في الصفحة:</p>
            <code className="mobile-lab-code" dir="ltr">{MOBILE_VIEWPORT_META}</code>
          </div>
          <ul className="mobile-lab-checks">
            {hardeningRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </section>

        <section className="mobile-lab-section" aria-labelledby="mobile-keyboard-title">
          <div className="mobile-lab-section__copy">
            <p className="mobile-lab-kicker">لوحة المفاتيح</p>
            <h2 id="mobile-keyboard-title">اختبار الحقل عند فتح Keyboard</h2>
            <p>على الهاتف اضغط الحقل، اكتب عدة أسطر ثم أغلق لوحة المفاتيح. يجب ألا يختفِ الحقل خلفها أو تنكسر الصفحة أفقياً.</p>
          </div>
          <div className="mobile-lab-probe">
            <TextField
              id="mobile-keyboard-probe"
              label="اختبار لوحة المفاتيح"
              placeholder="اكتب هنا لاختبار Android keyboard"
              hint="الحقل يملك scroll margin ويستخدم حجم نص يمنع التكبير القسري."
              inputMode="text"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="mobile-lab-section" aria-labelledby="mobile-sheet-title">
          <div className="mobile-lab-section__copy">
            <p className="mobile-lab-kicker">Bottom Sheet</p>
            <h2 id="mobile-sheet-title">طبقة سفلية آمنة من شريط النظام</h2>
            <p>افتح الطبقة ثم اختبر التمرير والكتابة داخلها. يجب أن تبقى الأزرار والمحتوى فوق Safe Area السفلية.</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>فتح اختبار Bottom Sheet</Button>
        </section>

        <nav className="mobile-lab-nav" aria-label="تنقل مختبر الموبايل">
          <Link to={ROUTES.motion}>العودة إلى Motion 2.5</Link>
          <Link to={ROUTES.foundation}>حالة الأساس الهندسي</Link>
        </nav>
      </section>

      <BottomSheet
        id="mobile-hardening-sheet"
        open={sheetOpen}
        title="اختبار Android Bottom Sheet"
        description="اختبر التمرير، Safe Area ولوحة المفاتيح داخل الطبقة."
        onClose={() => setSheetOpen(false)}
        actions={<Button onClick={() => setSheetOpen(false)}>إغلاق الاختبار</Button>}
      >
        <div className="mobile-lab-sheet-content">
          <p>مرر داخل هذه الطبقة ثم افتح لوحة المفاتيح من الحقل أدناه. يجب ألا يخرج المحتوى من الشاشة أو يختفي زر الإغلاق تحت شريط النظام.</p>
          <TextField
            id="mobile-sheet-keyboard-probe"
            label="حقل داخل Bottom Sheet"
            placeholder="اختبار لوحة المفاتيح داخل الطبقة"
            hint="يجب أن يبقى هذا الحقل مرئياً وقابلاً للوصول أثناء ظهور Keyboard."
            inputMode="text"
            autoComplete="off"
          />
          <div className="mobile-lab-tall-probe" aria-label="منطقة اختبار التمرير">
            <p>منطقة تمرير طويلة متعمدة لاختبار السلوك على الشاشات القصيرة.</p>
            <p>استمر بالتمرير حتى النهاية وتأكد أن الحافة السفلية لا تتداخل مع أزرار Android.</p>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}
