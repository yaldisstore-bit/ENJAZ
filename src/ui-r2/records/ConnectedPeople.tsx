import { useEffect, useState } from 'react';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { useCompanyDirectory } from '../../features/companies/useCompanies.ts';
import { useContactDirectory, useContactEditor, useContactProfile, useContactRelationshipActions } from '../../features/contacts/useContacts.ts';

function ErrorPanel({ message, retry }: Readonly<{ message: string; retry?: () => void }>) { return <div className="r2-contacts-error" role="alert"><span>{message}</span>{retry && <button onClick={retry}>إعادة المحاولة</button>}</div>; }

function ContactEditor({ mode, contact, done, cancel }: Readonly<{ mode: 'create' | 'edit'; contact: RowOf<'contacts'> | null; done: (row: RowOf<'contacts'>) => void; cancel: () => void }>) {
  const editor = useContactEditor(mode, contact), disabled = editor.state === 'saving';
  useEffect(() => { if (editor.savedContact) done(editor.savedContact); }, [done, editor.savedContact]);
  const field = (label: string, name: 'displayName' | 'contactType' | 'phone' | 'email', type?: 'tel' | 'email') => <label><span>{label}</span><input inputMode={type} value={editor.draft[name]} onChange={(e) => editor.update(name, e.target.value)} disabled={disabled} />{editor.errors[name] && <small>{editor.errors[name]}</small>}</label>;
  return <section className="r2-contacts-editor" aria-label={mode === 'create' ? 'إضافة جهة اتصال' : 'تعديل جهة اتصال'}>
    <header><h2>{mode === 'create' ? 'جهة اتصال جديدة' : 'تعديل البيانات'}</h2><button onClick={cancel} disabled={disabled}>إلغاء</button></header>
    {editor.errorMessage && <ErrorPanel message={editor.errorMessage} />}
    <div className="r2-contacts-form">{field('الاسم','displayName')}{field('النوع / الصفة','contactType')}{field('الهاتف','phone','tel')}{field('البريد الإلكتروني','email','email')}<label className="is-wide"><span>ملاحظات</span><textarea value={editor.draft.notes} onChange={(e) => editor.update('notes', e.target.value)} disabled={disabled}/>{editor.errors.notes && <small>{editor.errors.notes}</small>}</label><label><span>الحالة</span><select value={editor.draft.status} onChange={(e) => editor.update('status', e.target.value)} disabled={disabled}><option value="active">نشطة</option><option value="inactive">غير نشطة</option></select></label></div>
    <footer><button className="is-primary" onClick={() => void editor.save()} disabled={disabled}>{disabled ? 'جارٍ الحفظ…' : 'حفظ'}</button><span>النتيجة غير المؤكدة لا تُعرض كنجاح.</span></footer>
  </section>;
}

function RelationManager({ contactId, changed }: Readonly<{ contactId: string; changed: () => void }>) {
  const companies = useCompanyDirectory(), actions = useContactRelationshipActions(changed), items = companies.snapshot?.items ?? [];
  const [companyId, setCompanyId] = useState(''), [relationType, setRelationType] = useState('محامٍ');
  useEffect(() => { if (!companyId && items[0]) setCompanyId(items[0].id); }, [companyId, items]);
  return <section className="r2-contacts-relation-create"><header><h3>إضافة علاقة مع شركة</h3></header>{actions.errorMessage && <ErrorPanel message={actions.errorMessage}/>}<label><span>ابحث عن الشركة</span><input value={companies.request.search} onChange={(e) => companies.setSearch(e.target.value)}/></label><label><span>الشركة</span><select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>نوع العلاقة</span><input value={relationType} onChange={(e) => setRelationType(e.target.value)}/></label><button className="is-primary" disabled={!companyId || !relationType.trim() || actions.state === 'saving'} onClick={() => void actions.addCompany({ companyId, contactId, relationType })}>ربط بالشركة</button></section>;
}

