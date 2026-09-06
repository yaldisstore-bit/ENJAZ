import { useMemo, useState } from 'react';
import { useOptionalDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';

type RecordDestination = Extract<R2DestinationId, 'companies' | 'people' | 'documents'>;

type CompanyPreview = Readonly<{
  id: string;
  name: string;
  shortName: string;
  location: string;
  capital: string;
  manager: string;
  transactions: number;
  people: number;
  documents: number;
  relationships: readonly string[];
}>;

type PersonPreview = Readonly<{
  id: string;
  name: string;
  role: string;
  specialty: string;
  companyLinks: readonly string[];
  activeTransactions: number;
}>;

type DocumentPreview = Readonly<{
  id: string;
  title: string;
  category: 'تأسيس' | 'مالية' | 'مراسلات' | 'تقارير';
  owner: string;
  kind: string;
  state: string;
}>;

const COMPANIES: readonly CompanyPreview[] = [
  { id: 'company-qamar', name: 'قمر السلطان للتجارة العامة وإدارة واستثمار المطاعم', shortName: 'قمر السلطان', location: 'بغداد · اليرموك', capital: '100,000,000 د.ع', manager: 'أحمد هادي إبراهيم', transactions: 4, people: 6, documents: 12, relationships: ['أحمد هادي إبراهيم · مدير مفوض', 'سارة علي · متابعة', 'محمود جاسم · محاسب'] },
  { id: 'company-fajr', name: 'شركة الفجر للتجارة والمقاولات العامة', shortName: 'شركة الفجر', location: 'بغداد · الكرادة', capital: '250,000,000 د.ع', manager: 'علي كريم سلمان', transactions: 3, people: 4, documents: 8, relationships: ['علي كريم سلمان · مدير مفوض', 'نور حسين · محامية', 'سيف عادل · متابعة'] },
  { id: 'company-rafidain', name: 'الرافدين للتجهيزات والخدمات العامة', shortName: 'الرافدين', location: 'بغداد · المنصور', capital: '1,000,000,000 د.ع', manager: 'مصطفى فاضل كاظم', transactions: 5, people: 7, documents: 15, relationships: ['مصطفى فاضل كاظم · مدير مفوض', 'هدى ناصر · محامية', 'كرار حسين · محاسب'] },
];

const PEOPLE: readonly PersonPreview[] = [
  { id: 'person-ahmed', name: 'أحمد هادي إبراهيم', role: 'محامٍ ومدير مفوض', specialty: 'تأسيس الشركات والتعديلات', companyLinks: ['قمر السلطان', 'شركة الفجر'], activeTransactions: 5 },
  { id: 'person-nour', name: 'نور حسين', role: 'محامية', specialty: 'قرارات الشركات والمراسلات', companyLinks: ['شركة الفجر'], activeTransactions: 3 },
  { id: 'person-sara', name: 'سارة علي', role: 'مسؤولة متابعة', specialty: 'المتابعات والمواعيد', companyLinks: ['قمر السلطان', 'الرافدين'], activeTransactions: 4 },
  { id: 'person-huda', name: 'هدى ناصر', role: 'محامية', specialty: 'المعاملات القانونية والتوثيق', companyLinks: ['الرافدين'], activeTransactions: 6 },
];

const DOCUMENTS: readonly DocumentPreview[] = [
  { id: 'doc-1', title: 'شهادة تأسيس.pdf', category: 'تأسيس', owner: 'قمر السلطان', kind: 'شهادة تأسيس', state: 'مؤرشف' },
  { id: 'doc-2', title: 'عقد تأسيس.pdf', category: 'تأسيس', owner: 'قمر السلطان', kind: 'عقد تأسيس', state: 'أساسي' },
  { id: 'doc-3', title: 'قرار تأسيس.pdf', category: 'تأسيس', owner: 'شركة الفجر', kind: 'قرار تأسيس', state: 'مراجع' },
  { id: 'doc-4', title: 'كشف حساب.pdf', category: 'مالية', owner: 'الرافدين', kind: 'كشف مالي', state: 'مؤرشف' },
  { id: 'doc-5', title: 'كتاب رسمي.pdf', category: 'مراسلات', owner: 'شركة الفجر', kind: 'مراسلة', state: 'مراجع' },
  { id: 'doc-6', title: 'تقرير سنوي.pdf', category: 'تقارير', owner: 'قمر السلطان', kind: 'تقرير', state: 'أساسي' },
];

function TruthNote() {
  return <aside className="r2-records-truth" role="note"><strong>عرض فقط في R2.0-6</strong><span>معاينة السجلات القديمة لا تنفّذ إنشاءً أو تعديلًا أو رفع ملفات إنتاجية. Phase 6.1 تستبدل الشركات فقط عند وجود Data Layer حقيقية.</span></aside>;
}

function Header({ title, body }: Readonly<{ title: string; body: string }>) {
  return <header className="r2-records-header"><div><p className="r2-eyebrow">السجلات · كيان أولًا</p><h1>{title}</h1><p>{body}</p></div><span className="r2-records-stage-badge">R2.0-6</span></header>;
}

function CompaniesPreview() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(COMPANIES[0]!.id);
  const filtered = useMemo(() => {
    const value = query.trim();
    return value ? COMPANIES.filter((company) => `${company.name} ${company.location} ${company.manager}`.includes(value)) : COMPANIES;
  }, [query]);
  const selected = COMPANIES.find((company) => company.id === selectedId) ?? COMPANIES[0]!;
  return <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="companies" data-entity-first="true"><Header title="الشركات" body="الشركة كيان له هوية وعلاقات وعمل مرتبط، لا بطاقة معزولة." /><TruthNote /><div className="r2-records-workspace r2-records-workspace--company"><aside className="r2-records-directory" aria-label="دليل الشركات"><label className="r2-records-search"><span>بحث الشركات</span><input aria-label="بحث الشركات" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم، مدير، موقع…" /></label><div className="r2-records-directory-list">{filtered.map((company) => <button type="button" key={company.id} className={company.id === selected.id ? 'is-active' : ''} onClick={() => setSelectedId(company.id)} aria-label={`فتح شركة ${company.shortName}`}><span className="r2-records-entity-mark">ش</span><span><strong>{company.shortName}</strong><small>{company.location}</small></span><em>{company.transactions}</em></button>)}{!filtered.length ? <p className="r2-records-empty">لا توجد شركة مطابقة داخل عينة العرض.</p> : null}</div></aside><article className="r2-records-entity-profile" data-company-profile={selected.id}><div className="r2-records-profile-identity"><span className="r2-records-profile-icon">ش</span><div><p>الكيان المحدد</p><h2>{selected.shortName}</h2><span>{selected.name}</span></div><strong>{selected.transactions}</strong></div><div className="r2-records-facts"><div><span>المدير المفوض</span><strong>{selected.manager}</strong></div><div><span>رأس المال</span><strong>{selected.capital}</strong></div><div><span>الموقع</span><strong>{selected.location}</strong></div><div><span>المعاملات</span><strong>{selected.transactions}</strong></div></div><section className="r2-records-relations" aria-label="علاقات الشركة"><header><div><span>خريطة العلاقات</span></div><small>سياق واحد بدل نوافذ منفصلة</small></header><div className="r2-records-relation-strip"><div><strong>{selected.transactions}</strong><span>معاملات</span></div><div><strong>{selected.people}</strong><span>أشخاص</span></div><div><strong>{selected.documents}</strong><span>وثائق</span></div></div><div className="r2-records-related-lists"><section><h3>العلاقات</h3>{selected.relationships.map((item) => <p key={item}>{item}</p>)}</section></div></section></article></div></section>;
}

