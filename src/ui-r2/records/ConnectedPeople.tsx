import { useEffect, useMemo, useState } from 'react';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { useCompanyDirectory } from '../../features/companies/useCompanies.ts';
import { useContactDirectory, useContactEditor, useContactProfile, useContactRelationshipActions } from '../../features/contacts/useContacts.ts';

function ErrorPanel({ message, onRetry }: Readonly<{ message: string; onRetry?: () => void }>) {
  return <div className="r2-contacts-error" role="alert"><strong>تعذر إكمال الطلب</strong><span>{message}</span>{onRetry && <button type="button" onClick={onRetry}>إعادة المحاولة</button>}</div>;
}

function ContactEditor({ mode, contact, onDone, onCancel }: Readonly<{ mode: 'create' | 'edit'; contact: RowOf<'contacts'> | null; onDone: (contact: RowOf<'contacts'>) => void; onCancel: () => void }>) {
  const editor = useContactEditor(mode, contact);
  useEffect(() => { if (editor.state === 'saved' && editor.savedContact) onDone(editor.savedContact); }, [editor.savedContact, editor.state, onDone]);
  const disabled = editor.state === 'saving';
  return (
    <section className="r2-contacts-editor" aria-label={mode === 'create' ? 'إضافة جهة اتصال' : 'تعديل جهة اتصال'}>
      <header><div><p className="r2-eyebrow">Phase 6.2 · سجل موثوق</p><h2>{mode === 'create' ? 'جهة اتصال جديدة' : 'تعديل البيانات'}</h2></div><button type="button" onClick={onCancel} disabled={disabled}>إلغاء</button></header>
      {editor.errorMessage && <ErrorPanel message={editor.errorMessage} />}
      <div className="r2-contacts-form">
        <label><span>الاسم</span><input value={editor.draft.displayName} onChange={(event) => editor.update('displayName', event.target.value)} disabled={disabled} />{editor.errors.displayName && <small>{editor.errors.displayName}</small>}</label>
        <label><span>النوع / الصفة</span><input value={editor.draft.contactType} onChange={(event) => editor.update('contactType', event.target.value)} placeholder="محامٍ، محامية، مدير مفوض، متابعة…" disabled={disabled} />{editor.errors.contactType && <small>{editor.errors.contactType}</small>}</label>
        <label><span>الهاتف</span><input inputMode="tel" value={editor.draft.phone} onChange={(event) => editor.update('phone', event.target.value)} disabled={disabled} />{editor.errors.phone && <small>{editor.errors.phone}</small>}</label>
        <label><span>البريد الإلكتروني</span><input inputMode="email" value={editor.draft.email} onChange={(event) => editor.update('email', event.target.value)} disabled={disabled} />{editor.errors.email && <small>{editor.errors.email}</small>}</label>
        <label className="is-wide"><span>ملاحظات</span><textarea value={editor.draft.notes} onChange={(event) => editor.update('notes', event.target.value)} disabled={disabled} />{editor.errors.notes && <small>{editor.errors.notes}</small>}</label>
        <label><span>الحالة</span><select value={editor.draft.status} onChange={(event) => editor.update('status', event.target.value)} disabled={disabled}><option value="active">نشطة</option><option value="inactive">غير نشطة</option></select></label>
      </div>
      <footer><button type="button" className="is-primary" onClick={() => void editor.save()} disabled={disabled}>{editor.state === 'saving' ? 'جارٍ الحفظ…' : 'حفظ'}</button><span>أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح.</span></footer>
    </section>
  );
}

function RelationManager({ contactId, onChanged }: Readonly<{ contactId: string; onChanged: () => void }>) {
  const companies = useCompanyDirectory();
  const actions = useContactRelationshipActions(onChanged);
  const [companyId, setCompanyId] = useState('');
  const [relationType, setRelationType] = useState('محامٍ');
  const items = companies.snapshot?.items ?? [];
  useEffect(() => { if (!companyId && items[0]) setCompanyId(items[0].id); }, [companyId, items]);
  return (
    <section className="r2-contacts-relation-create">
      <header><h3>إضافة علاقة مع شركة</h3><span>العلاقة تُكتب في company_contacts، بلا مخزن موازٍ.</span></header>
      {actions.errorMessage && <ErrorPanel message={actions.errorMessage} />}
      <label><span>ابحث عن الشركة</span><input value={companies.request.search} onChange={(event) => companies.setSearch(event.target.value)} placeholder="اسم الشركة…" /></label>
      <label><span>الشركة</span><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span>نوع العلاقة</span><input value={relationType} onChange={(event) => setRelationType(event.target.value)} /></label>
      <button type="button" className="is-primary" disabled={!companyId || !relationType.trim() || actions.state === 'saving'} onClick={() => void actions.addCompany({ companyId, contactId, relationType })}>ربط بالشركة</button>
    </section>
  );
}

