import type { Entity360Source } from '../../features/entity360/entity360Service.ts';

const number = (value: number) => new Intl.NumberFormat('ar-IQ').format(value);
const cash = (value: number | null) => value !== null && Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100)) ? `${number(value)} د.ع` : value === null ? 'غير محدد' : 'قيمة غير آمنة';
const pulse = (source: Entity360Source) => !source.finance.safe || source.finance.amount === null ? 'قيمة غير آمنة' : `${number(source.finance.amount)} د.ع${source.finance.partial ? ' · جزئي' : ''}`;

export function Entity360Panel({ source, openTransaction }: Readonly<{ source: Entity360Source; openTransaction?: ((id: string) => void) | undefined }>) {
  const company = source.kind === 'company' ? source.company : null, contact = source.kind === 'contact' ? source.contact : null;
  const tx = (row: { id: string; type: string; department: string | null; status: string }) => openTransaction
    ? <button key={row.id} type="button" className="r2-company-context-row" onClick={() => openTransaction(row.id)}><span><strong>{row.type}</strong><small>{row.department || 'جهة غير محددة'} · {row.status}</small></span><b>فتح ←</b></button>
    : <p key={row.id}><strong>{row.type}</strong> · {row.department || 'جهة غير محددة'} · {row.status}</p>;
  return <article className="r2-records-entity-profile" data-phase6-3="company-lawyer-360" data-entity360-kind={source.kind} data-entity360-id={source.id}>
    <header className="r2-section-heading"><div><p className="r2-eyebrow">Phase 6.3 · 360°</p><h2>{source.title}</h2><p className="r2-supporting">{source.subtitle}</p></div><strong>{source.status}</strong></header>
    <div className="r2-records-facts"><div><span>المعاملات</span><strong>{number(source.counts.transactions)}</strong></div><div><span>{source.kind === 'company' ? 'الأشخاص' : 'الشركات الحالية'}</span><strong>{number(source.kind === 'company' ? source.counts.contacts : source.counts.companies)}</strong></div><div><span>السياق المالي</span><strong>{pulse(source)}</strong></div><div><span>{source.kind === 'company' ? 'الوثائق' : 'الحالة'}</span><strong>{source.kind === 'company' ? number(source.counts.documents) : source.status}</strong></div></div>
    {company ? <><section className="r2-golden-panel"><div className="r2-golden-panel__heading"><div><span>هوية الشركة</span><h3>البيانات القانونية</h3></div></div><div className="r2-golden-line-items"><article><div><strong>{company.company.registration_number || 'غير محدد'}</strong><small>رقم التسجيل</small></div></article><article><div><strong>{cash(company.company.capital)}</strong><small>رأس المال</small></div></article><article><div><strong>{company.company.legal_status || 'غير محدد'}</strong><small>الوضع القانوني</small></div></article><article><div><strong>{company.company.address || 'عنوان غير محدد'}</strong><small>العنوان</small></div></article><article><div><strong>{company.company.activities || 'لا توجد أنشطة مسجلة.'}</strong><small>الأنشطة</small></div></article></div></section><div className="r2-records-related-lists">
      <section><h3>المعاملات</h3>{company.transactions.length ? company.transactions.slice(0,8).map(tx) : <p>لا توجد معاملات مرتبطة.</p>}</section>
      <section><h3>الأشخاص والعلاقات</h3>{company.contacts.slice(0,8).map(({relation,contact:person})=><p key={relation.id}><strong>{person?.display_name??'جهة اتصال غير متاحة'}</strong> · {relation.relation_type}</p>)}</section>
      <section><h3>الوثائق</h3>{company.documents.slice(0,8).map(row=><p key={row.id}><strong>{row.title}</strong> · {row.status}</p>)}</section>
      <section><h3>النشاط</h3>{company.activity.slice(0,8).map(row=><p key={row.id}><strong>{row.title}</strong> · {row.event_type}</p>)}</section>
      <section><h3>المخاطر التشغيلية</h3>{company.blockers.filter(row=>!['resolved','closed','done'].includes(row.status.trim().toLowerCase())).slice(0,8).map(row=><p key={row.id}><strong>{row.title}</strong> · {row.severity} · {row.status}</p>)}</section>
    </div></> : null}
    {contact ? <><div className="r2-records-facts"><div><span>الهاتف</span><strong>{contact.contact.phone || 'غير مسجل'}</strong></div><div><span>البريد</span><strong>{contact.contact.email || 'غير مسجل'}</strong></div></div><div className="r2-records-related-lists"><section><h3>الشركات والعلاقات</h3>{contact.companyRelations.map(({relation,company:row,current})=><p key={relation.id}><strong>{row?.display_name||row?.legal_name||'شركة غير متاحة'}</strong> · {relation.relation_type} · {current?'حالية':'منتهية'}</p>)}</section><section><h3>المعاملات المرتبطة</h3>{contact.transactions.map(tx)}</section></div>{contact.contact.notes ? <p className="r2-contacts-notes">{contact.contact.notes}</p> : null}</> : null}
    {source.truncatedScopes.length ? <aside className="r2-records-truth" role="note"><strong>سياق جزئي عند حد القراءة</strong><span>{source.truncatedScopes.join(' · ')}</span></aside> : null}
    <aside className="r2-records-truth" role="note"><strong>مصادر الحقيقة محفوظة</strong><span>360° تجمع سياق 6.1 و6.2 فقط. المالية الكاملة Phase 7.</span></aside>
  </article>;
}
