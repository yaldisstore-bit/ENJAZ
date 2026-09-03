import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';

const principles = [
  'مشرق وحيوي من دون وهج أو ألوان فاقعة تؤذي العين.',
  'عمق واضح بالطبقات والظلال الهادئة، لا مستطيلات مسطحة متراكمة.',
  'العربية وRTL هما الأصل، وليسا معالجة لاحقة لاتجاه LTR.',
  'اللون يحمل معنى وظيفياً؛ النجاح والتحذير والخطر لا تستخدم كزينة.',
  'لا لون ولا ظل ولا نصف قطر عشوائي خارج نظام الهوية.',
] as const;

export function IdentityLabPage() {
  return (
    <main className="identity-page" id="main-content">
      <div className="identity-shell">
        <header className="identity-hero" aria-labelledby="identity-title">
          <div className="identity-brand-lockup">
            <div className="identity-brand-mark" aria-hidden="true">إ</div>
            <div>
              <p className="identity-kicker">ENJAZ · Visual Identity 2.1</p>
              <h1 id="identity-title">هوية إنجاز تبدأ من النظام، لا من الترقيع.</h1>
            </div>
          </div>
          <p className="identity-hero-copy">
            أساس بصري عربي فاخر يجمع هدوء منتجات Apple مع دقة الأنظمة الحديثة، ويمنح العمل اليومي طاقة واضحة من دون ضجيج بصري.
          </p>
        </header>

        <section className="identity-grid" aria-label="مختبر هوية إنجاز">
          <article className="identity-panel identity-panel--wide">
            <h2>لوحة الهوية</h2>
            <p className="identity-panel-intro">الألوان الأساسية محدودة ومقصودة، والسطوح الناعمة تمنحنا العمق من دون بطاقات فاقعة.</p>
            <div className="identity-swatch-grid">
              <div className="identity-swatch identity-swatch--brand"><span>إنجاز · أزرق عميق</span></div>
              <div className="identity-swatch identity-swatch--teal"><span>تركيز · فيروزي</span></div>
              <div className="identity-swatch identity-swatch--violet"><span>ذكاء · بنفسجي</span></div>
              <div className="identity-swatch identity-swatch--neutral"><span>سطح · محايد بارد</span></div>
            </div>
          </article>

          <article className="identity-panel">
            <h2>الكتابة العربية</h2>
            <p className="identity-panel-intro">تدرج واضح وقابل للقراءة على الهاتف قبل أي شاشة مكتبية.</p>
            <div className="identity-type-stack">
              <p className="identity-type-display">أنجز بوضوح</p>
              <p className="identity-type-title">المعاملات التي تحتاج انتباهك</p>
              <p className="identity-type-body">تظهر المعلومات المهمة أولاً، مع مسافات مريحة ونبرة بصرية مهنية غير جامدة.</p>
              <p className="identity-type-label">آخر تحديث · اليوم، ٢:٠٦ ص</p>
            </div>
          </article>

          <article className="identity-panel">
            <h2>العمق</h2>
            <p className="identity-panel-intro">ثلاث طبقات فقط تكفي لبناء هرم بصري قوي من دون ظلال رخيصة.</p>
            <div className="identity-depth-grid">
              <div className="identity-depth identity-depth--one">سطح</div>
              <div className="identity-depth identity-depth--two">مرتفع</div>
              <div className="identity-depth identity-depth--three">عائم</div>
            </div>
          </article>

          <article className="identity-panel">
            <h2>الحالات الدلالية</h2>
            <p className="identity-panel-intro">اللون يشرح الحالة ولا يستحوذ على الشاشة.</p>
            <div className="identity-status-grid">
              <div className="identity-status identity-status--success">مكتمل</div>
              <div className="identity-status identity-status--warning">يحتاج متابعة</div>
              <div className="identity-status identity-status--danger">متلكئ</div>
              <div className="identity-status identity-status--info">معلومة</div>
            </div>
          </article>

          <article className="identity-panel">
            <h2>الهندسة الناعمة</h2>
            <p className="identity-panel-intro">زوايا واضحة ومتدرجة، لا دوائر مبالغ بها ولا مربعات قاسية.</p>
            <div className="identity-radius-grid">
              <div className="identity-radius-sample identity-radius-sample--sm">صغير</div>
              <div className="identity-radius-sample identity-radius-sample--md">متوسط</div>
              <div className="identity-radius-sample identity-radius-sample--lg">بارز</div>
            </div>
          </article>

          <article className="identity-panel identity-panel--wide">
            <h2>دستور الهوية</h2>
            <ul className="identity-principles">
              {principles.map((principle) => <li key={principle}>{principle}</li>)}
            </ul>
          </article>
        </section>

        <footer className="identity-footer">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <div className="identity-footer-links"><Link to={ROUTES.tokens}>Design Tokens 2.2</Link><Link to={ROUTES.foundation}>العودة إلى حالة الأساس</Link></div>
        </footer>
      </div>
    </main>
  );
}