function ContactProfile({ contactId, onEdit }: Readonly<{ contactId: string; onEdit: (contact: RowOf<'contacts'>) => void }>) {
  const profile = useContactProfile(contactId);
  const actions = useContactRelationshipActions(profile.retry);
  if (profile.status === 'loading') return <div className="r2-contacts-loading">جارٍ تحميل ملف الشخص…</div>;
  if (profile.status === 'error' || !profile.source) return <ErrorPanel message={profile.errorMessage ?? 'تعذر تحميل الملف.'} onRetry={profile.retry} />;
  const source = profile.source;
  const contact = source.contact;
  const currentRelations = source.companyRelations.filter((item) => item.current);
  const truncation = Object.entries(source.truncated).filter(([, value]) => value).map(([key]) => key);
  return (
    <article className="r2-contacts-profile" data-contact-profile={contact.id}>
      <header className="r2-contacts-identity"><div><p className="r2-eyebrow">الملف المرتبط</p><h2>{contact.display_name}</h2><span>{contact.contact_type} · {contact.status}</span></div><button type="button" onClick={() => onEdit(contact)} disabled={contact.merged_into_id !== null}>تعديل البيانات</button></header>
      <div className="r2-contacts-facts"><div><span>الهاتف</span><strong>{contact.phone ?? 'غير مسجل'}</strong></div><div><span>البريد</span><strong>{contact.email ?? 'غير مسجل'}</strong></div><div><span>الشركات الحالية</span><strong>{currentRelations.length}</strong></div><div><span>المعاملات المرتبطة</span><strong>{source.transactions.length}{source.truncated.transactions ? '+' : ''}</strong></div></div>
      {truncation.length > 0 && <aside className="r2-contacts-truncated" role="note">بعض السياقات تجاوزت حد القراءة الآمن ({truncation.join('، ')}). لم نعرضها كأنها كاملة.</aside>}
      <section className="r2-contacts-section"><header><h3>علاقات الشركات</h3><span>الحالية والتاريخية</span></header><div className="r2-contacts-relations">{source.companyRelations.map(({ relation, company, current }) => <div key={relation.id} className={current ? 'is-current' : ''}><div><strong>{company?.display_name || company?.legal_name || 'شركة غير متاحة'}</strong><span>{relation.relation_type} · {current ? 'حالية' : 'منتهية'}</span></div>{current && <button type="button" disabled={actions.state === 'saving'} onClick={() => void actions.endCompany(relation.id)}>إنهاء العلاقة</button>}</div>)}{source.companyRelations.length === 0 && <p>لا توجد علاقات شركة مسجلة.</p>}</div></section>
      <RelationManager contactId={contact.id} onChanged={profile.retry} />
      <section className="r2-contacts-section"><header><h3>المعاملات المرتبطة</h3><span>من primary_contact_id القانوني</span></header><div className="r2-contacts-context-list">{source.transactions.map((item) => <div key={item.id}><strong>{item.type}</strong><span>{item.status} · {item.department ?? 'بلا قسم'}</span></div>)}{source.transactions.length === 0 && <p>لا توجد معاملة تجعل هذه الجهة جهة الاتصال الأساسية حاليًا.</p>}</div></section>
      <section className="r2-contacts-section"><header><h3>السياق المالي</h3><span>مؤشرات مرتبطة بالمعاملات فقط؛ المالية الكاملة Phase 7</span></header><div className="r2-contacts-relation-strip"><div><strong>{source.payments.length}{source.truncated.payments ? '+' : ''}</strong><span>دفعات مرتبطة</span></div><div><strong>{source.ledger.length}{source.truncated.ledger ? '+' : ''}</strong><span>قيود مرتبطة</span></div></div></section>
      {contact.notes && <section className="r2-contacts-section"><header><h3>ملاحظات</h3></header><p className="r2-contacts-notes">{contact.notes}</p></section>}
      <aside className="r2-contacts-boundary" role="note">Company/Lawyer 360° الشاملة تبقى Phase 6.3. هذه الشاشة لا تفتح Finance Phase 7 ولا Documents Phase 10.</aside>
    </article>
  );
}

