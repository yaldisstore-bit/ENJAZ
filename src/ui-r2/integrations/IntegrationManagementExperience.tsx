import type { ReactNode } from 'react';

function Section({eyebrow,title,children}:{eyebrow:string;title:string;children:ReactNode}){
  return <section className="r2-launcher-group">
    <div className="r2-section-heading">
      <div><p className="r2-eyebrow">{eyebrow}</p><h2>{title}</h2></div>
    </div>
    {children}
  </section>;
}

function Row({title,detail,badge}:{title:string;detail:string;badge:string}){
  return <div className="r2-launcher-row" role="group">
    <span className="r2-launcher-row__copy"><strong>{title}</strong><small>{detail}</small></span>
    <span className="r2-stage-pill">{badge}</span>
  </div>;
}

export function IntegrationManagementExperience(){
  return <div className="r2-screen" data-screen="integrations" data-phase14-2-a4="management-shell" dir="rtl">
    <div className="r2-section-heading r2-section-heading--hero">
      <div>
        <p className="r2-eyebrow">Phase 14.2 · Integration Platform</p>
        <h1>التكاملات وواجهات API</h1>
        <p className="r2-supporting">إدارة آمنة ومقيدة بمساحة العمل للاعتمادات، النطاقات، الاشتراكات، وسجل تسليم Webhooks.</p>
      </div>
    </div>

    <div className="r2-launcher-groups">
      <Section eyebrow="Credentials" title="اعتمادات الوصول">
        <div className="r2-launcher-list">
          <Row title="مفاتيح API" detail="إنشاء اعتماد مقيد بالنطاق مع إظهار السر مرة واحدة فقط." badge="Server only" />
          <Row title="النطاقات والصلاحيات" detail="مراجعة companies:read وwebhooks:manage قبل الإصدار أو الإلغاء." badge="Scoped" />
          <Row title="الإلغاء وانتهاء الصلاحية" detail="إبطال الاعتماد يغلق السلطة المرتبطة به دون ترك أسرار في المتصفح." badge="Fail closed" />
        </div>
      </Section>

      <Section eyebrow="Webhooks" title="اشتراكات Webhooks">
        <div className="r2-launcher-list">
          <Row title="الاشتراكات" detail="ربط الأحداث بنقطة نهاية HTTPS ضمن مساحة العمل." badge="Workspace bound" />
          <Row title="سجل التسليم" detail="عرض المحاولات والحالة والنتيجة دون كشف مادة التوقيع." badge="Immutable log" />
          <Row title="إعادة المحاولة وDead-letter" detail="الحالات موجودة في العقد، ويُفعّل العامل التنفيذي في الشريحة التالية من A4." badge="Next slice" />
        </div>
      </Section>

      <Section eyebrow="Safety" title="حدود الأمان الحالية">
        <div className="r2-launcher-list">
          <Row title="لا Service Role في الواجهة" detail="كل السلطة الحساسة تبقى على الخادم وتحت RLS." badge="Enforced" />
          <Row title="لا أسرار محفوظة كنص خام" detail="التخزين يستخدم hash/prefix فقط، وشهادة A3 الحقيقية نجحت على البيئة المعزولة." badge="A3 PASS" />
        </div>
      </Section>
    </div>
  </div>;
}
