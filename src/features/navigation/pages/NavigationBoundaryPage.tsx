import { Link, useLocation } from 'react-router';
import { Badge, Card, CardBody, CardHeader } from '../../../design-system/components/index.ts';
import {
  getProductNavigationRoute,
  getProductNavigationRouteById,
  resolveNavigationAccess,
  SECONDARY_NAVIGATION_ROUTE_IDS,
} from '../../../core/routing/navigationContract.ts';
import { ROUTES } from '../../../core/routing/routes.ts';

function MoreNavigationHub() {
  const routes = SECONDARY_NAVIGATION_ROUTE_IDS.map(getProductNavigationRouteById);

  return (
    <section className="navigation-boundary" aria-labelledby="navigation-more-title">
      <header className="navigation-boundary__hero">
        <div>
          <p className="navigation-boundary__eyebrow">ENJAZ · Phase 3.2</p>
          <h1 className="type-title-lg" id="navigation-more-title">المزيد</h1>
          <p className="type-body-lg navigation-boundary__lead">
            هذه بوابة تنقل فقط. تجمع المسارات الثانوية المعتمدة من دون نقل أي منطق أعمال إلى الـShell.
          </p>
        </div>
        <Badge tone="brand">Navigation Hub</Badge>
      </header>

      <div className="navigation-hub" role="list" aria-label="أقسام إنجاز الثانوية">
        {routes.map((route) => (
          <Link className="navigation-hub__item" to={route.path} key={route.id} role="listitem">
            <span className="navigation-hub__copy">
              <strong>{route.label}</strong>
              <small>المحتوى الفعلي في Phase {route.deliveryPhase}</small>
            </span>
            <Badge tone="neutral">معتمد</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NavigationBoundaryPage() {
  const location = useLocation();
  if (location.pathname === ROUTES.appMore) return <MoreNavigationHub />;

  const route = getProductNavigationRoute(location.pathname);
  if (!route) {
    return (
      <section className="navigation-boundary" aria-labelledby="navigation-unknown-title">
        <h1 className="type-title-lg" id="navigation-unknown-title">مسار غير معروف</h1>
        <p className="type-body">هذا العنوان ليس جزءًا من عقد تنقل إنجاز.</p>
        <Link className="navigation-boundary__home-link" to={ROUTES.appHome}>العودة إلى الرئيسية</Link>
      </section>
    );
  }

  const access = resolveNavigationAccess(route, { isAuthenticated: true });

  return (
    <section className="navigation-boundary" aria-labelledby={`navigation-${route.id}-title`}>
      <header className="navigation-boundary__hero">
        <div>
          <p className="navigation-boundary__eyebrow">ENJAZ · Navigation Architecture</p>
          <h1 className="type-title-lg" id={`navigation-${route.id}-title`}>{route.label}</h1>
          <p className="type-body-lg navigation-boundary__lead">
            المسار مثبت وقابل للفتح مباشرة وإعادة التحميل. شاشة الأعمال نفسها لم تُبنَ بعد ولن تُختصر داخل Phase 3.2.
          </p>
        </div>
        <Badge tone={access === 'available' ? 'success' : 'danger'}>
          {access === 'available' ? 'مسار متاح' : 'غير متاح'}
        </Badge>
      </header>

      <div className="navigation-boundary__grid">
        <Card tone="raised">
          <CardHeader title="المسار القانوني" subtitle="Deep-link safe root" />
          <CardBody><code className="navigation-boundary__path" dir="ltr">{route.path}</code></CardBody>
        </Card>
        <Card tone="surface">
          <CardHeader title="عقد الوصول" subtitle="لا صلاحيات مخفية داخل عناصر الواجهة" />
          <CardBody>{route.permission === 'authenticated' ? 'مستخدم مصادق عليه' : route.permission}</CardBody>
        </Card>
        <Card tone="muted">
          <CardHeader title="حالة المحتوى" subtitle={`مرحلة التسليم ${route.deliveryPhase}`} />
          <CardBody>{route.contentState === 'reserved' ? 'محجوز لمرحلته — لا منطق أعمال هنا' : 'منفذ'}</CardBody>
        </Card>
      </div>

      <p className="navigation-boundary__guard type-body">
        هذه الصفحة Boundary مؤقتة للتنقل وليست بديلاً عن شاشة المجال التي ستُبنى في مرحلتها المحددة.
      </p>
    </section>
  );
}
