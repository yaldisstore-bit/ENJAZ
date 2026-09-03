import { Badge, Card, CardBody, CardHeader } from '../../../design-system/components/index.ts';
import { AppShellFrame } from '../../shell/AppShell.tsx';

function ShellProofContent() {
  return (
    <section className="shell-proof" aria-labelledby="shell-proof-title">
      <header className="shell-proof__hero">
        <div>
          <p className="shell-proof__eyebrow">ENJAZ · Phase 3.1</p>
          <h1 className="type-title-lg" id="shell-proof-title">الهيكل الحقيقي لإنجاز</h1>
          <p className="type-body-lg shell-proof__lead">
            هذه ليست شاشة أعمال. إنها طبقة التطبيق الثابتة التي ستحتوي كل الشاشات القادمة من دون اختراع تنقل أو مسافات أو Safe Areas من جديد.
          </p>
        </div>
        <Badge tone="success">Design System 1.0</Badge>
      </header>

      <div className="shell-proof__grid">
        <Card tone="prominent">
          <CardHeader title="Top Bar ثابت" subtitle="هوية، سياق الحساب، وخروج آمن" />
          <CardBody>يبقى واضحًا على الهاتف والشاشات الواسعة من دون تغطية المحتوى أو تكرار أدوات كل صفحة.</CardBody>
        </Card>
        <Card tone="surface">
          <CardHeader title="Navigation محجوزة" subtitle="خمسة مواضع موبايل مضبوطة" />
          <CardBody>الرئيسية مفعّلة الآن لإثبات الهيكل فقط. بقية المسارات تبقى مقفلة حتى Phase 3.2 كي لا نسبق عقد التنقل.</CardBody>
        </Card>
        <Card tone="raised">
          <CardHeader title="Page Container موحد" subtitle="RTL + Safe Area + Keyboard aware" />
          <CardBody>كل شاشة أعمال مستقبلية ستدخل في نفس الحاوية، بنفس القياسات والعمق والحماية من القص والتداخل.</CardBody>
        </Card>
      </div>

      <section className="shell-proof__notice" aria-label="حدود Phase 3.1">
        <strong>حدود هذه المرحلة:</strong>
        <span>لا Dashboard، لا معاملات، لا شركات، ولا مالية بعد. نحن نثبت الهيكل الذي سيحملها.</span>
      </section>
    </section>
  );
}

export function ShellPreviewPage() {
  return (
    <AppShellFrame userLabel="preview@enjaz.local" networkState="online">
      <ShellProofContent />
    </AppShellFrame>
  );
}
