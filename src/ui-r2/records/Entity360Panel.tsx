import type { Entity360Source } from '../../features/entity360/entity360Service.ts';

const number = (value: number) => new Intl.NumberFormat('ar-IQ').format(value);
const money = (source: Entity360Source) => !source.finance.safe || source.finance.amount === null
  ? 'قيمة غير آمنة للعرض الدقيق'
  : `${number(source.finance.amount)} د.ع${source.finance.partial ? ' · جزئي' : ''}`;

export function Entity360Panel({ source, onClose }: Readonly<{ source: Entity360Source; onClose?: (() => void) | undefined }>) {
  const company = source.kind === 'company' ? source.company : null;
  const contact = source.kind === 'contact' ? source.contact : null;
  return <article className="r2-records-entity-profile" data-phase6-3="company-lawyer-360" data-entity360-kind={source.kind} data-entity360-id={source.id}>
    <header className="r2-section-heading"><div><p className="r2-eyebrow">Phase 6.3 · 360°</p><h2>{source.title}</h2><p className="r2-supporting">{source.subtitle}</p></div>{onClose ? <button type="button" className="r2-action r2-action--secondary" onClick={onClose}>إغلاق 360°</button> : null}</header>
    <div className="r2-records-facts">
      <div><span>المعاملات</span><strong>{number(source.counts.transactions)}</strong></div>
      <div><span>{source.kind === 'company' ? 'الأشخاص' : 'الشركات الحالية'}</span><strong>{number(source.kind === 'company' ? source.counts.contacts : source.counts.companies)}</strong></div>
      <div><span>السياق المالي</span><strong>{money(source)}</strong></div>
      <div><span>الحالة</span><strong>{source.status}</strong></div>
    </div>
    {company ? <div className="r2-records-related-lists">
      <section><h3>المعاملات</h3>{company.transactions.slice(0, 8).map(row => <p key={row.id}><strong>{row.type}</strong> · {row.department || 'جهة غير محددة'} · {row.status}</p>)}</section>
      <section><h3>الأشخاص والعلاقات</h3>{company.contacts.slice(0, 8).map(({ relation, contact: person }) => <p key={relation.id}><strong>{person?.display_name ?? 'جهة اتصال غير متاحة'}</strong> · {relation.relation_type}</p>)}</section>
      <section><h3>الوثائق</h3>{company.documents.slice(0, 8).map(row => <p key={row.id}><strong>{row.title}</strong> · {row.status}</p>)}</section>
      <section><h3>المخاطر التشغيلية</h3>{company.blockers.filter(row => !['resolved','closed','done'].includes(row.status.trim().toLowerCase())).slice(0, 8).map(row => <p key={row.id}><strong>{row.title}</strong> · {row.severity} · {row.status}</p>)}</section>
    </div> : null}
    {contact ? <div className="r2-records-related-lists">
      <section><h3>الشركات والعلاقات</h3>{contact.companyRelations.slice(0, 8).map(({ relation, company: row, current }) => <p key={relation.id}><strong>{row?.display_name || row?.legal_name || 'شركة غير متاحة'}</strong> · {relation.relation_type} · {current ? 'حالية' : 'منتهية'}</p>)}</section>
      <section><h3>المعاملات المرتبطة</h3>{contact.transactions.slice(0, 8).map(row => <p key={row.id}><strong>{row.type}</strong> · {row.department || 'جهة غير محددة'} · {row.status}</p>)}</section>
    </div> : null}
    {source.truncatedScopes.length ? <aside className="r2-records-truth" role="note"><strong>بعض السياق مقتطع عند حد القراءة الآمن</strong><span>{source.truncatedScopes.join(' · ')}</span></aside> : null}
    <aside className="r2-records-truth" role="note"><strong>مصادر الحقيقة محفوظة</strong><span>هذه الشاشة تجمع سياق 6.1 و6.2 للقراءة فقط. المالية الكاملة تبقى Phase 7.</span></aside>
  </article>;
}