function PeoplePreview() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(PEOPLE[0]!.id);
  const filtered = useMemo(() => {
    const value = query.trim();
    return value ? PEOPLE.filter((person) => `${person.name} ${person.role} ${person.specialty}`.includes(value)) : PEOPLE;
  }, [query]);
  const selected = PEOPLE.find((person) => person.id === selectedId) ?? PEOPLE[0]!;
  return <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="people" data-entity-first="true"><Header title="الأشخاص" body="هوية الشخص ودوره وروابطه مع الشركات في سياق واحد." /><TruthNote /><div className="r2-records-workspace"><aside className="r2-records-directory"><label className="r2-records-search"><span>بحث الأشخاص</span><input aria-label="بحث الأشخاص" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="r2-records-directory-list">{filtered.map((person) => <button type="button" key={person.id} className={person.id === selected.id ? 'is-active' : ''} onClick={() => setSelectedId(person.id)} aria-label={`فتح شخص ${person.name}`}><span className="r2-records-entity-mark">ش</span><span><strong>{person.name}</strong><small>{person.role}</small></span><em>{person.activeTransactions}</em></button>)}</div></aside><article className="r2-records-person-profile r2-records-entity-profile" data-person-profile={selected.id}><div className="r2-records-profile-identity"><span className="r2-records-profile-icon">ش</span><div><p>{selected.role}</p><h2>{selected.name}</h2><span>{selected.specialty}</span></div><strong>{selected.activeTransactions}</strong></div><section className="r2-records-relations"><header><div><span>خريطة العلاقات</span></div><small>الشركات المرتبطة</small></header><div className="r2-records-related-lists"><section><h3>الشركات</h3>{selected.companyLinks.map((company) => <p key={company}>{company}</p>)}</section></div></section></article></div></section>;
}

