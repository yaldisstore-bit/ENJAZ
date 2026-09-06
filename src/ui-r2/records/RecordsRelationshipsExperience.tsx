import { useMemo, useState } from 'react';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type RecordDestination = Extract<R2DestinationId, 'companies' | 'people' | 'documents'>;

type Company = {
  id: string;
  name: string;
  shortName: string;
  location: string;
  capital: string;
  manager: string;
  status: string;
  completion: number;
  transactions: number;
  people: number;
  documents: number;
  lastActivity: string;
  relationships: string[];
  recentDocuments: string[];
};

type Person = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  workload: string;
  score: number;
  companyLinks: string[];
  activeTransactions: number;
  lastActivity: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  category: 'تأسيس' | 'مالية' | 'مراسلات' | 'تقارير';
  owner: string;
  kind: string;
  date: string;
  size: string;
  state: string;
};

const COMPANIES: Company[] = [
  {
    id: 'company-qamar',
    name: 'قمر السلطان للتجارة العامة وإدارة واستثمار المطاعم',
    shortName: 'قمر السلطان',
    location: 'بغداد · اليرموك',
    capital: '100,000,000 د.ع',
    manager: 'أحمد هادي إبراهيم',
    status: 'ملف منظم',
    completion: 92,
    transactions: 4,
    people: 6,
    documents: 12,
    lastActivity: 'اليوم · 10:42',
    relationships: ['أحمد هادي إبراهيم · مدير مفوض', 'سارة علي · متابعة', 'محمود جاسم · محاسب'],
    recentDocuments: ['شهادة تأسيس.pdf', 'عقد تأسيس.pdf', 'قرار تأسيس.pdf'],
  },
  {
    id: 'company-fajr',
    name: 'شركة الفجر للتجارة والمقاولات العامة',
    shortName: 'شركة الفجر',
    location: 'بغداد · الكرادة',
    capital: '250,000,000 د.ع',
    manager: 'علي كريم سلمان',
    status: 'تحتاج متابعة',
    completion: 78,
    transactions: 3,
    people: 4,
    documents: 8,
    lastActivity: 'منذ 42 دقيقة',
    relationships: ['علي كريم سلمان · مدير مفوض', 'نور حسين · محامية', 'سيف عادل · متابعة'],
    recentDocuments: ['قرار تعديل.pdf', 'كتاب ضريبي.pdf', 'محضر اجتماع.pdf'],
  },
  {
    id: 'company-rafidain',
    name: 'الرافدين للتجهيزات والخدمات العامة',
    shortName: 'الرافدين',
    location: 'بغداد · المنصور',
    capital: '1,000,000,000 د.ع',
    manager: 'مصطفى فاضل كاظم',
    status: 'مستقرة',
    completion: 86,
    transactions: 5,
    people: 7,
    documents: 15,
    lastActivity: 'أمس · 15:18',
    relationships: ['مصطفى فاضل كاظم · مدير مفوض', 'هدى ناصر · محامية', 'كرار حسين · محاسب'],
    recentDocuments: ['شهادة تأسيس.pdf', 'تأييد مصرف.pdf', 'كشف سنوي.pdf'],
  },
];

const PEOPLE: Person[] = [
  {
    id: 'person-ahmed',
    name: 'أحمد هادي إبراهيم',
    role: 'محامٍ ومدير مفوض',
    specialty: 'تأسيس الشركات والتعديلات',
    workload: '5 معاملات ضمن العمل الحالي',
    score: 92,
    companyLinks: ['قمر السلطان', 'شركة الفجر'],
    activeTransactions: 5,
    lastActivity: 'راجع عقد تأسيس · منذ 18 دقيقة',
  },
  {
    id: 'person-nour',
    name: 'نور حسين',
    role: 'محامية',
    specialty: 'قرارات الشركات والمراسلات',
    workload: '3 معاملات ضمن العمل الحالي',
    score: 88,
    companyLinks: ['شركة الفجر'],
    activeTransactions: 3,
    lastActivity: 'أغلقت مراجعة قرار · منذ 37 دقيقة',
  },
  {
    id: 'person-sara',
    name: 'سارة علي',
    role: 'مسؤولة متابعة',
    specialty: 'المتابعات والمواعيد',
    workload: '4 معاملات ضمن العمل الحالي',
    score: 91,
    companyLinks: ['قمر السلطان', 'الرافدين'],
    activeTransactions: 4,
    lastActivity: 'أضافت متابعة · منذ 42 دقيقة',
  },
  {
    id: 'person-huda',
    name: 'هدى ناصر',
    role: 'محامية',
    specialty: 'المعاملات القانونية والتوثيق',
    workload: '6 معاملات ضمن العمل الحالي',
    score: 84,
    companyLinks: ['الرافدين'],
    activeTransactions: 6,
    lastActivity: 'حدّثت مستندًا · اليوم 09:35',
  },
];

