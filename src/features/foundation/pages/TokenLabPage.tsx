import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes.ts';
import { APP_NAME, APP_VERSION } from '../../../core/version/version.ts';
import { DESIGN_TOKEN_COUNT } from '../../../design-system/tokens/tokenContract.ts';

const rules = [
  'القيمة الخام تُعرّف مرة واحدة فقط داخل طبقة المراجع، ولا تصل مباشرة إلى CSS المنتج.',
  'الواجهة تستخدم المعنى: سطح، نص، نجاح، تحذير، وليس أسماء درجات لونية عشوائية.',
  'المسافات والزوايا والأحجام والحركة تأتي من سلالم محددة؛ لا أرقام مرتجلة بين الشاشات.',
  'مكونات Phase 2.4 ستستهلك عقوداً مثل field وbutton وcard بدلاً من إعادة اختراع مواصفاتها.',
  'أي Token غير معروف، مكرر، دائري أو متسرب من طبقة primitives يجعل الـbuild gate يفشل.',
] as const;

export function TokenLabPage() {
  return (
    <main className="token-page" id="main-content">
      <div className="token-shell">
        <header className="token-hero">
          <p className="token-kicker">ENJAZ · Design Tokens 2.2</p>
          <h1>كل قيمة بصرية لها اسم، معنى، ومكان واحد.</h1>
          <p>نظام Tokens يمنع الواجهة من التحول مع الوقت إلى ألوان ومسافات وظلال متنافسة.</p>
          <div className="token-count" aria-label="عدد رموز التصميم العامة">
            <strong>{DESIGN_TOKEN_COUNT}</strong>
            <span>Token عامة محكومة بالعقد</span>
          </div>
        </header>

        <section className="token-grid" aria-label="مختبر Design Tokens">
          <article className="token-panel token-panel--wide">
            <h2>الطبقات</h2>
            <div className="token-layer-grid">
              <div className="token-layer token-layer--reference"><strong>Reference</strong><span>القيم الخام المحمية</span></div>
              <div className="token-layer token-layer--semantic"><strong>Semantic</strong><span>المعنى الوظيفي</span></div>
              <div className="token-layer token-layer--component"><strong>Component</strong><span>عقود المكونات القادمة</span></div>
            </div>
          </article>

          <article className="token-panel">
            <h2>سلم المسافات</h2>
            <div className="token-space-stack" aria-label="عينات المسافات">
              <div className="token-space token-space--1">1</div>
              <div className="token-space token-space--2">2</div>
              <div className="token-space token-space--3">3</div>
              <div className="token-space token-space--4">4</div>
              <div className="token-space token-space--6">6</div>
              <div className="token-space token-space--8">8</div>
            </div>
          </article>

          <article className="token-panel">
            <h2>عقود التحكم</h2>
            <div className="token-control-stack">
              <div className="token-field-demo">حقل إدخال موحّد</div>
              <div className="token-button-demo">إجراء رئيسي</div>
              <div className="token-badge-demo">حالة واضحة</div>
            </div>
          </article>

          <article className="token-panel">
            <h2>الزوايا والعمق</h2>
            <div className="token-shape-grid">
              <div className="token-shape token-shape--sm">SM</div>
              <div className="token-shape token-shape--md">MD</div>
              <div className="token-shape token-shape--lg">LG</div>
            </div>
          </article>

          <article className="token-panel">
            <h2>الحركة</h2>
            <p className="token-copy">ثلاث سرعات فقط، مع easing محدد ودعم كامل لـ reduced motion. الحركة لن تصبح مؤثرات عشوائية.</p>
            <div className="token-motion-track"><span className="token-motion-dot" /></div>
          </article>

          <article className="token-panel token-panel--wide">
            <h2>قواعد عدم الانحراف</h2>
            <ul className="token-rules">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </article>
        </section>

        <footer className="token-footer">
          <span>{APP_NAME} · {APP_VERSION}</span>
          <div className="token-footer-links">
            <Link to={ROUTES.identity}>هوية 2.1</Link>
            <Link to={ROUTES.foundation}>حالة الأساس</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
