import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { isSafeCompanyCapital, type CompanyDraftField } from '../../features/companies/companyModel.ts';
import { useCompanyDetail, useCompanyDirectory, useCompanyEditor } from '../../features/companies/useCompanies.ts';

function StatePanel(props: Readonly<{ title: string; body: string; action?: (() => void) | undefined; actionLabel?: string | undefined }>) {
  return <section className="r2-core-state" role="status"><strong>{props.title}</strong><p>{props.body}</p>{props.action ? <button type="button" className="r2-action r2-action--secondary" onClick={props.action}>{props.actionLabel ?? 'إعادة المحاولة'}</button> : null}</section>;
}

function money(value: number | null): string {
  if (value === null) return 'غير محدد';
  if (!isSafeCompanyCapital(value)) return 'قيمة غير آمنة للعرض الدقيق';
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع`;
}

function dateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'تاريخ غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function companyStatus(value: string, merged: boolean): string {
  if (merged) return 'مدمجة';
  return value.trim().toLowerCase() === 'active' ? 'نشطة' : 'غير نشطة';
}

function CompanyEditor(props: Readonly<{ mode: 'create' | 'edit'; company: ReturnType<typeof useCompanyDetail>['source'] extends infer T ? any : never; onClose: () => void; onSaved: (id: string) => void }>) {
  const row = props.mode === 'edit' ? props.company?.company ?? null : null;
  const controller = useCompanyEditor(props.mode, row);
  useEffect(() => {
    if (controller.state === 'saved' && controller.savedCompany) props.onSaved(controller.savedCompany.id);
  }, [controller.savedCompany, controller.state, props]);

  if (controller.state === 'saved' && controller.savedCompany) {
    return <section className="r2-records-entity-profile r2-company-editor" data-company-editor="saved"><StatePanel title="تم حفظ الشركة" body="تم تأكيد السجل عبر Data Layer الموثوقة. تم تحديث الدليل والتفاصيل من المصدر القانوني." action={props.onClose} actionLabel="العودة إلى التفاصيل" /></section>;
  }

  const field = (name: CompanyDraftField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => controller.update(name, event.currentTarget.value);
  const errorFor = (name: CompanyDraftField) => controller.errors[name] ? <small className="r2-core-field-error" role="alert">{controller.errors[name]}</small> : null;
  return (
    <section className="r2-records-entity-profile r2-company-editor" data-company-editor={props.mode}>
      <header className="r2-company-editor__header"><div><p className="r2-eyebrow">Phase 6.1 · Companies</p><h2>{props.mode === 'create' ? 'شركة جديدة' : 'تعديل الشركة'}</h2><p>الحقول الأساسية فقط. إدارة الأشخاص والعلاقات تبقى Phase 6.2 ولا تُفتح ضمنيًا هنا.</p></div><button type="button" className="r2-action r2-action--secondary" onClick={props.onClose}>إلغاء</button></header>
      {controller.errorMessage ? <p className="r2-core-preview-status" role="alert">{controller.errorMessage}</p> : null}
      <div className="r2-company-form-grid">
        <label className="is-wide"><span>الاسم القانوني *</span><textarea rows={2} value={controller.draft.legalName} onChange={field('legalName')} />{errorFor('legalName')}</label>
        <label><span>الاسم المختصر</span><input value={controller.draft.displayName} onChange={field('displayName')} />{errorFor('displayName')}</label>
        <label><span>رقم التسجيل</span><input value={controller.draft.registrationNumber} onChange={field('registrationNumber')} />{errorFor('registrationNumber')}</label>
        <label><span>رأس المال</span><input inputMode="decimal" value={controller.draft.capitalInput} onChange={field('capitalInput')} placeholder="مثال: 100000000" />{errorFor('capitalInput')}</label>
        <label><span>الوضع القانوني</span><input value={controller.draft.legalStatus} onChange={field('legalStatus')} />{errorFor('legalStatus')}</label>
        <label><span>الحالة</span><select value={controller.draft.status} onChange={field('status')}><option value="active">نشطة</option><option value="inactive">غير نشطة</option></select>{errorFor('status')}</label>
        <label className="is-wide"><span>العنوان</span><textarea rows={2} value={controller.draft.address} onChange={field('address')} />{errorFor('address')}</label>
        <label className="is-wide"><span>الأنشطة</span><textarea rows={3} value={controller.draft.activities} onChange={field('activities')} />{errorFor('activities')}</label>
      </div>
      <footer className="r2-company-editor__actions"><button type="button" className="r2-action r2-action--primary" disabled={controller.state === 'saving'} onClick={() => { void controller.save(); }}>{controller.state === 'saving' ? 'جارٍ الحفظ…' : props.mode === 'create' ? 'إنشاء الشركة' : 'حفظ التعديلات'}</button><span>أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح.</span></footer>
    </section>
  );
}

function CompanyDetail(props: Readonly<{ companyId: string; onEdit: () => void; openTransaction: (id: string) => void }>) {
  const controller = useCompanyDetail(props.companyId);
  if (controller.status === 'loading') return <section className="r2-records-entity-profile"><StatePanel title="جارٍ تحميل الشركة" body="تُجمع العلاقات من مصادرها القانونية دون تخمين." /></section>;
  if (controller.status === 'error' || !controller.source) return <section className="r2-records-entity-profile"><StatePanel title="تعذر تحميل تفاصيل الشركة" body={controller.errorMessage ?? 'تعذر تجهيز التفاصيل.'} action={controller.retry} /></section>;
  const source = controller.source;
  const company = source.company;
  const activeBlockers = source.blockers.filter((row) => !['resolved', 'closed', 'done'].includes(row.status.trim().toLowerCase()));
  const postedPayments = source.payments.filter((row) => row.status.trim().toLowerCase() === 'posted');
  const postedTotal = postedPayments.reduce((sum, row) => sum + row.amount, 0);
  const financeSafe = postedPayments.every((row) => isSafeCompanyCapital(row.amount)) && isSafeCompanyCapital(postedTotal);
  const truncated = Object.entries(source.truncated).filter(([, value]) => value).map(([key]) => key);

  return (
    <article className="r2-records-entity-profile r2-company-detail" data-company-profile={company.id}>
      <div className="r2-records-profile-identity"><span className="r2-records-profile-icon" aria-hidden="true">ش</span><div><p>الشركة المحددة</p><h2>{company.display_name?.trim() || company.legal_name}</h2><span>{company.legal_name}</span></div><strong>{companyStatus(company.status, company.merged_into_id !== null)}</strong></div>
      <div className="r2-company-detail__actions"><button type="button" className="r2-action r2-action--secondary" disabled={company.merged_into_id !== null} onClick={props.onEdit}>تعديل البيانات</button></div>
      <div className="r2-records-facts">
        <div><span>رقم التسجيل</span><strong>{company.registration_number || 'غير محدد'}</strong></div>
        <div><span>رأس المال</span><strong>{money(company.capital)}</strong></div>
        <div><span>الوضع القانوني</span><strong>{company.legal_status || 'غير محدد'}</strong></div>
        <div><span>آخر تحديث</span><strong>{dateTime(company.updated_at)}</strong></div>
      </div>
      <section className="r2-company-copy-block"><span>العنوان</span><strong>{company.address || 'غير محدد'}</strong><span>الأنشطة</span><p>{company.activities || 'لا توجد أنشطة مسجلة.'}</p></section>

      <section className="r2-records-relations" aria-label="علاقات الشركة"><header><div><span>خريطة العلاقات في 6.1</span></div><small>قراءة مترابطة بلا إنشاء منطق أعمال موازٍ</small></header><div className="r2-records-relation-strip"><div><strong>{source.transactions.length}{source.truncated.transactions ? '+' : ''}</strong><span>معاملات</span></div><div><strong>{source.contacts.length}{source.truncated.contacts ? '+' : ''}</strong><span>أشخاص</span></div><div><strong>{source.documents.length}{source.truncated.documents ? '+' : ''}</strong><span>وثائق</span></div></div></section>

      <div className="r2-company-context-grid">
        <section><header><h3>المعاملات المرتبطة</h3><small>{source.transactions.length} محمّلة</small></header>{source.transactions.slice(0, 5).map((row) => <button key={row.id} type="button" className="r2-company-context-row" onClick={() => props.openTransaction(row.id)}><span><strong>{row.type}</strong><small>{row.department || 'جهة غير محددة'} · {row.status}</small></span><b>فتح ←</b></button>)}{!source.transactions.length ? <p>لا توجد معاملات مرتبطة.</p> : null}</section>
        <section><header><h3>الأشخاص والعلاقات</h3><small>إدارة العلاقات في Phase 6.2</small></header>{source.contacts.slice(0, 5).map(({ relation, contact }) => <div key={relation.id} className="r2-company-context-row"><span><strong>{contact?.display_name ?? 'جهة اتصال غير متاحة'}</strong><small>{relation.relation_type}{contact?.phone ? ` · ${contact.phone}` : ''}</small></span></div>)}{!source.contacts.length ? <p>لا توجد علاقات أشخاص مسجلة.</p> : null}</section>
        <section><header><h3>الوثائق</h3><small>قراءة فقط حتى Phase 10</small></header>{source.documents.slice(0, 5).map((row) => <div key={row.id} className="r2-company-context-row"><span><strong>{row.title}</strong><small>{row.document_type || row.mime_type} · {row.status}</small></span></div>)}{!source.documents.length ? <p>لا توجد وثائق مرتبطة.</p> : null}</section>
        <section><header><h3>النبضة المالية</h3><small>Phase 7 تبقى المرجع المالي الكامل</small></header><div className="r2-company-finance"><strong>{financeSafe ? money(postedTotal) : 'قيمة غير آمنة للعرض الدقيق'}</strong><span>{postedPayments.length} دفعات posted · {source.ledger.length} قيود مرتبطة</span></div></section>
        <section><header><h3>النشاط</h3><small>entity_lifecycle_events</small></header>{source.activity.slice(0, 5).map((row) => <div key={row.id} className="r2-company-context-row"><span><strong>{row.title}</strong><small>{dateTime(row.effective_at)} · {row.event_type}</small></span></div>)}{!source.activity.length ? <p>لا يوجد نشاط مسجل لهذا الكيان.</p> : null}</section>
        <section className={activeBlockers.length ? 'has-risk' : ''}><header><h3>المخاطر التشغيلية</h3><small>مشتقة من عوائق معاملات الشركة</small></header>{activeBlockers.slice(0, 5).map((row) => <div key={row.id} className="r2-company-context-row"><span><strong>{row.title}</strong><small>{row.severity} · {row.status}</small></span></div>)}{!activeBlockers.length ? <p>لا توجد عوائق مفتوحة ضمن البيانات المحمّلة.</p> : null}</section>
      </div>
      {truncated.length ? <aside className="r2-records-truth" role="note"><strong>بعض العلاقات تجاوزت حد العرض الآمن</strong><span>تم الإعلان عن النطاق المقتطع صراحةً ({truncated.join(' · ')}) ولم تُقدّم النتائج كأنها كاملة.</span></aside> : null}
    </article>
  );
}

export function ConnectedCompanies({ openTransaction }: Readonly<{ openTransaction: (id: string) => void }>) {
  const directory = useCompanyDirectory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const detail = useCompanyDetail(selectedId);

  useEffect(() => {
    if (!selectedId && directory.snapshot?.items[0]) setSelectedId(directory.snapshot.items[0].id);
  }, [directory.snapshot, selectedId]);

  const selectedRow = detail.source?.company ?? null;
  const subtitle = useMemo(() => directory.snapshot ? `${directory.snapshot.filteredTotal} نتيجة · ${directory.snapshot.counts.active} نشطة` : 'بيانات مساحة العمل الموثوقة', [directory.snapshot]);

  if (directory.status === 'loading') return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="جارٍ تحميل الشركات" body="تُقرأ قائمة الشركات من مساحة العمل الحالية دون fixtures إنتاجية." /></div>;
  if (directory.status === 'error' || !directory.snapshot) return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="تعذر تحميل الشركات" body={directory.errorMessage ?? 'تعذر تجهيز دليل الشركات.'} action={directory.retry} /></div>;
  const snapshot = directory.snapshot;

  return (
    <section className="r2-screen r2-records-screen r2-companies-connected" data-records-domain="companies" data-phase6-1="companies" data-company-source="workspace">
      <header className="r2-records-header"><div><p className="r2-eyebrow">Phase 6.1 · Companies · متصل</p><h1>الشركات</h1><p>دليل قانوني واحد للشركة: بحث وتصفية وإنشاء وتعديل وتفاصيل مترابطة من مصادر الحقيقة الحالية.</p></div><button type="button" className="r2-action r2-action--primary" onClick={() => setEditorMode('create')}>＋ شركة جديدة</button></header>
      <aside className="r2-records-truth" role="note"><strong>حدود 6.1 محفوظة</strong><span>إدارة الأشخاص والعلاقات الكاملة تبقى 6.2، وCompany/Lawyer 360° تبقى 6.3، والمالية الكاملة Phase 7 والوثائق Phase 10.</span></aside>
      <div className="r2-core-toolbar r2-company-toolbar"><label className="r2-transaction-search"><span aria-hidden="true">⌕</span><input aria-label="بحث الشركات" value={directory.request.search} onChange={(event) => directory.setSearch(event.target.value)} placeholder="اسم، رقم تسجيل، عنوان، نشاط…" /></label><label className="r2-core-sort"><span>ترتيب</span><select aria-label="ترتيب الشركات" value={directory.request.sort} onChange={(event) => directory.setSort(event.target.value as typeof directory.request.sort)}><option value="activity-desc">آخر تحديث</option><option value="name-asc">الاسم</option><option value="created-desc">الأحدث إنشاءً</option><option value="capital-desc">رأس المال</option></select></label></div>
      <div className="r2-segment r2-core-segment" aria-label="تصفية الشركات">{([['all','الكل'],['active','نشطة'],['inactive','غير نشطة']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={directory.request.filter === value} onClick={() => directory.setFilter(value)}>{label} <span>{snapshot.counts[value]}</span></button>)}</div>
      <div className="r2-records-workspace r2-records-workspace--company">
        <aside className="r2-records-directory" aria-label="دليل الشركات"><div className="r2-company-directory-meta"><strong>{subtitle}</strong><span>صفحة {snapshot.page + 1} / {snapshot.pageCount}</span></div><div className="r2-records-directory-list">{snapshot.items.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => { setSelectedId(item.id); setEditorMode(null); }}><span className="r2-records-entity-mark">ش</span><span><strong>{item.label}</strong><small>{item.registrationNumber || item.address || 'دون رقم تسجيل أو عنوان'}</small></span><em>{companyStatus(item.status, item.merged)}</em></button>)}{!snapshot.items.length ? <p className="r2-records-empty">لا توجد شركة مطابقة للبحث والتصفية الحالية.</p> : null}</div><footer className="r2-core-pagination"><div /><div><button type="button" disabled={!snapshot.hasPrevious} onClick={() => directory.setPage(snapshot.page - 1)}>السابق</button><button type="button" disabled={!snapshot.hasMore} onClick={() => directory.setPage(snapshot.page + 1)}>التالي</button></div></footer></aside>
        {editorMode ? <CompanyEditor mode={editorMode} company={detail.source} onClose={() => setEditorMode(null)} onSaved={(id) => { setSelectedId(id); directory.retry(); detail.retry(); }} /> : selectedId ? <CompanyDetail companyId={selectedId} onEdit={() => { if (selectedRow?.merged_into_id === null) setEditorMode('edit'); }} openTransaction={openTransaction} /> : <article className="r2-records-entity-profile"><StatePanel title="اختر شركة" body="حدد شركة من الدليل لعرض تفاصيلها المترابطة." /></article>}
      </div>
    </section>
  );
}