function DocumentsPreview() {
  const categories = ['الكل', 'تأسيس', 'مالية', 'مراسلات', 'تقارير'] as const;
  const [category, setCategory] = useState<(typeof categories)[number]>('الكل');
  const [selectedId, setSelectedId] = useState(DOCUMENTS[0]!.id);
  const filtered = category === 'الكل' ? DOCUMENTS : DOCUMENTS.filter((document) => document.category === category);
  const selected = DOCUMENTS.find((document) => document.id === selectedId) ?? DOCUMENTS[0]!;
  return <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="documents" data-entity-first="true"><Header title="الوثائق" body="تصنيف ومعاينة سياقية دون ادعاء عمليات إنتاجية قبل مرحلة الوثائق." /><TruthNote /><div className="r2-documents-layout"><nav className="r2-records-directory" aria-label="فئات الوثائق">{categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</nav><section className="r2-records-directory-list">{filtered.map((document) => <button type="button" key={document.id} onClick={() => setSelectedId(document.id)} aria-label={`معاينة ${document.title}`}><span className="r2-records-entity-mark">و</span><span><strong>{document.title}</strong><small>{document.owner} · {document.kind}</small></span><em>{document.state}</em></button>)}</section><article className="r2-records-entity-profile" data-document-detail={selected.id}><div className="r2-records-profile-identity"><span className="r2-records-profile-icon">و</span><div><p>{selected.kind}</p><h2>{selected.title}</h2><span>{selected.owner}</span></div><strong>{selected.state}</strong></div><p>لا يوجد رفع أو حذف إنتاجي في هذه المعاينة. العرض يحافظ على صدق حدود R2.0-6.</p></article></div></section>;
}

export function RecordsRelationshipsExperience({ id }: Readonly<{ id: RecordDestination }>) {
  const dataFactory = useOptionalDataLayerFactory();
  const userId = useCurrentUserId();
  if (id === 'companies' && dataFactory && userId) return <ConnectedCompanies />;
  if (id === 'companies') return <CompaniesPreview />;
  if (id === 'people') return <PeoplePreview />;
  return <DocumentsPreview />;
}