const DOCUMENTS: DocumentRecord[] = [
  { id: 'doc-1', title: 'شهادة تأسيس.pdf', category: 'تأسيس', owner: 'قمر السلطان', kind: 'شهادة تأسيس', date: 'اليوم', size: '2.4 MB', state: 'مؤرشف' },
  { id: 'doc-2', title: 'عقد تأسيس.pdf', category: 'تأسيس', owner: 'قمر السلطان', kind: 'عقد تأسيس', date: 'اليوم', size: '5.1 MB', state: 'أساسي' },
  { id: 'doc-3', title: 'قرار تأسيس.pdf', category: 'تأسيس', owner: 'شركة الفجر', kind: 'قرار تأسيس', date: 'أمس', size: '1.8 MB', state: 'مراجع' },
  { id: 'doc-4', title: 'كشف حساب.pdf', category: 'مالية', owner: 'الرافدين', kind: 'كشف مالي', date: '30 آب', size: '3.2 MB', state: 'مؤرشف' },
  { id: 'doc-5', title: 'كتاب رسمي.pdf', category: 'مراسلات', owner: 'شركة الفجر', kind: 'مراسلة', date: '29 آب', size: '1.1 MB', state: 'مراجع' },
  { id: 'doc-6', title: 'تقرير سنوي.pdf', category: 'تقارير', owner: 'قمر السلطان', kind: 'تقرير', date: '28 آب', size: '4.7 MB', state: 'أساسي' },
];

const DEFAULT_COMPANY = COMPANIES[0]!;
const DEFAULT_PERSON = PEOPLE[0]!;
const DEFAULT_DOCUMENT = DOCUMENTS[0]!;

function RecordIcon({ kind }: { kind: 'company' | 'person' | 'document' | 'relation' }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, className: 'r2-record-icon' } as const;
  if (kind === 'company') return <svg {...common}><path d="M4 21V7l8-4 8 4v14" /><path d="M8 10h2M14 10h2M8 14h2M14 14h2M9 21v-4h6v4" /></svg>;
  if (kind === 'person') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
  if (kind === 'document') return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
  return <svg {...common}><circle cx="6" cy="12" r="3" /><circle cx="18" cy="7" r="3" /><circle cx="18" cy="17" r="3" /><path d="m9 11 6-3M9 13l6 3" /></svg>;
}

function StageHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <header className="r2-records-header">
      <div>
        <p className="r2-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <span className="r2-records-stage-badge">R2.0-6</span>
    </header>
  );
}

function TruthNote() {
  return (
    <aside className="r2-records-truth" role="note">
      <strong>نطاق حقيقي بلا ادعاءات زائفة</strong>
      <span>هذه المرحلة ترحّل تجربة السجلات والعلاقات بصريًا. المعاينة لا تنفّذ إنشاءً أو تعديلًا أو رفع ملفات إنتاجية قبل وجود خدمة موثوقة لذلك.</span>
    </aside>
  );
}

