import { Badge, Card, CardBody, CardHeader } from '../../../design-system/components/index.ts';

export function AuthHomePage() {
  return (
    <section className="shell-proof" aria-labelledby="app-shell-title">
      <header className="shell-proof__hero">
        <div>
          <p className="shell-proof__eyebrow">ENJAZ · Phase 3.1</p>
          <h1 className="type-title-lg" id="app-shell-title">مساحة إنجاز جاهزة</h1>
          <p className="type-body-lg shell-proof__lead">
            المصادقة أصبحت داخل App Shell الحقيقي. هذه المساحة مقصودة كصفحة انتقالية فقط إلى أن تبدأ شاشات الأعمال في المراحل التالية.
          </p>
        </div>
        <Badge tone="success">Shell active</Badge>
      </header>

      <div className="shell-proof__grid">
        <Card tone="brand">
          <CardHeader title="هيكل موحد" subtitle="Top Bar + Navigation + Page Container" />
          <CardBody>كل شاشة جديدة ستُركّب داخل الهيكل نفسه بدل إنشاء واجهة مختلفة لكل قسم.</CardBody>
        </Card>
        <Card tone="surface">
          <CardHeader title="موبايل أولًا" subtitle="Safe Areas وAndroid keyboard محفوظة" />
          <CardBody>الهيكل يرث العقود التي اجتازت Phase 2.8 ولا يعيد اختراع سلوك الشاشة أو اللمس.</CardBody>
        </Card>
        <Card tone="accent">
          <CardHeader title="لا قفز على الخطة" subtitle="Phase 3.2 هي التالية بعد إغلاق 3.1" />
          <CardBody>المسارات غير النهائية تبقى غير مفعّلة حتى تثبيت Navigation Architecture رسميًا.</CardBody>
        </Card>
      </div>
    </section>
  );
}