function ContactProfile({ id, edit }: Readonly<{ id: string; edit: (row: RowOf<'contacts'>) => void }>) {
  const profile = useContactProfile(id), actions = useContactRelationshipActions(profile.retry);
  if (profile.status === 'loading') return <div className="r2-contacts-loading">جارٍ التحميل…</div>;
  if (!profile.source) return <ErrorPanel message={profile.errorMessage ?? 'تعذر تحميل الملف.'} retry={profile.retry}/>;
  const { contact, companyRelations, transactions, payments, truncated } = profile.source;
  const current = companyRelations.filter((item) => item.current).length;
  return <article className="r2-contacts-profile" data-contact-profile={contact.id}>
    <header className="r2-contacts-identity"><div><h2>{contact.display_name}</h2><span>{contact.contact_type} · {contact.status}</span></div><button onClick={() => edit(contact)} disabled={contact.merged_into_id !== null}>تعديل البيانات</button></header>
    <div className="r2-contacts-facts"><div><span>الهاتف</span><strong>{contact.phone ?? 'غير مسجل'}</strong></div><div><span>البريد</span><strong>{contact.email ?? 'غير مسجل'}</strong></div><div><span>الشركات</span><strong>{current}</strong></div><div><span>المعاملات</span><strong>{transactions.length}{truncated.transactions ? '+' : ''}</strong></div></div>
    {(truncated.companyRelations || truncated.transactions || truncated.payments) && <aside className="r2-contacts-truncated">بعض النتائج مقتطعة عند حد القراءة الآمن.</aside>}
    <section className="r2-contacts-section"><header><h3>علاقات الشركات</h3></header><div className="r2-contacts-relations">{companyRelations.map(({ relation, company, current: open }) => <div key={relation.id} className={open ? 'is-current' : ''}><div><strong>{company?.display_name || company?.legal_name || 'شركة غير متاحة'}</strong><span>{relation.relation_type} · {open ? 'حالية' : 'منتهية'}</span></div>{open && <button disabled={actions.state === 'saving'} onClick={() => void actions.endCompany(relation.id)}>إنهاء العلاقة</button>}</div>)}{!companyRelations.length && <p>لا توجد علاقات.</p>}</div></section>
    <RelationManager contactId={contact.id} changed={profile.retry}/>
    <section className="r2-contacts-section"><header><h3>المعاملات المرتبطة</h3><span>من primary_contact_id</span></header><div className="r2-contacts-context-list">{transactions.map((tx) => <div key={tx.id}><strong>{tx.type}</strong><span>{tx.status} · {tx.department ?? 'بلا قسم'}</span></div>)}{!transactions.length && <p>لا توجد معاملات مرتبطة.</p>}</div></section>
    <section className="r2-contacts-section"><header><h3>السياق المالي</h3><span>Phase 7 تبقى مستقلة</span></header><div className="r2-contacts-relation-strip"><div><strong>{payments.length}{truncated.payments ? '+' : ''}</strong><span>دفعات مرتبطة</span></div></div></section>
    {contact.notes && <p className="r2-contacts-notes">{contact.notes}</p>}
    <aside className="r2-contacts-boundary">Company/Lawyer 360° تبقى Phase 6.3.</aside>
  </article>;
}

export function ConnectedPeople() {
  const directory = useContactDirectory(), items = directory.snapshot?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null), [editor, setEditor] = useState<{ mode: 'create' | 'edit'; contact: RowOf<'contacts'> | null } | null>(null);
  useEffect(() => { if (!selectedId && items[0]) setSelectedId(items[0].id); }, [items, selectedId]);
  return <section className="r2-screen r2-contacts-screen" data-phase6-2="lawyers-contacts" data-contact-source="workspace">
    <header className="r2-contacts-header"><div><p className="r2-eyebrow">Phase 6.2</p><h1>المحامون وجهات الاتصال</h1></div><button className="is-primary" onClick={() => setEditor({ mode:'create', contact:null })}>جهة اتصال جديدة</button></header>
    <aside className="r2-contacts-truth">العلاقات بالشركات من company_contacts، والمعاملات من primary_contact_id. Phase 6.3 مقفلة.</aside>
    {editor ? <ContactEditor mode={editor.mode} contact={editor.contact} cancel={() => setEditor(null)} done={(row) => { setEditor(null); setSelectedId(row.id); directory.retry(); }}/> : <div className="r2-contacts-workspace">
      <aside className="r2-contacts-directory" aria-label="دليل المحامين وجهات الاتصال"><label><span>بحث الأشخاص</span><input value={directory.request.search} onChange={(e) => directory.setSearch(e.target.value)}/></label><div className="r2-contacts-filters"><button className={directory.request.filter === 'all' ? 'is-active' : ''} onClick={() => directory.setFilter('all')}>الكل {directory.snapshot?.counts.all ?? 0}</button><button className={directory.request.filter === 'lawyers' ? 'is-active' : ''} onClick={() => directory.setFilter('lawyers')}>المحامون {directory.snapshot?.counts.lawyers ?? 0}</button><button className={directory.request.filter === 'active' ? 'is-active' : ''} onClick={() => directory.setFilter('active')}>النشطون {directory.snapshot?.counts.active ?? 0}</button></div><label><span>الترتيب</span><select value={directory.request.sort} onChange={(e) => directory.setSort(e.target.value as typeof directory.request.sort)}><option value="activity-desc">الأحدث نشاطًا</option><option value="name-asc">الاسم</option><option value="type-asc">الصفة</option><option value="created-desc">الأحدث إنشاءً</option></select></label>{directory.status === 'loading' && <p>جارٍ التحميل…</p>}{directory.status === 'error' && <ErrorPanel message={directory.errorMessage ?? 'تعذر تحميل الدليل.'} retry={directory.retry}/>}<div className="r2-contacts-list">{items.map((item) => <button key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => setSelectedId(item.id)}><span><strong>{item.displayName}</strong><small>{item.contactType}</small></span><em>{item.lawyerLike ? 'قانوني' : item.status}</em></button>)}</div>{directory.snapshot && directory.snapshot.pageCount > 1 && <nav className="r2-contacts-pagination"><button disabled={!directory.snapshot.hasPrevious} onClick={() => directory.setPage(directory.snapshot!.page - 1)}>السابق</button><span>{directory.snapshot.page + 1}/{directory.snapshot.pageCount}</span><button disabled={!directory.snapshot.hasMore} onClick={() => directory.setPage(directory.snapshot!.page + 1)}>التالي</button></nav>}</aside>
      <main className="r2-contacts-main">{selectedId ? <ContactProfile id={selectedId} edit={(contact) => setEditor({ mode:'edit', contact })}/> : <div className="r2-contacts-empty">اختر شخصًا</div>}</main>
    </div>}
  </section>;
}