function CompaniesExperience() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DEFAULT_COMPANY.id);
  const filtered = useMemo(() => {
    const value = query.trim();
    if (!value) return COMPANIES;
    return COMPANIES.filter((company) => `${company.name} ${company.location} ${company.manager}`.includes(value));
  }, [query]);
  const selected = COMPANIES.find((company) => company.id === selectedId) ?? DEFAULT_COMPANY;

  return (
    <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="companies" data-entity-first="true">
      <StageHeader eyebrow="السجلات · كيان أولًا" title="الشركات" body="الشركة هنا كيان له هوية وعلاقات ووثائق وعمل مرتبط، وليست بطاقة منفصلة عن سياقها." />
      <TruthNote />
      <div className="r2-records-workspace r2-records-workspace--company">
        <aside className="r2-records-directory" aria-label="دليل الشركات">
          <label className="r2-records-search">
            <span>بحث الشركات</span>
            <input aria-label="بحث الشركات" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم، مدير، موقع…" />
          </label>
          <div className="r2-records-directory-list">
            {filtered.map((company) => (
              <button type="button" key={company.id} className={company.id === selected.id ? 'is-active' : ''} onClick={() => setSelectedId(company.id)} aria-label={`فتح شركة ${company.shortName}`}>
                <span className="r2-records-entity-mark"><RecordIcon kind="company" /></span>
                <span><strong>{company.shortName}</strong><small>{company.location}</small></span>
                <em>{company.transactions}</em>
              </button>
            ))}
            {!filtered.length && <p className="r2-records-empty">لا توجد شركة مطابقة داخل عينة العرض.</p>}
          </div>
        </aside>

        <article className="r2-records-entity-profile" data-company-profile={selected.id}>
          <div className="r2-records-profile-identity">
            <span className="r2-records-profile-icon"><RecordIcon kind="company" /></span>
            <div><p>الكيان المحدد</p><h2>{selected.shortName}</h2><span>{selected.name}</span></div>
            <strong>{selected.completion}%</strong>
          </div>
          <div className="r2-records-facts">
            <div><span>المدير المفوض</span><strong>{selected.manager}</strong></div>
            <div><span>رأس المال</span><strong>{selected.capital}</strong></div>
            <div><span>آخر نشاط</span><strong>{selected.lastActivity}</strong></div>
            <div><span>حالة الملف</span><strong>{selected.status}</strong></div>
          </div>

          <section className="r2-records-relations" aria-label="علاقات الشركة">
            <header><div><RecordIcon kind="relation" /><span>خريطة العلاقات</span></div><small>سياق واحد بدل نوافذ منفصلة</small></header>
            <div className="r2-records-relation-strip">
              <div><strong>{selected.transactions}</strong><span>معاملات</span></div>
              <div><strong>{selected.people}</strong><span>أشخاص</span></div>
              <div><strong>{selected.documents}</strong><span>وثائق</span></div>
            </div>
            <div className="r2-records-related-lists">
              <section><h3>الأشخاص المرتبطون</h3>{selected.relationships.map((item) => <p key={item}>{item}</p>)}</section>
              <section><h3>آخر الوثائق</h3>{selected.recentDocuments.map((item) => <p key={item}>{item}</p>)}</section>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}

function PeopleExperience() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DEFAULT_PERSON.id);
  const filtered = useMemo(() => {
    const value = query.trim();
    if (!value) return PEOPLE;
    return PEOPLE.filter((person) => `${person.name} ${person.role} ${person.specialty}`.includes(value));
  }, [query]);
  const selected = PEOPLE.find((person) => person.id === selectedId) ?? DEFAULT_PERSON;

  return (
    <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="people" data-entity-first="true">
      <StageHeader eyebrow="العلاقات · ملف الشخص" title="الأشخاص والمحامون" body="دليل واضح على اليمين، ملف شخص في المركز، وصلاته بالشركات والعمل ظاهرة في نفس السياق." />
      <TruthNote />
      <div className="r2-records-workspace r2-records-workspace--people">
        <aside className="r2-records-directory" aria-label="دليل الأشخاص">
          <label className="r2-records-search"><span>بحث الأشخاص</span><input aria-label="بحث الأشخاص" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم، دور، اختصاص…" /></label>
          <div className="r2-records-directory-list">
            {filtered.map((person) => (
              <button type="button" key={person.id} className={person.id === selected.id ? 'is-active' : ''} onClick={() => setSelectedId(person.id)} aria-label={`فتح شخص ${person.name}`}>
                <span className="r2-records-entity-mark"><RecordIcon kind="person" /></span>
                <span><strong>{person.name}</strong><small>{person.role}</small></span>
                <em>{person.activeTransactions}</em>
              </button>
            ))}
          </div>
        </aside>

        <article className="r2-records-person-profile" data-person-profile={selected.id}>
          <div className="r2-records-person-hero">
            <span className="r2-records-avatar">{selected.name.charAt(0)}</span>
            <div><p>ملف العلاقة</p><h2>{selected.name}</h2><strong>{selected.role}</strong><span>{selected.specialty}</span></div>
            <output aria-label="مؤشر الملف">{selected.score}%</output>
          </div>
          <div className="r2-records-person-body">
            <section><span>الحمل الحالي</span><strong>{selected.workload}</strong><small>{selected.lastActivity}</small></section>
            <section><span>الشركات المرتبطة</span><div className="r2-records-link-pills">{selected.companyLinks.map((company) => <i key={company}>{company}</i>)}</div></section>
            <section className="r2-records-person-timeline"><span>السياق التشغيلي</span><p>الهوية ← الشركات ← المعاملات ← النشاط، بترتيب يشرح العلاقة قبل عرض الأرقام.</p></section>
          </div>
        </article>
      </div>
    </section>
  );
}

