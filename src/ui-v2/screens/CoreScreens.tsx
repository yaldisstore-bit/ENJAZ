import { EzBadge, EzButton, EzChip, EzMetric, EzProgress, EzRow } from '../components/primitives.tsx';

type CoreScreenAction = () => void;

function CoreIntro(props: Readonly<{ eyebrow: string; title: string; body: string; action?: string; onAction?: CoreScreenAction }>) {
  return (
    <header className="ez-core-intro">
      <div>
        <span>{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.body}</p>
      </div>
      {props.action ? <EzButton tone="dark" onClick={props.onAction}>{props.action}</EzButton> : null}
    </header>
  );
}

function MiniBars(props: Readonly<{ values: readonly number[]; label: string; tone?: 'gold' | 'finance' | 'operations' }>) {
  const max = Math.max(...props.values, 1);
  return (
    <div className={`ez-core-bars ez-core-bars--${props.tone ?? 'gold'}`} data-pattern="trend-panel">
      <div className="ez-core-bars__head"><strong>{props.label}</strong><small>آخر 7 أيام</small></div>
      <div className="ez-core-bars__plot" role="img" aria-label={props.label}>
        {props.values.map((value, index) => (
          <i key={`${value}-${index}`} style={{ '--bar': `${Math.max(12, Math.round((value / max) * 100))}%` } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export function DailyWorkCoreScreen(props: Readonly<{ onNewFollowup(): void }>) {
  const days = ['الأحد 6', 'الاثنين 7', 'الثلاثاء 8', 'الأربعاء 9', 'الخميس 10'];
  return (
    <section className="ez-core-screen ez-core-daily" data-core-screen="today">
      <CoreIntro eyebrow="مسار اليوم" title="اليوم" body="الوقت والترتيب والأثر قبل أي تفاصيل ثانوية." action="متابعة جديدة" onAction={props.onNewFollowup} />
      <div className="ez-core-date-strip" aria-label="أيام العمل">{days.map((day, index) => <button key={day} type="button" className={index === 2 ? 'is-active' : ''}>{day}</button>)}</div>

      <div className="ez-core-daily__layout">
        <section className="ez-core-next-task" data-pattern="focal-zone">
          <span>المهمة التالية · 10:45</span><h2>مراجعة قرار تأسيس</h2><p>شركة قمر السلطان · الملف جاهز للمراجعة النهائية.</p>
          <div className="ez-core-chip-row"><EzChip tone="gold">25 دقيقة</EzChip><EzChip tone="neutral">المسؤول: سارة</EzChip></div>
          <EzButton tone="dark">بدء المهمة</EzButton>
        </section>
        <section className="ez-core-timeline" data-pattern="timeline">
          {[
            ['09:10','اكتمل','إرسال كتاب رسمي','success','شركة الفجر'],
            ['10:45','التالي','مراجعة قرار تأسيس','gold','قمر السلطان'],
            ['12:30','لاحقًا','اتصال متابعة مع محامٍ','neutral','معاملة نشطة'],
            ['15:20','لاحقًا','تسوية حركة مالية','neutral','معاملة نشطة'],
          ].map(([time,state,title,tone,subject]) => (
            <div className={`ez-core-timeline__item is-${tone}`} key={time}>
              <time>{time}</time><i aria-hidden="true" /><div><small>{state}</small><strong>{title}</strong><span>{subject}</span></div>
            </div>
          ))}
        </section>
      </div>

      <section className="ez-core-remaining" data-pattern="dense-row">
        <header><strong>ما تبقى اليوم</strong><small>مرتب حسب التأثير والوقت</small></header>
        <EzRow title="رفع مستندين ناقصين" detail="معاملة 1038" meta="قبل 13:00" state={<EzChip tone="danger">متأخرة</EzChip>} />
        <EzRow title="تأكيد موعد المراجعة" detail="شركة الروان" meta="14:10" state={<EzChip tone="warning">بانتظارك</EzChip>} />
      </section>
    </section>
  );
}

export function OperationsCoreScreen(props: Readonly<{ commandMode: boolean; onCommandMode(value: boolean): void }>) {
  if (props.commandMode) {
    return (
      <section className="ez-core-screen ez-core-command" data-core-screen="command">
        <CoreIntro eyebrow="مركز القيادة" title="القيادة" body="قرارات عابرة للمجالات، مع إظهار الاستثناءات فقط." action="العودة للعمليات" onAction={() => props.onCommandMode(false)} />
        <section className="ez-core-command__hero" data-pattern="executive-focal-zone">
          <div><span>المؤشر التنفيذي</span><strong>86</strong><small>استقرار جيد · 3 نقاط تحتاج قرارًا</small></div>
          <div className="ez-core-command__metrics"><EzMetric label="عاجلة" value="3" tone="gold" /><EzMetric label="متلكئة" value="8" /><EzMetric label="تحصيل" value="78%" /></div>
        </section>
        <div className="ez-core-command__modules">
          <section><span>القرار الأعلى أثرًا</span><h2>تخصيص مراجع إضافي للمعاملات المتلكئة</h2><p>8 معاملات تجاوزت الهدف الزمني، منها 3 مرتبطة بالمراجع نفسه.</p><EzButton tone="gold">فتح التفاصيل</EzButton></section>
          <section><span>المالية</span><h3>450,000 د.ع بحاجة متابعة</h3><p>مبلغ مستحق على معاملة قريبة الإغلاق.</p></section>
          <section><span>الموارد</span><h3>ذروة العمل 11:00–13:00</h3><p>إعادة توزيع مهمتين تخفض الاختناق المتوقع.</p></section>
        </div>
      </section>
    );
  }

  return (
    <section className="ez-core-screen ez-core-operations" data-core-screen="operations">
      <CoreIntro eyebrow="العمل الجاري" title="العمليات" body="الحمولة والملكية والجدول في مساحة تشغيلية واحدة." action="فتح مركز القيادة" onAction={() => props.onCommandMode(true)} />
      <section className="ez-core-operations__pulse" data-pattern="operations-pulse">
        <div><span>نشاط الآن</span><strong>17</strong><small>عنصرًا قيد التنفيذ</small></div>
        <MiniBars label="حركة الساعة" values={[48, 60, 54, 72, 68, 88, 80]} tone="operations" />
      </section>
      <div className="ez-core-operations__board">
        <section data-pattern="ownership-board"><header><strong>الملكية</strong><EzBadge tone="success">مستقر</EzBadge></header>
          <EzRow title="أحمد" detail="5 معاملات · 1 عاجلة" meta="72%" state={<EzProgress value={72} label="أحمد" />} />
          <EzRow title="سارة" detail="4 معاملات · 0 عاجلة" meta="81%" state={<EzProgress value={81} label="سارة" />} />
          <EzRow title="علي" detail="6 معاملات · 2 عاجلة" meta="64%" state={<EzProgress value={64} label="علي" />} />
        </section>
        <section className="ez-core-operations__schedule" data-pattern="schedule-strip"><header><strong>الجدول القريب</strong><small>الساعتان القادمتان</small></header>
          <div><time>11:15</time><span><strong>تدقيق مستندات</strong><small>شركة الفجر</small></span><EzChip tone="warning">سارة</EzChip></div>
          <div><time>11:40</time><span><strong>مراجعة مالية</strong><small>معاملة 1042</small></span><EzChip tone="info">علي</EzChip></div>
          <div><time>12:10</time><span><strong>قرار تأسيس</strong><small>قمر السلطان</small></span><EzChip tone="gold">أحمد</EzChip></div>
        </section>
      </div>
    </section>
  );
}

export function FinanceCoreScreen() {
  return (
    <section className="ez-core-screen ez-core-finance" data-core-screen="finance">
      <CoreIntro eyebrow="المالية" title="المالية" body="رصيد واتجاه وحركات قريبة ضمن مدخل مالي واضح." />
      <section className="ez-core-finance__hero" data-pattern="ledger-summary">
        <div><span>المحصّل هذا الشهر</span><strong>18,450,000 د.ع</strong><small>+8% عن الشهر الماضي</small></div>
        <EzMetric label="المتبقي" value="4,200,000" detail="د.ع" tone="gold" />
        <MiniBars label="اتجاه التحصيل" values={[30, 48, 42, 66, 62, 78, 88]} tone="finance" />
      </section>
      <section className="ez-core-finance__ledger" data-pattern="ledger"><header><strong>آخر الحركات</strong><EzBadge tone="gold">اليوم</EzBadge></header>
        <EzRow title="دفعة معاملة 1042" detail="شركة الرافدين" meta="+750,000 د.ع" state={<EzChip tone="success">محصّل</EzChip>} />
        <EzRow title="أتعاب تسجيل" detail="شركة الفجر" meta="+450,000 د.ع" state={<EzChip tone="success">محصّل</EzChip>} />
        <EzRow title="مصروف مستندات" detail="معاملة 1038" meta="-85,000 د.ع" state={<EzChip tone="neutral">مصروف</EzChip>} />
      </section>
    </section>
  );
}