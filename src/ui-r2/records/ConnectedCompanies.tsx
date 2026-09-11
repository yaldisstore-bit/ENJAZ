import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import type { CompanyDraftField } from '../../features/companies/companyModel.ts';
import type { CompanyDetailSource } from '../../features/companies/companyService.ts';
import { useCompanyDetail, useCompanyDirectory, useCompanyEditor } from '../../features/companies/useCompanies.ts';
import { buildCompany360Source } from '../../features/entity360/entity360Service.ts';
import { CompanyGovernancePanel } from '../governance/CompanyGovernancePanel.tsx';
import { Entity360Panel } from './Entity360Panel.tsx';

function StatePanel(props: Readonly<{ title: string; body: string; action?: (() => void) | undefined; actionLabel?: string | undefined }>) {
  return <section className="r2-core-state" role="status"><strong>{props.title}</strong><p>{props.body}</p>{props.action ? <button type="button" className="r2-action r2-action--secondary" onClick={props.action}>{props.actionLabel ?? 'إعادة المحاولة'}</button> : null}</section>;
}
function companyStatus(value: string, merged: boolean) { return merged ? 'مدمجة' : value.trim().toLowerCase() === 'active' ? 'نشطة' : 'غير نشطة'; }

function CompanyEditor(props: Readonly<{ mode: 'create' | 'edit'; source: CompanyDetailSource | null; onClose: () => void; onSaved: (id: string) => void }>) {
  const row = props.mode === 'edit' ? props.source?.company ?? null : null, controller = useCompanyEditor(props.mode, row);
  if (controller.state === 'saved' && controller.savedCompany) {
    const savedId = controller.savedCompany.id;
    return <section className="r2-records-entity-profile r2-company-editor" data-company-editor="saved"><StatePanel title="تم حفظ الشركة" body="تم تأكيد السجل عبر Data Layer الموثوقة، وسيعاد تحميل الدليل والتفاصيل من المصدر القانوني عند العودة." action={() => { props.onSaved(savedId); props.onClose(); }} actionLabel="العودة إلى التفاصيل" /></section>;
  }
  const field = (name: CompanyDraftField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => controller.update(name, event.currentTarget.value);
  const errorFor = (name: CompanyDraftField) => controller.errors[name] ? <small className="r2-core-field-error" role="alert">{controller.errors[name]}</small> : null;
  return <section className="r2-records-entity-profile r2-company-editor r2-core-editor" data-company-editor={props.mode}>
    <header className="r2-section-heading"><div><p className="r2-eyebrow">Phase 6.1 · Companies</p><h2>{props.mode === 'create' ? 'شركة جديدة' : 'تعديل الشركة'}</h2><p className="r2-supporting">الحقول الأساسية للشركة فقط. إدارة الأشخاص والعلاقات تبقى في مسارها القانوني.</p></div><button type="button" className="r2-action r2-action--secondary" onClick={props.onClose}>إلغاء</button></header>
    {controller.errorMessage ? <p className="r2-core-preview-status" role="alert">{controller.errorMessage}</p> : null}
    <form className="r2-golden-form r2-core-form" noValidate onSubmit={(event) => { event.preventDefault(); void controller.save(); }}><div className="r2-golden-form__grid">
      <label className="r2-golden-form__wide"><span>الاسم القانوني *</span><textarea rows={2} value={controller.draft.legalName} onChange={field('legalName')} />{errorFor('legalName')}</label>
      <label><span>الاسم المختصر</span><input value={controller.draft.displayName} onChange={field('displayName')} />{errorFor('displayName')}</label><label><span>رقم التسجيل</span><input value={controller.draft.registrationNumber} onChange={field('registrationNumber')} />{errorFor('registrationNumber')}</label>
      {props.mode === 'create' ? <label><span>رأس المال الأولي</span><input inputMode="decimal" value={controller.draft.capitalInput} onChange={field('capitalInput')} placeholder="مثال: 100000000" />{errorFor('capitalInput')}</label> : <label><span>رأس المال</span><input value={controller.draft.capitalInput} readOnly aria-readonly="true" /><small className="r2-supporting">تغييره بعد التأسيس يتم من مركز الحوكمة فقط حتى يبقى التاريخ القانوني محفوظاً.</small></label>}
      <label><span>الوضع القانوني</span><input value={controller.draft.legalStatus} onChange={field('legalStatus')} />{errorFor('legalStatus')}</label>
      <label><span>الحالة</span><select value={controller.draft.status} onChange={field('status')}><option value="active">نشطة</option><option value="inactive">غير نشطة</option></select>{errorFor('status')}</label><label className="r2-golden-form__wide"><span>العنوان</span><textarea rows={2} value={controller.draft.address} onChange={field('address')} />{errorFor('address')}</label><label className="r2-golden-form__wide"><span>الأنشطة</span><textarea rows={3} value={controller.draft.activities} onChange={field('activities')} />{errorFor('activities')}</label>
    </div><div className="r2-golden-form__actions"><button type="submit" className="r2-action r2-action--primary" disabled={controller.state === 'saving'}>{controller.state === 'saving' ? 'جارٍ الحفظ…' : props.mode === 'create' ? 'إنشاء الشركة' : 'حفظ التعديلات'}</button><span>أي نتيجة كتابة غير مؤكدة لا تُعرض كنجاح.</span></div></form>
  </section>;
}

export function ConnectedCompanies({ openTransaction }: Readonly<{ openTransaction?: ((id: string) => void) | undefined }> = {}) {
  const directory = useCompanyDirectory(), [selectedId, setSelectedId] = useState<string | null>(null), [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null), detail = useCompanyDetail(selectedId);
  useEffect(() => { if (!selectedId && directory.snapshot?.items[0]) setSelectedId(directory.snapshot.items[0].id); }, [directory.snapshot, selectedId]);
  const subtitle = useMemo(() => directory.snapshot ? `${directory.snapshot.filteredTotal} نتيجة · ${directory.snapshot.counts.active} نشطة` : 'بيانات مساحة العمل الموثوقة', [directory.snapshot]);
  if (directory.status === 'loading') return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="جارٍ تحميل الشركات" body="تُقرأ قائمة الشركات من مساحة العمل الحالية دون fixtures إنتاجية." /></div>;
  if (directory.status === 'error' || !directory.snapshot) return <div className="r2-screen" data-phase6-1="companies"><StatePanel title="تعذر تحميل الشركات" body={directory.errorMessage ?? 'تعذر تجهيز دليل الشركات.'} action={directory.retry} /></div>;
  const snapshot = directory.snapshot, saved = (id: string) => { setSelectedId(id); directory.retry(); detail.retry(); };
  let main: ReactNode;
  if (editorMode) main = <CompanyEditor mode={editorMode} source={detail.source} onClose={() => setEditorMode(null)} onSaved={saved} />;
  else if (!selectedId) main = <article className="r2-records-entity-profile"><StatePanel title="اختر شركة" body="حدد شركة من الدليل لعرض التفاصيل المترابطة." /></article>;
  else if (detail.status === 'loading') main = <article className="r2-records-entity-profile"><StatePanel title="جارٍ تحميل الشركة" body="تُجمع العلاقات من مصادرها القانونية دون تخمين." /></article>;
  else if (detail.status === 'error' || !detail.source) main = <article className="r2-records-entity-profile"><StatePanel title="تعذر تحميل تفاصيل الشركة" body={detail.errorMessage ?? 'تعذر تجهيز التفاصيل.'} action={detail.retry} /></article>;
  else main = <div className="r2-company-detail" data-company-profile={detail.source.company.id}><div className="r2-golden-form__actions"><button type="button" className="r2-action r2-action--secondary" disabled={detail.source.company.merged_into_id !== null} onClick={() => setEditorMode('edit')}>تعديل البيانات</button></div><Entity360Panel source={buildCompany360Source(detail.source)} openTransaction={openTransaction} /><CompanyGovernancePanel companyId={detail.source.company.id} companyLabel={detail.source.company.display_name || detail.source.company.legal_name} contacts={detail.source.contacts} /></div>;

  return <section className="r2-screen r2-records-screen r2-companies-connected" data-records-domain="companies" data-phase6-1="companies" data-company-source="workspace">
    <header className="r2-records-header"><div><p className="r2-eyebrow">Phase 6.1 · Companies · متصل</p><h1>الشركات</h1><p>دليل قانوني واحد للشركة: بحث وتصفية وإنشاء وتعديل، و360° موحدة من مصادر الحقيقة الحالية.</p></div><button type="button" className="r2-action r2-action--primary" onClick={() => setEditorMode('create')}>＋ شركة جديدة</button></header>
    <aside className="r2-records-truth" role="note"><strong>مصادر الحقيقة محفوظة</strong><span>بيانات الشركة الأساسية تبقى في Companies، الأشخاص والعلاقات في مسارها القانوني، وCompany 360° سطح القراءة الموحد، بينما حوكمة 9.3 تدير الملكية والمستفيد الحقيقي والصلاحيات والقرارات ورأس المال بتاريخ مستقل دون Shadow Records.</span></aside>
    <div className="r2-core-toolbar"><label className="r2-transaction-search"><span aria-hidden="true">⌕</span><input aria-label="بحث الشركات" value={directory.request.search} onChange={(event) => directory.setSearch(event.target.value)} placeholder="اسم، رقم تسجيل، عنوان، نشاط…" /></label><label className="r2-core-sort"><span>ترتيب</span><select aria-label="ترتيب الشركات" value={directory.request.sort} onChange={(event) => directory.setSort(event.target.value as typeof directory.request.sort)}><option value="activity-desc">آخر تحديث</option><option value="name-asc">الاسم</option><option value="created-desc">الأحدث إنشاءً</option><option value="capital-desc">رأس المال</option></select></label></div>
    <div className="r2-segment r2-core-segment" aria-label="تصفية الشركات">{([['all','الكل'],['active','نشطة'],['inactive','غير نشطة']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={directory.request.filter === value} onClick={() => directory.setFilter(value)}>{label} <span>{snapshot.counts[value]}</span></button>)}</div>
    <div className="r2-records-workspace r2-records-workspace--company"><aside className="r2-records-directory" aria-label="دليل الشركات"><p className="r2-supporting">{subtitle} · صفحة {snapshot.page + 1} / {snapshot.pageCount}</p><div className="r2-records-directory-list">{snapshot.items.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => { setSelectedId(item.id); setEditorMode(null); }}><span className="r2-records-entity-mark">ش</span><span><strong>{item.label}</strong><small>{item.registrationNumber || item.address || 'دون رقم تسجيل أو عنوان'}</small></span><em>{companyStatus(item.status, item.merged)}</em></button>)}{!snapshot.items.length ? <p className="r2-records-empty">لا توجد شركة مطابقة للبحث والتصفية الحالية.</p> : null}</div><footer className="r2-core-pagination"><div /><div><button type="button" disabled={!snapshot.hasPrevious} onClick={() => directory.setPage(snapshot.page - 1)}>السابق</button><button type="button" disabled={!snapshot.hasMore} onClick={() => directory.setPage(snapshot.page + 1)}>التالي</button></div></footer></aside>{main}</div>
  </section>;
}