export function ConnectedPeople() {
  const directory = useContactDirectory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Readonly<{ mode: 'create' | 'edit'; contact: RowOf<'contacts'> | null }> | null>(null);
  const items = directory.snapshot?.items ?? [];
  useEffect(() => { if (!selectedId && items[0]) setSelectedId(items[0].id); }, [items, selectedId]);
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  return (
    <section className="r2-screen r2-contacts-screen" data-phase6-2="lawyers-contacts" data-contact-source="workspace">
      <header className="r2-contacts-header"><div><p className="r2-eyebrow">Phase 6.2 · Companies & People</p><h1>المحامون وجهات الاتصال</h1><p>أشخاص حقيقيون مرتبطون بالشركات والمعاملات، لا بطاقات منفصلة أو علاقات وهمية.</p></div><button type="button" className="is-primary" onClick={() => setEditor({ mode: 'create', contact: null })}>جهة اتصال جديدة</button></header>
      <aside className="r2-contacts-truth" role="note"><strong>مصدر الحقيقة: مساحة العمل</strong><span>العلاقات بالشركات من company_contacts، وعلاقة المعاملة من primary_contact_id. Phase 6.3 ما زالت مقفلة.</span></aside>
      {editor ? <ContactEditor mode={editor.mode} contact={editor.contact} onCancel={() => setEditor(null)} onDone={(saved) => { setEditor(null); setSelectedId(saved.id); directory.retry(); }} /> : (
        <div className="r2-contacts-workspace">
          <aside className="r2-contacts-directory" aria-label="دليل المحامين وجهات الاتصال">
            <label><span>بحث الأشخاص</span><input value={directory.request.search} onChange={(event) => directory.setSearch(event.target.value)} placeholder="اسم، صفة، هاتف، بريد…" /></label>
            <div className="r2-contacts-filters"><button type="button" className={directory.request.filter === 'all' ? 'is-active' : ''} onClick={() => directory.setFilter('all')}>الكل {directory.snapshot?.counts.all ?? 0}</button><button type="button" className={directory.request.filter === 'lawyers' ? 'is-active' : ''} onClick={() => directory.setFilter('lawyers')}>المحامون {directory.snapshot?.counts.lawyers ?? 0}</button><button type="button" className={directory.request.filter === 'active' ? 'is-active' : ''} onClick={() => directory.setFilter('active')}>النشطون {directory.snapshot?.counts.active ?? 0}</button></div>
            <label><span>الترتيب</span><select value={directory.request.sort} onChange={(event) => directory.setSort(event.target.value as typeof directory.request.sort)}><option value="activity-desc">الأحدث نشاطًا</option><option value="name-asc">الاسم</option><option value="type-asc">الصفة</option><option value="created-desc">الأحدث إنشاءً</option></select></label>
            {directory.status === 'loading' && <p>جارٍ تحميل الدليل…</p>}
            {directory.status === 'error' && <ErrorPanel message={directory.errorMessage ?? 'تعذر تحميل الدليل.'} onRetry={directory.retry} />}
            <div className="r2-contacts-list">{items.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => setSelectedId(item.id)}><span><strong>{item.displayName}</strong><small>{item.contactType}</small></span><em>{item.lawyerLike ? 'قانوني' : item.status}</em></button>)}</div>
            {directory.snapshot && directory.snapshot.filteredTotal === 0 && <p>لا توجد جهة اتصال مطابقة.</p>}
            {directory.snapshot && directory.snapshot.pageCount > 1 && <nav className="r2-contacts-pagination" aria-label="صفحات الأشخاص"><button type="button" disabled={!directory.snapshot.hasPrevious} onClick={() => directory.setPage(directory.snapshot!.page - 1)}>السابق</button><span>{directory.snapshot.page + 1} / {directory.snapshot.pageCount}</span><button type="button" disabled={!directory.snapshot.hasMore} onClick={() => directory.setPage(directory.snapshot!.page + 1)}>التالي</button></nav>}
          </aside>
          <main className="r2-contacts-main">{selectedId ? <ContactProfile contactId={selectedId} onEdit={(contact) => setEditor({ mode: 'edit', contact })} /> : <div className="r2-contacts-empty"><strong>اختر شخصًا</strong><span>ستظهر الشركات والمعاملات والسياقات المرتبطة هنا.</span></div>}</main>
        </div>
      )}
      {selectedItem?.merged && <aside className="r2-contacts-boundary" role="note">السجل المحدد مدمج؛ بقي للقراءة ولا يقبل تعديلًا جديدًا.</aside>}
    </section>
  );
}
