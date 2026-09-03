import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';
import { bidiAttributes } from '../../../design-system/typography/typographyContract.ts';

const longCompanyName = 'شركة إنجاز للتجارة العامة والمقاولات والاستثمار والتطوير العقاري والخدمات الإدارية محدودة المسؤولية';

const principles = [
  'العربية هي الاتجاه واللغة الافتراضية، وكل استثناء LTR معزول ولا يغيّر اتجاه محيطه.',
  'لا يوجد نص منتج أصغر من 13px، والنص الأساسي يبدأ من 16px.',
  'العناوين العربية لا تستخدم letter-spacing سالباً حتى لا تتضرر أشكال الحروف واتصالها.',
  'الأرقام والمبالغ والتواريخ والهواتف والمراجع تُعزل بصرياً حتى تبقى قابلة للقراءة والنسخ.',
  'الأسماء الطويلة تلتف أو تُقص بعقد صريح، ولا يُسمح لها بكسر البطاقة أو عرض الشاشة.',
  'كل القياسات والأوزان وارتفاعات السطر تأتي من Typography Tokens فقط.',
] as const;

export function TypographyLabPage() {
  return (
    <main className="type-lab-page" id="main-content">
      <div className="type-lab-shell">
        <header className="type-lab-hero">
          <p className="type-label type-lab-kicker">ENJAZ · Typography & RTL 2.3</p>
          <h1 className="type-display">العربية ليست ترجمة للواجهة؛ هي أساس بنائها.</h1>
          <p className="type-body-lg type-lab-intro">
            هذا المختبر يثبت السلم الطباعي، اتجاه النص، عزل الأرقام، وسلوك المحتوى الطويل قبل بناء مكونات إنجاز الفعلية.
          </p>
        </header>

        <section className="type-lab-grid" aria-label="مختبر الخطوط والاتجاه">
          <article className="type-lab-panel type-lab-panel--wide">
            <p className="type-label type-lab-section-label">السلم الطباعي</p>
            <div className="type-lab-scale">
              <div><span className="type-caption">Caption · 13px minimum</span><strong className="type-caption">آخر تحديث قبل 3 دقائق</strong></div>
              <div><span className="type-caption">Label</span><strong className="type-label">معاملة ذات أولوية مرتفعة</strong></div>
              <div><span className="type-caption">Body</span><p className="type-body">نص واضح للقراءة اليومية الطويلة دون ضغط بصري أو فراغ مبالغ فيه.</p></div>
              <div><span className="type-caption">Subtitle</span><strong className="type-subtitle">ملخص حركة الشركة لهذا الأسبوع</strong></div>
              <div><span className="type-caption">Title small</span><h2 className="type-title-sm">المعاملات الجارية</h2></div>
              <div><span className="type-caption">Title medium</span><h2 className="type-title-md">مركز العمليات</h2></div>
              <div><span className="type-caption">Title large</span><h2 className="type-title-lg">صباح الخير، ماذا ننجز اليوم؟</h2></div>
            </div>
          </article>

          <article className="type-lab-panel">
            <p className="type-label type-lab-section-label">عزل البيانات LTR</p>
            <dl className="type-lab-facts">
              <div><dt>المبلغ</dt><dd><bdi {...bidiAttributes('money')}>1,250,000,000 IQD</bdi></dd></div>
              <div><dt>التاريخ</dt><dd><bdi {...bidiAttributes('date')}>2026/09/03</bdi></dd></div>
              <div><dt>الهاتف</dt><dd><bdi {...bidiAttributes('phone')}>+964 770 123 4567</bdi></dd></div>
              <div><dt>المرجع</dt><dd><bdi {...bidiAttributes('reference')}>ENJAZ-TRX-2026-00481</bdi></dd></div>
              <div><dt>البريد</dt><dd><bdi {...bidiAttributes('email')}>ops@enjaz.example</bdi></dd></div>
            </dl>
          </article>

          <article className="type-lab-panel">
            <p className="type-label type-lab-section-label">عربي + English</p>
            <p className="type-body text-container-safe">
              حالة خدمة <bdi {...bidiAttributes('natural')}>ENJAZ Cloud</bdi> للمعاملة رقم{' '}
              <bdi {...bidiAttributes('reference')}>REF-2026-031</bdi> أصبحت جاهزة للمراجعة.
            </p>
            <p className="type-caption type-lab-note">المقطع اللاتيني معزول؛ ترتيب الجملة العربية لا يتغير.</p>
          </article>

          <article className="type-lab-panel type-lab-panel--wide">
            <p className="type-label type-lab-section-label">اختبار الاسم الطويل</p>
            <h2 className="type-title-sm text-container-safe">{longCompanyName}</h2>
            <div className="type-lab-overflow-grid">
              <div>
                <span className="type-caption">التفاف آمن</span>
                <p className="type-body text-container-safe">{longCompanyName}</p>
              </div>
              <div>
                <span className="type-caption">سطر واحد عند الحاجة</span>
                <p className="type-body text-truncate-one" title={longCompanyName}>{longCompanyName}</p>
              </div>
              <div>
                <span className="type-caption">حد سطرين</span>
                <p className="type-body text-clamp-2">{longCompanyName} — ملف الشركة يحتوي على وثائق ومتابعات وملاحظات إضافية لا يجب أن توسع البطاقة خارج الشاشة.</p>
              </div>
            </div>
          </article>

          <article className="type-lab-panel type-lab-panel--wide">
            <p className="type-label type-lab-section-label">قواعد الحماية</p>
            <ul className="type-lab-rules">
              {principles.map((principle) => <li className="type-body" key={principle}>{principle}</li>)}
            </ul>
          </article>
        </section>

        <footer className="type-lab-footer type-label">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <nav aria-label="روابط مختبر الأساس">
            <Link to={ROUTES.tokens}>Design Tokens 2.2</Link>
            <Link to={ROUTES.identity}>الهوية 2.1</Link>
            <Link to={ROUTES.foundation}>حالة الأساس</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
