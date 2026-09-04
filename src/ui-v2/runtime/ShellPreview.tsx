import { useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { EzBadge, EzChip, EzMetric, EzNotice, EzProgress, EzSurface } from '../components/primitives.tsx';

export function ShellPreview() {
  const [tab, setTab] = useState<'home' | 'today' | 'operations' | 'finance'>('home');

  const copy = {
    home: ['الرئيسية', 'نظرة سريعة على ما يحتاج قرارك الآن.'],
    today: ['اليوم', 'المهام والمتابعات التي تستحق تركيزك اليوم.'],
    operations: ['العمليات', 'مراقبة كثافة العمل والعوائق النشطة.'],
    finance: ['المالية', 'تحصيلات وحركات مالية مرتبطة بالعمل النشط.'],
  } as const;

  return (
    <AppShell title="إنجاز" subtitle="مكتب الشركات" activeTab={tab} onTabChange={setTab}>
      <section className="ez-shell-preview" aria-label="معاينة محتوى التطبيق">
        <header className="ez-shell-preview__hero">
          <div>
            <span className="ez-shell-preview__eyebrow">UI-4 · NEW APP SHELL</span>
            <h1>{copy[tab][0]}</h1>
            <p>{copy[tab][1]}</p>
          </div>
          <EzChip tone="gold" dot>واجهة حيّة</EzChip>
        </header>

        <div className="ez-shell-preview__metrics">
          <EzMetric label="معاملات نشطة" value="24" detail="3 عاجلة" tone="gold" />
          <EzMetric label="متابعات اليوم" value="14" detail="2 متأخرة" tone="plain" />
          <EzMetric label="التحصيل" value="78%" detail="هذا الأسبوع" tone="dark" />
        </div>

        <div className="ez-shell-preview__grid">
          <EzSurface tone="paper" emphasis="raised" className="ez-shell-preview__focus-card">
            <div className="ez-shell-preview__card-head"><div><span>الأولوية الآن</span><h2>تعديل عقد تأسيس</h2></div><EzBadge tone="gold">01</EzBadge></div>
            <p>شركة الرافدين للتجارة العامة · المعاملة متوقفة عند خطوة المراجعة.</p>
            <EzProgress label="تقدم الإجراء" value={68} detail="3 من 5" />
          </EzSurface>

          <EzSurface tone="dark" emphasis="focus" className="ez-shell-preview__signal-card">
            <span>إشارة تنفيذية</span>
            <strong>هناك 3 عناصر تحتاج قرارًا قبل نهاية اليوم.</strong>
            <small>الـShell يحافظ على العنوان والتنقل بينما يتغير المحتوى فقط.</small>
          </EzSurface>
        </div>

        <div className="ez-shell-preview__notices">
          <EzNotice title="الشريط السفلي ثابت" body="زر الإجراء المركزي جزء من الـDock نفسه ولا يطفو فوق الصفحة." tone="success" />
          <EzNotice title="المساحة الآمنة محسوبة" body="الحواف العلوية والسفلية تستخدم safe-area مع دعم visualViewport." tone="info" />
        </div>

        <div className="ez-shell-preview__spacer" aria-hidden="true" />
      </section>
    </AppShell>
  );
}
