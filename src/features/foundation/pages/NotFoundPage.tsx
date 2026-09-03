import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';

export function NotFoundPage() {
  return (
    <main className="foundation-page" id="main-content">
      <section className="foundation-card">
        <h1>الصفحة غير موجودة</h1>
        <p>المسار المطلوب غير مسجل في إنجاز.</p>
        <Link className="foundation-link" to={ROUTES.root}>الرئيسية</Link>
      </section>
    </main>
  );
}
