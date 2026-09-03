import { Link, useLocation } from 'react-router';
import { Badge } from '../../../design-system/components/index.ts';
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
          <p className="navigation-boundary__eyebrow">إنجاز</p>
          <h1 className="type-title-lg" id="navigation-more-title">المزيد</h1>
          <p className="type-body-lg navigation-boundary__lead">
            الأقسام الثانوية المعتمدة في مكان واحد، مع بقاء كل مجال مالكًا لمنطقه وبياناته.
          </p>
        </div>
        <Badge tone="brand">الأقسام</Badge>
      </header>

      <div className="navigation-hub" role="list" aria-label="أقسام إنجاز الثانوية">
        {routes.map((route) => (
          <Link className="navigation-hub__item" to={route.path} key={route.id} role="listitem">
            <span className="navigation-hub__copy">
              <strong>{route.label}</strong>
              <small>{route.contentState === 'reserved' ? 'سيُفتح بواجهته الكاملة عند تسليم المجال' : 'جاهز للاستخدام'}</small>
            </span>
            <Badge tone={route.contentState === 'reserved' ? 'neutral' : 'success'}>
              {route.contentState === 'reserved' ? 'محجوز' : 'متاح'}
            </Badge>
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
        <p className="type-body">هذا العنوان ليس جزءًا من تنقل إنجاز.</p>
        <Link className="navigation-boundary__home-link" to={ROUTES.appHome}>العودة إلى الرئيسية</Link>
      </section>
    );
  }

  const access = resolveNavigationAccess(route, { isAuthenticated: true });
  const isAvailable = access === 'available';

  return (
    <section
      className="navigation-boundary navigation-boundary--reserved"
      aria-labelledby={`navigation-${route.id}-title`}
    >
      <header className="navigation-boundary__reserved-hero">
        <div className="navigation-boundary__reserved-copy">
          <span className="navigation-boundary__reserved-eyebrow">قسم محفوظ في إنجاز</span>
          <h1 className="type-title-lg" id={`navigation-${route.id}-title`}>{route.label}</h1>
          <p className="type-body-lg">
            هذا القسم مثبت في بنية التطبيق، لكن واجهة الأعمال الكاملة لم تُسلَّم بعد. لن نعرض شاشة وهمية أو منطقًا ناقصًا قبل اكتماله.
          </p>
        </div>

        <div className="navigation-boundary__reserved-mark" aria-hidden="true">
          <strong>{route.deliveryPhase}</strong>
          <span>مرحلة</span>
        </div>
      </header>

      <div className="navigation-boundary__reserved-strip" aria-label="حالة القسم">
        <div className="navigation-boundary__reserved-fact">
          <strong>المسار محفوظ</strong>
          <span>يمكن فتح الرابط مباشرة وإعادة تحميله بأمان.</span>
        </div>
        <div className="navigation-boundary__reserved-fact">
          <strong>{isAvailable ? 'الوصول معتمد' : 'الوصول مقيد'}</strong>
          <span>{isAvailable ? 'الحساب المصادق عليه يملك حق فتح هذا القسم.' : 'هذا القسم غير متاح لهذا الحساب.'}</span>
        </div>
      </div>

      <footer className="navigation-boundary__reserved-footer">
        <Link className="navigation-boundary__reserved-home" to={ROUTES.appHome}>العودة إلى الرئيسية</Link>
        <code className="navigation-boundary__reserved-path" dir="ltr">{route.path}</code>
      </footer>
    </section>
  );
}
