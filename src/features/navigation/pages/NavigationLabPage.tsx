import { Link } from 'react-router';
import { Badge, Card, CardBody, CardHeader } from '../../../design-system/components/index.ts';
import {
  PRIMARY_NAVIGATION,
  PRODUCT_NAVIGATION_ROUTES,
  resolveBackDestination,
  resolvePrimaryNavigation,
} from '../../../core/routing/navigationContract.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { AppShellFrame } from '../../../shared/shell/AppShellFrame.tsx';

function NavigationProofContent() {
  const financeActive = resolvePrimaryNavigation(ROUTES.appFinance);
  const financeBack = resolveBackDestination(ROUTES.appFinance);

  return (
    <section className="navigation-lab" aria-labelledby="navigation-lab-title">
      <header className="navigation-lab__hero">
        <div>
          <p className="navigation-lab__eyebrow">ENJAZ · Phase 3.2</p>
          <h1 className="type-title-lg" id="navigation-lab-title">Navigation Architecture</h1>
          <p className="type-body-lg navigation-lab__lead">
            طبقة تنقل مركزية ومكتوبة بالعقود: المسارات، الحالة النشطة، الرجوع الآمن، Deep Links، والوصول؛ من دون بناء شاشات الأعمال قبل مراحلها.
          </p>
        </div>
        <Badge tone="success">Route Contract Active</Badge>
      </header>

      <div className="navigation-lab__metrics">
        <Card tone="prominent">
          <CardHeader title="5" subtitle="Primary shell destinations" />
          <CardBody>كل موضع في Bottom Navigation أصبح مرتبطًا بمسار قانوني واحد.</CardBody>
        </Card>
        <Card tone="raised">
          <CardHeader title={String(PRODUCT_NAVIGATION_ROUTES.length)} subtitle="Product domain roots" />
          <CardBody>خريطة المسارات مثبتة قبل الشاشات لمنع أسماء وروابط متضاربة لاحقًا.</CardBody>
        </Card>
        <Card tone="surface">
          <CardHeader title={financeActive ?? 'none'} subtitle="Active state for /app/finance" />
          <CardBody>المجالات الثانوية تنتمي إلى «المزيد» بدل تزييف موضع تنقل سادس.</CardBody>
        </Card>
        <Card tone="muted">
          <CardHeader title={financeBack ?? 'none'} subtitle="Safe back for direct deep link" />
          <CardBody>الرجوع محدد عقديًا ولا يعتمد على وجود History سابق قد يخرج المستخدم من إنجاز.</CardBody>
        </Card>
      </div>

      <section className="navigation-lab__section" aria-labelledby="primary-navigation-title">
        <div className="navigation-lab__section-heading">
          <h2 className="type-title-md" id="primary-navigation-title">Primary Navigation</h2>
          <Badge tone="brand">5 slots</Badge>
        </div>
        <div className="navigation-lab__route-grid">
          {PRIMARY_NAVIGATION.map((item) => (
            <article className="navigation-lab__route" key={item.id}>
              <strong>{item.label}</strong>
              <code dir="ltr">{item.path}</code>
              <small>{item.routeIds.length} domain binding</small>
            </article>
          ))}
        </div>
      </section>

      <section className="navigation-lab__section" aria-labelledby="domain-route-title">
        <div className="navigation-lab__section-heading">
          <h2 className="type-title-md" id="domain-route-title">Canonical Domain Routes</h2>
          <Badge tone="info">Deep-link roots</Badge>
        </div>
        <div className="navigation-lab__domain-list" role="list">
          {PRODUCT_NAVIGATION_ROUTES.map((route) => (
            <div className="navigation-lab__domain-row" key={route.id} role="listitem">
              <span>
                <strong>{route.label}</strong>
                <small>Phase {route.deliveryPhase} · {route.permission}</small>
              </span>
              <code dir="ltr">{route.path}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="navigation-lab__guard" aria-label="حدود Phase 3.2">
        <strong>الحد البنيوي:</strong>
        <span>المسار قابل للوصول والـShell يفهمه، لكن محتوى المجال يبقى Reserved حتى مرحلته. Phase 3.3 وحدها ستضيف البحث والإشعارات والـQuick Actions عالميًا.</span>
      </section>

      <Link className="navigation-lab__shell-link" to={ROUTES.shellPreview}>العودة إلى إثبات App Shell 3.1</Link>
    </section>
  );
}

export function NavigationLabPage() {
  return (
    <AppShellFrame
      userLabel="preview@enjaz.local"
      networkState="online"
      currentPath={ROUTES.appFinance}
    >
      <NavigationProofContent />
    </AppShellFrame>
  );
}
