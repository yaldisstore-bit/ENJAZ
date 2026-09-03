import { Badge, Card, CardBody, CardHeader } from '../../../design-system/components/index.ts';

export function AuthHomePage() {
  return (
    <section className="shell-proof" aria-labelledby="app-shell-title">
      <header className="shell-proof__hero">
        <div>
          <p className="shell-proof__eyebrow">ENJAZ · Phase 3.2</p>
          <h1 className="type-title-lg" id="app-shell-title">مساحة إنجاز مرتبطة بالمسارات</h1>
          <p className="type-body-lg shell-proof__lead">
            المصادقة تعمل داخل App Shell، وخريطة التنقل أصبحت مركزية وقابلة للفتح المباشر. هذه ليست Dashboard النهائية؛ الرئيسية الفعلية تبدأ في Phase 4.
          </p>
        </div>
        <Badge tone="success">Navigation active</Badge>
      </header>

      <div className="shell-proof__grid">
        <Card tone="prominent">
          <CardHeader title="خمسة مسارات رئيسية" subtitle="Home + Today + Transactions + Companies + More" />
          <CardBody>كل عنصر تنقل يقرأ من عقد مركزي واحد، مع حالة نشطة صحيحة للمسارات المتداخلة.</CardBody>
        </Card>
        <Card tone="surface">
          <CardHeader title="Deep Links آمنة" subtitle="المسار لا يعتمد على الوصول من زر سابق" />
          <CardBody>يمكن فتح جذر أي مجال مباشرة، ويظل الرجوع داخل إنجاز محددًا حتى عند عدم وجود History داخلي سابق.</CardBody>
        </Card>
        <Card tone="raised">
          <CardHeader title="لا قفز على الشاشات" subtitle="المحتوى يبقى Reserved" />
          <CardBody>التنقل جاهز، لكن كل شاشة أعمال ستُنفذ فقط في مرحلتها حسب الـMaster Roadmap.</CardBody>
        </Card>
      </div>
    </section>
  );
}
