const domains = [
  { label: 'المالية', hint: 'Cobalt', color: 'var(--ez-domain-finance)' },
  { label: 'التحليلات', hint: 'Violet', color: 'var(--ez-domain-analytics)' },
  { label: 'العمليات', hint: 'Teal', color: 'var(--ez-domain-operations)' },
  { label: 'الوثائق', hint: 'Copper', color: 'var(--ez-domain-documents)' },
] as const;

const densityRows = [
  ['01', 'معاملة تحتاج قرارًا اليوم', 'شركة الرافدين', 'عاجلة'],
  ['02', 'متابعة متأخرة منذ يومين', 'مراجعة قانونية', 'متأخرة'],
  ['03', 'تحصيل يحتاج مراجعة', '١٬٢٥٠٬٠٠٠ د.ع', 'مالية'],
] as const;

export function VisualDnaProof() {
  return (
    <main className="ui-v2-dna" data-enjaz-ui="v2" data-dna="gold-charcoal" dir="rtl">
      <div className="ui-v2-dna__frame">
        <section className="ui-v2-dna__hero" aria-labelledby="ui-v2-dna-title">
          <div>
            <span className="ui-v2-dna__eyebrow">هوية إنجاز</span>
            <h1 id="ui-v2-dna-title">دفء ذهبي. حزم فحمي. معلومات تتحرك بوضوح.</h1>
            <p>
              إنجاز لا يُبنى كصفوف من البطاقات البيضاء. الهوية الجديدة تعتمد مناطق تركيز قوية،
              أسطحًا دافئة، عمقًا محسوبًا، وكثافة عملية تناسب العمل اليومي على الهاتف.
            </p>
          </div>
          <div className="ui-v2-dna__hero-proof" aria-label="نظام الهوية">
            <strong>2.0</strong>
            <span>Gold × Charcoal</span>
          </div>
        </section>

        <section className="ui-v2-dna__grid" aria-label="نظام التصميم البصري">
          <article className="ui-v2-dna__panel ui-v2-dna__panel--type">
            <h2>الصوت الطباعي</h2>
            <p>العربية هي الأصل، بأوزان واضحة ومسافات مريحة دون تصغير المعلومات المهمة.</p>
            <div className="ui-v2-dna__type-stack">
              <strong>القرار قبل الزحام</strong>
              <strong>كل معلومة لها وزن بصري حقيقي</strong>
              <span>النص المساعد هادئ، والعناوين قوية، والأرقام التشغيلية لا تضيع داخل الزخرفة.</span>
            </div>
          </article>

          <article className="ui-v2-dna__panel ui-v2-dna__panel--depth">
            <h2>العمق</h2>
            <p>لا جدار من المستطيلات المتساوية؛ الأسطح تختلف حسب الأهمية والوظيفة.</p>
            <div className="ui-v2-dna__depth-stack">
              <div className="ui-v2-dna__depth-card"><small>سطح داكن</small><strong>قرار / قيادة</strong></div>
              <div className="ui-v2-dna__depth-card"><small>سطح ذهبي</small><strong>تركيز / إجراء</strong></div>
            </div>
          </article>

          <article className="ui-v2-dna__panel ui-v2-dna__panel--palette">
            <h2>المراسي الأساسية</h2>
            <p>الذهبي والفحمي هما الهوية العامة، والأسطح الدافئة تمنع برودة الأبيض المسطح.</p>
            <div className="ui-v2-dna__swatches">
              <span className="ui-v2-dna__swatch ui-v2-dna__swatch--gold">Gold 500</span>
              <span className="ui-v2-dna__swatch ui-v2-dna__swatch--ink">Charcoal 900</span>
              <span className="ui-v2-dna__swatch ui-v2-dna__swatch--warm">Warm Surface</span>
              <span className="ui-v2-dna__swatch ui-v2-dna__swatch--paper">Paper Surface</span>
            </div>
          </article>

          <article className="ui-v2-dna__panel ui-v2-dna__panel--domains">
            <h2>ألوان المجالات</h2>
            <p>كل مجال يملك لهجة مساعدة من دون أن يصبح تطبيقًا منفصلًا.</p>
            <div className="ui-v2-dna__domains">
              {domains.map((domain) => (
                <div className="ui-v2-dna__domain" key={domain.label} style={{ '--domain-color': domain.color } as React.CSSProperties}>
                  <i aria-hidden="true" />
                  <strong>{domain.label}</strong>
                  <small>{domain.hint}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="ui-v2-dna__panel ui-v2-dna__panel--density">
            <h2>الكثافة التشغيلية</h2>
            <p>المعلومات الكثيفة تظهر كصفوف ذكية، مؤشرات، timelines وchips؛ لا كصناديق ضخمة.</p>
            <div className="ui-v2-dna__density-list">
              {densityRows.map(([index, title, detail, state]) => (
                <div className="ui-v2-dna__density-row" key={index}>
                  <span className="ui-v2-dna__index">{index}</span>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                  <span className="ui-v2-dna__chip">{state}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