function DocumentsExperience() {
  const categories: DocumentRecord['category'][] = ['تأسيس', 'مالية', 'مراسلات', 'تقارير'];
  const [category, setCategory] = useState<DocumentRecord['category']>('تأسيس');
  const [selectedId, setSelectedId] = useState(DEFAULT_DOCUMENT.id);
  const documents = DOCUMENTS.filter((document) => document.category === category);
  const selected = DOCUMENTS.find((document) => document.id === selectedId && document.category === category) ?? documents[0] ?? DEFAULT_DOCUMENT;
  const chooseCategory = (next: DocumentRecord['category']) => {
    setCategory(next);
    const first = DOCUMENTS.find((document) => document.category === next);
    if (first) setSelectedId(first.id);
  };

  return (
    <section className="r2-screen r2-records-screen" data-records-stage="R2.0-6" data-records-domain="documents" data-entity-first="true">
      <StageHeader eyebrow="الوثائق · فئة ← قائمة ← تفصيل" title="الوثائق والتقارير" body="الوثيقة تُفهم من فئتها ومالكها وسياقها، لا من شبكة أيقونات ملفات متساوية." />
      <TruthNote />
      <div className="r2-documents-layout">
        <nav className="r2-documents-categories" aria-label="فئات الوثائق">
          {categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => chooseCategory(item)}><strong>{item}</strong><small>{DOCUMENTS.filter((document) => document.category === item).length} ملف</small></button>)}
        </nav>
        <section className="r2-documents-list" aria-label={`وثائق ${category}`}>
          <header><div><RecordIcon kind="document" /><span>{category}</span></div><small>ترتيب سياقي</small></header>
          {documents.map((document) => <button type="button" key={document.id} className={selected.id === document.id ? 'is-active' : ''} onClick={() => setSelectedId(document.id)} aria-label={`معاينة ${document.title}`}><span><strong>{document.title}</strong><small>{document.owner} · {document.size}</small></span><em>{document.date}</em></button>)}
        </section>
        <article className="r2-document-detail" data-document-detail={selected.id}>
          <div className="r2-document-preview-mark"><RecordIcon kind="document" /><strong>PDF</strong></div>
          <p>معاينة الوثيقة</p>
          <h2>{selected.title}</h2>
          <dl>
            <div><dt>النوع</dt><dd>{selected.kind}</dd></div>
            <div><dt>المالك</dt><dd>{selected.owner}</dd></div>
            <div><dt>الحالة</dt><dd>{selected.state}</dd></div>
            <div><dt>الحجم</dt><dd>{selected.size}</dd></div>
          </dl>
          <span className="r2-document-readonly">عرض فقط في R2.0-6 · لا يوجد رفع أو حذف إنتاجي من هذه المعاينة.</span>
        </article>
      </div>
    </section>
  );
}

export function RecordsRelationshipsExperience({ id }: { id: RecordDestination }) {
  if (id === 'companies') return <CompaniesExperience />;
  if (id === 'people') return <PeopleExperience />;
  return <DocumentsExperience />;
}
