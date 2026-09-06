import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { isSafeCompanyCapital, type CompanyDraftField } from '../../features/companies/companyModel.ts';
import type { CompanyDetailSource } from '../../features/companies/companyService.ts';
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

function CompanyEditor(props: Readonly<{ mode: 'create' | 'edit'; source: CompanyDetailSource | null; onClose: () => void; onSaved: (id: string) => void }>) {
  const row = props.mode === 'edit' ? props.source?.company ?? null : null;
  const controller = useCompanyEditor(props.mode, row);
  const reportedSavedId = useRef<string | null>(null);

  useEffect(() => {
    const id = controller.state === 'saved' ? controller.savedCompany?.id ?? null : null;
    if (id && reportedSavedId.current !== id) {
      reportedSavedId.current = id;
      props.onSaved(id);
    }
  }, [controller.savedCompany?.id, controller.state, props.onSaved]);

  if (controller.state === 'saved' && controller.savedCompany) {
    return <section className="r2-records-entity-profile r2-company-editor" data-company-editor="saved"><StatePanel title="تم حفظ الشركة" body="تم تأكيد السجل عبر Data Layer الموثوقة، وسيعاد تحميل الدليل والتفاصيل من المصدر القانوني." action={props.onClose} actionLabel="العودة إلى التفاصيل" /></section>;
  }

  const field = (name: CompanyDraftField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => controller.update(name, event.currentTarget.value);
  const errorFor = (name: CompanyDraftField) => controller.errors[name] ? <small className="r2-core-field-error" role="alert">{controller.errors[name]}</small> : null;
  return (
    <section className="r2-records-entity-profile r2-company-editor r2-core-editor" data-company-editor={props.mode}>
      <header className="r2-section-heading"><div><p className="r2-eyebrow">Phase 6.1 · Companies</p><h2>{props.mode === 'create' ? 'شركة جديدة' : 'تعديل الشركة'}</h2><p className="r2-supporting">الحقول الأساسية للشركة فقط. إدارة الأشخاص والعلاقات تبقى Phase 6.2 ولا تُفتح ضمنيًا هنا.</p></div><button type="button" className="r2-action r2-action--secondary" onClick={props.onClose}>إلغاء</button></header>
      {controller.errorMessage ? <p className="r2-core-preview-status" role="alert">{controller.errorMessage}</p> : null}
      <form className="r2-golden-form r2-core-form" noValidate onSubmit={(event) => { event.preventDefault(); void controller.save(); }}>
        <div className="r2-golden-form__grid">
          <label className="r2-golden-form__wide"><span>الاسم القانوني *</span><textarea rows={2} value={controller.draft.legalName} onChange={field('legalName')} />{errorFor('legalName')}</label>
          <label><span>الاسم المختصر</span><input value={controller.draft.displayName} onChange={field('displayName')} />{errorFor('displayName')}</label>
          <label><span>رقم التسجيل</span><input value={controller.draft.registrationNumber} onChange={field('registrationNumber')} />{errorFor('registrationNumber')}</label>
          <label><span>رأس المال</span><input inputMode="decimal" value={controller.draft.capitalInput} onChange={field('capitalInput')} placeholder="مثال: 100000000" />{errorFor('capitalInput')}</label>
          <label><span>الوضع القانوني</span><input value={controller.draft.legalStatus} onChange={field('legalStatus')} />{errorFor('legalStatus')}</label>
          <label><span>الحالة</span><select value={controller.draft.status} onChange={field('status')}><option value="active">نشطة</option><option value="inactive">غير نشطة</option></select>{errorFor('status')}</label>
          <label className="r2-golden-form__wide"><span>العنوان</span><textarea rows={2} value={controller.draft.address} onChange={field('address')} />{errorFor('address')}</label>
          <label className="r2-golden-form__wide"><span>الأنشطة</span><textarea rows={3} value={controller.draft.activities} onChange={field('activities')} />{errorFor('activities')}</label>
        </div>
        <div className="r2-golden-form__actions"><button type="submit" className="r2-action r2-action--primary" disabled={controller.state === 'saving'}>{controller.state === 'saving' ? 'جارٍ الحفظ…' : props.mode === 'create' ? 'إنشاء الشركة' : 'حفظ التعديلات'}</button><span>أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح.</span></div>
      </form>
    </section>
  );
}

function TransactionRows({ source, openTransaction }: Readonly<{ source: CompanyDetailSource; openTransaction?: ((id: string) => void) | undefined }>) {
  if (!source.transactions.length) return <p>لا توجد معاملات مرتبطة.</p>;
  return <>{source.transactions.slice(0, 5).map((row): ReactNode => {
    const copy = <span><strong>{row.type}</strong><small>{row.department || 'جهة غير محددة'} · {row.status}</small></span>;
    return openTransaction
      ? <button key={row.id} type="button" className="r2-company-context-row" onClick={() => openTransaction(row.id)}>{copy}<b>فتح ←</b></button>
      : <div key={row.id} className="r2-company-context-row">{copy}</div>;
  })}</>;
}

function CompanyDetailView(props: Readonly<{ source: CompanyDetailSource; onEdit: () => void; openTransaction?: ((id: string) => void) | undefined }>) {
  const source = props.source;
  const company = source.company;
  const activeBlockers = source.blockers.filter((row) => !['resolved', 'closed', 'done'].includes(row.status.trim().toLowerCase()));
  const postedPayments = source.payments.filter((row) => row.status.trim().toLowerCase() === 'posted');
  const postedTotal = postedPayments.reduce((sum, row) => sum + row.amount, 0);
  const financeSafe = postedPayments.every((row) => isSafeCompanyCapital(row.amount)) && isSafeCompanyCapital(postedTotal);
  const truncated = Object.entries(source.truncated).filter(([, value]) => value).map(([key]) => key);

  return (
    <article className="r2-records-entity-profile r2-company-detail" data-company-profile={company.id}>
      <div className="r2-records-profile-identity"><span className="r2-records-profile-icon" aria-hidden="true">ش</span><div><p>الشركة المحددة</p><h2>{company.display_name?.trim() || company.legal_name}</h2><span>{company.legal_name}</span></div><strong>{companyStatus(company.status, company.merged_into_id !== null)}</strong></div>
      <div className="r2-golden-form__actions"><button type="button" className="r2-action r2-action--secondary" disabled={company.merged_into_id !== null} onClick={props.onEdit}>تعديل البيانات</button></div>
      <div className="r2-records-facts"><div><span>رقم التسجيل</span><strong>{company.registration_number || 'غير محدد'}</strong></div><div><span>رأس المال</span><strong>{money(company.capital)}</strong></div><div><span>الوضع القانوني</span><strong>{company.legal_status || 'غير محدد'}</strong></div><div><span>آخر تحديث</span><strong>{dateTime(company.updated_at)}</strong></div></div>
      <section className="r2-golden-panel"><div className="r2-golden-panel__heading"><div><span>هوية الشركة</span><h3>العنوان والأنشطة</h3></div></div><div className="r2-golden-line-items"><article><div><strong>{company.address || 'عنوان غير محدد'}</strong><small>العنوان المسجل</small></div></article><article><div><strong>{company.activities || 'لا توجد أنشطة مسجلة.'}</strong><small>الأنشطة</small></div></article></div></section>
      <section className="r2-records-relations" aria-label="علاقات الشركة"><header><div><span>خريطة العلاقات في 6.1</span></div><small>قراءة مترابطة بلا منطق أعمال موازٍ</small></header><div className="r2-records-relation-strip"><div><strong>{source.transactions.length}{source.truncated.transactions ? '+' : ''}</strong><span>معاملات</span></div><div><strong>{source.contacts.length}{source.truncated.contacts ? '+' : ''}</strong><span>أشخاص</span></div><div><strong>{source.documents.length}{source.truncated.documents ? '+' : ''}</strong><span>وثائق</span></div></div></section>
      <div className="r2-records-related-lists">
        <section><h3>المعاملات المرتبطة</h3><TransactionRows source={source} openTransaction={props.openTransaction} /></section>
        <section><h3>الأشخاص والعلاقات</h3><small>إدارة العلاقات في Phase 6.2</small>{source.contacts.slice(0, 5).map(({ relation, contact }) => <p key={relation.id}><strong>{contact?.display_name ?? 'جهة اتصال غير متاحة'}</strong> · {relation.relation_type}{contact?.phone ? ` · ${contact.phone}` : ''}</p>)}{!source.contacts.length ? <p>لا توجد علاقات أشخاص مسجلة.</p> : null}</section>
        <section><h3>الوثائق</h3><small>قراءة فقط حتى Phase 10</small>{source.documents.slice(0, 5).map((row) => <p key={row.id}><strong>{row.title}</strong> · {row.document_type || row.mime_type} · {row.status}</p>)}{!source.documents.length ? <p>لا توجد وثائق مرتبطة.</p> : null}</section>
        <section><h3>النبضة المالية</h3><small>Phase 7 تبقى المرجع المالي الكامل</small><p><strong>{financeSafe ? money(postedTotal) : 'قيمة غير آمنة للعرض الدقيق'}</strong> · {postedPayments.length} دفعات posted · {source.ledger.length} قيود مرتبطة</p></section>
        <section><h3>النشاط</h3>{source.activity.slice(0, 5).map((row) => <p key={row.id}><strong>{row.title}</strong> · {dateTime(row.effective_at)} · {row.event_type}</p>)}{!source.activity.length ? <p>لا يوجد نشاط مسجل لهذا الكيان.</p> : null}</section>
        <section><h3>المخاطر التشغيلية</h3>{activeBlockers.slice(0, 5).map((row) => <p key={row.id}><strong>{row.title}</strong> · {row.severity} · {row.status}</p>)}{!activeBlockers.length ? <p>لا توجد عوائق مفتوحة ضمن البيانات المحمّلة.</p> : null}</section>
      </div>
      {truncated.length ? <aside className="r2-records-truth" role="note"><strong>بعض العلاقات تجاوزت حد العرض الآمن</strong><span>تم الإعلان عن النطاق المقتطع صراحةً ({truncated.join(' · ')}) ولم تُقدّم النتائج كأنها كاملة.</span></aside> : null}
    </article>
  );
}

export function ConnectedCompanies({ openTransaction }: Readonly<{ openTransaction?: ((id: string) => void) | undefined }> = {}) {
  const directory = useCompanyDirectory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const detail = useCompanyDetail(selectedId);

  useEffect(() => {
    if (!selectedId && directory.snapshot?.items[0]) setSelectedId(directory.snapshot.items[0].id);
  }, [directory.snapshot, selectedId]);

  const subtitle = useMemo(() => directory.snapshot ? `${directory.snapshot.filteredTotal} نتيجة · ${directory.snapshot.counts.active} نشطة` : 'بيانات مساحة العمل الموثوقة', [directory.snapshot]);
  if (directory.status === 'loading') return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="جارٍ تحميل الشركات" body="تُقرأ قائمة الشركات من مساحة العمل الحالية دون fixtures إنتاجية." /></div>;
  if (directory.status === 'error' || !directory.snapshot) return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="تعذر تحميل الشركات" body={directory.errorMessage ?? 'تعذر تجهيز دليل الشركات.'} action={directory.retry} /></div>;
  const snapshot = directory.snapshot;

  const saved = (id: string) => {
    setSelectedId(id);
    directory.retry();
    detail.retry();
  };

  let main: ReactNode;
  if (editorMode) main = <CompanyEditor mode={editorMode} source={detail.source} onClose={() => setEditorMode(null)} onSaved={saved} />;
  else if (!selectedId) main = <article className="r2-records-entity-profile"><StatePanel title="اختر شركة" body="حدد شركة من الدليل لعرض التفاصيل المترابطة." /></article>;
  else if (detail.status === 'loading') main = <article className="r2-records-entity-profile"><StatePanel title="جارٍ تحميل الشركة" body="تُجمع العلاقات من مصادرها القانونية دون تخمين." /></article>;
  else if (detail.status === 'error' || !detail.source) main = <article className="r2-records-entity-profile"><StatePanel title="تعذر تحميل تفاصيل الشركة" body={detail.errorMessage ?? 'تعذر تجهيز التفاصيل.'} action={detail.retry} /></article>;
  else main = <CompanyDetailView source={detail.source} onEdit={() => setEditorMode('edit')} openTransaction={openTransaction} />;

  return (
    <section className="r2-screen r2-records-screen r2-companies-connected" data-records-domain="companies" data-phase6-1="companies" data-company-source="workspace">
      <header className="r2-records-header"><div><p className="r2-eyebrow">Phase 6.1 · Companies · متصل</p><h1>الشركات</h1><p>دليل قانوني واحد للشركة: بحث وتصفية وإنشاء وتعديل وتفاصيل مترابطة من مصادر الحقيقة الحالية.</p></div><button type="button" className="r2-action r2-action--primary" onClick={() => setEditorMode('create')}>＋ شركة جديدة</button></header>
      <aside className="r2-records-truth" role="note"><strong>حدود 6.1 محفوظة</strong><span>إدارة الأشخاص والعلاقات الكاملة تبقى Phase 6.2، وCompany/Lawyer 360° تبقى Phase 6.3، والمالية الكاملة Phase 7 والوثائق Phase 10.</span></aside>
      <div className="r2-core-toolbar"><label className="r2-transaction-search"><span aria-hidden="true">⌕</span><input aria-label="بحث الشركات" value={directory.request.search} onChange={(event) => directory.setSearch(event.target.value)} placeholder="اسم، رقم تسجيل، عنوان، نشاط…" /></label><label className="r2-core-sort"><span>ترتيب</span><select aria-label="ترتيب الشركات" value={directory.request.sort} onChange={(event) => directory.setSort(event.target.value as typeof directory.request.sort)}><option value="activity-desc">آخر تحديث</option><option value="name-asc">الاسم</option><option value="created-desc">الأحدث إنشاءً</option><option value="capital-desc">رأس المال</option></select></label></div>
      <div className="r2-segment r2-core-segment" aria-label="تصفية الشركات">{([['all','الكل'],['active','نشطة'],['inactive','غير نشطة']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={directory.request.filter === value} onClick={() => directory.setFilter(value)}>{label} <span>{snapshot.counts[value]}</span></button>)}</div>
      <div className="r2-records-workspace r2-records-workspace--company"><aside className="r2-records-directory" aria-label="دليل الشركات"><p className="r2-supporting">{subtitle} · صفحة {snapshot.page + 1} / {snapshot.pageCount}</p><div className="r2-records-directory-list">{snapshot.items.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => { setSelectedId(item.id); setEditorMode(null); }}><span className="r2-records-entity-mark">ش</span><span><strong>{item.label}</strong><small>{item.registrationNumber || item.address || 'دون رقم تسجيل أو عنوان'}</small></span><em>{companyStatus(item.status, item.merged)}</em></button>)}{!snapshot.items.length ? <p className="r2-records-empty">لا توجد شركة مطابقة للبحث والتصفية الحالية.</p> : null}</div><footer className="r2-core-pagination"><div /><div><button type="button" disabled={!snapshot.hasPrevious} onClick={() => directory.setPage(snapshot.page - 1)}>السابق</button><button type="button" disabled={!snapshot.hasMore} onClick={() => directory.setPage(snapshot.page + 1)}>التالي</button></div></footer></aside>{main}</div>
    </section>
  );
}
