import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../../core/routing/routes';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dialog,
} from '../../../design-system/components/index.ts';
import { MotionReveal, prefersReducedMotion } from '../../../design-system/motion/index.ts';

export function MotionLabPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const reduced = prefersReducedMotion();

  return (
    <main className="motion-lab" id="main-content">
      <header className="motion-lab__hero text-container-safe">
        <div>
          <p className="foundation-eyebrow">Phase 2.5 · Motion & Interaction</p>
          <h1 className="type-title-lg">الحركة التي تشرح، لا الحركة التي تشتت</h1>
          <p className="type-body-lg motion-lab__intro">
            كل انتقال في إنجاز قصير، قابل للتوقع، ومربوط بعقد واحد. لا يوجد bounce استعراضي ولا transition عشوائي.
          </p>
        </div>
        <Badge tone={reduced ? 'warning' : 'success'}>{reduced ? 'Reduce Motion مفعّل' : 'Motion كامل'}</Badge>
      </header>

      <section className="motion-lab__grid" aria-label="مختبر الحركة">
        <Card tone="raised">
          <CardHeader title="استجابة اللمس" subtitle="ضغط واضح بدون قفزة أو تموج مزعج" aside={<Badge tone="brand">140ms</Badge>} />
          <CardBody>
            <p>جرّب الضغط المطوّل والسريع. الحركة لا تعطل النقر ولا تغيّر أبعاد العنصر.</p>
          </CardBody>
          <CardFooter>
            <Button>إجراء أساسي</Button>
            <Button variant="secondary">إجراء ثانوي</Button>
            <Button variant="danger">إجراء حساس</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader title="الدخول المنظم" subtitle="Fade / Rise / Scale مع تأخير مضبوط" aside={<Badge tone="info">220ms</Badge>} />
          <CardBody>
            <div className="motion-lab__reveal-stack" key={revealKey}>
              <MotionReveal preset="fade"><div className="motion-lab__sample">Fade — تغيير حالة هادئ</div></MotionReveal>
              <MotionReveal preset="rise" delay="1"><div className="motion-lab__sample">Rise — محتوى جديد في السياق</div></MotionReveal>
              <MotionReveal preset="scale" delay="2"><div className="motion-lab__sample">Scale — تأكيد بصري محدود</div></MotionReveal>
            </div>
          </CardBody>
          <CardFooter>
            <Button variant="secondary" onClick={() => setRevealKey(revealKey + 1)}>إعادة العرض</Button>
          </CardFooter>
        </Card>

        <Card tone="prominent">
          <CardHeader title="الطبقات المتحركة" subtitle="Dialog وBottom Sheet يحتفظان بمرحلة خروج حقيقية" aside={<Badge tone="brand">Presence</Badge>} />
          <CardBody>
            <p>الإغلاق لا يزيل الطبقة مباشرة من DOM؛ يمنحها النظام وقت الخروج، ثم يفكها بأمان.</p>
          </CardBody>
          <CardFooter>
            <Button onClick={() => setDialogOpen(true)}>فتح Dialog</Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>فتح Bottom Sheet</Button>
          </CardFooter>
        </Card>

        <Card tone="muted">
          <CardHeader title="إتاحة الحركة" subtitle="prefers-reduced-motion جزء من العقد وليس استثناءً لاحقاً" aside={<Badge tone={reduced ? 'warning' : 'neutral'}>{reduced ? 'Reduced' : 'Standard'}</Badge>} />
          <CardBody>
            <p>عند طلب تقليل الحركة تتوقف reveal والـoverlay animations والـskeleton والspinner، وتصبح تحولات التحكم فورية.</p>
          </CardBody>
        </Card>
      </section>

      <footer className="motion-lab__footer">
        <Link className="foundation-link" to={ROUTES.components}>العودة إلى مكونات 2.4</Link>
        <Link className="foundation-link" to={ROUTES.foundation}>حالة الأساس</Link>
      </footer>

      <Dialog
        id="motion-dialog"
        open={dialogOpen}
        title="Dialog بحركة مدروسة"
        description="دخول وخروج قصير مع احترام Reduce Motion"
        onClose={() => setDialogOpen(false)}
        actions={<Button onClick={() => setDialogOpen(false)}>تم</Button>}
      >
        <p>هذه الطبقة تستخدم Presence state: entering → entered → exiting → unmounted.</p>
      </Dialog>

      <BottomSheet
        id="motion-sheet"
        open={sheetOpen}
        title="Bottom Sheet للهاتف"
        description="حركة عمودية قصيرة تتبع طبيعة العنصر"
        onClose={() => setSheetOpen(false)}
        actions={<Button onClick={() => setSheetOpen(false)}>إغلاق</Button>}
      >
        <p>سيصبح هذا النمط أساس القوائم والإجراءات السفلية في ENJAZ على الهاتف.</p>
      </BottomSheet>
    </main>
  );
}
