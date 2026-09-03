import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';
import { APP_NAME, APP_VERSION } from '../../../core/version/version';

export function HomePlaceholder() {
  return (
    <main className="foundation-page" id="main-content">
      <section className="foundation-card" aria-labelledby="foundation-title">
        <p className="foundation-eyebrow">Phase 1.1 · Project Foundation</p>
        <h1 id="foundation-title">{APP_NAME}</h1>
        <p>
          هذه شاشة تأسيسية مؤقتة فقط. الهوية البصرية النهائية ستُبنى في مرحلة التصميم، ولا توجد أي واجهة من معقب داخل المشروع.
        </p>
        <Link className="foundation-link" to={ROUTES.foundation}>فحص حالة الأساس</Link>
        <small>الإصدار {APP_VERSION}</small>
      </section>
    </main>
  );
}
