import '../styles/foundation.css';
import './rebirth-foundation-preview.css';

const metricCards = [
  { label: 'المعاملات النشطة', value: '26', tone: 'dark' },
  { label: 'الأولوية الحرجة', value: '5', tone: 'gold' },
  { label: 'التحصيل', value: '342,500', tone: 'light' },
  { label: 'المتابعات', value: '12', tone: 'dark' },
] as const;

export function RebirthFoundationPage() {
  return (
    <div className="rebirth-foundation" data-enjaz-ui="rebirth" dir="rtl">
      <main className="rebirth-foundation__frame">
        <header className="rebirth-foundation__header ui-enter">
          <div>
            <p className="ui-section-label">ENJAZ UI REBIRTH · STAGE 0</p>
            <h1 className="ui-display">هوية إنجاز الجديدة</h1>
            <p className="ui-body">مختبر DNA نظيف ومعزول قبل بناء أي شاشة منتج.</p>
          </div>
          <span className="rebirth-foundation__mark" aria-hidden="true">إ</span>
        </header>

        <section className="rebirth-foundation__hero ui-surface--gold ui-rise">
          <div>
            <p className="ui-section-label">الهوية الأساسية</p>
            <h2 className="ui-title">ذهب دافئ + فحمي عميق</h2>
          </div>
          <strong className="rebirth-foundation__hero-number ui-number">92%</strong>
          <span>وضوح بصري مقصود، لا جدار بطاقات.</span>
        </section>

        <section className="ui-card-grid" aria-label="نماذج الأسطح">
          {metricCards.map((card, index) => (
            <article
              className={`ui-focus-card ui-pressable rebirth-foundation__metric rebirth-foundation__metric--${card.tone} ${index === 0 ? 'ui-focus-card--feature' : ''}`}
              key={card.label}
            >
              <span>{card.label}</span>
              <strong className="ui-number">{card.value}</strong>
            </article>
          ))}
        </section>

        <section className="rebirth-foundation__domains">
          <article className="ui-surface--finance rebirth-foundation__domain-card">
            <p className="ui-section-label">المالية</p>
            <h2 className="ui-title">Cobalt / Deep Blue</h2>
            <p>ملخصات، تحصيل، Ledger ورسوم دقيقة.</p>
          </article>
          <article className="ui-surface--analytics rebirth-foundation__domain-card">
            <p className="ui-section-label">التحليلات</p>
            <h2 className="ui-title">Violet / Deep Navy</h2>
            <p>KPIs، اتجاهات، Progress ورسوم تحليلية.</p>
          </article>
        </section>

        <footer className="ui-dock rebirth-foundation__dock" aria-label="نموذج هندسة الشريط السفلي">
          <span>الرئيسية</span>
          <span>اليوم</span>
          <button className="ui-primary-action ui-pressable" type="button" aria-label="إجراء جديد">+</button>
          <span>التقارير</span>
          <span>المزيد</span>
        </footer>
      </main>
    </div>
  );
}
