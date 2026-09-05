import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type TransactionEditorMode = 'create' | 'edit';
export type TransactionEditorStatus = 'active' | 'stalled' | 'completed';
export type TransactionEditorPriority = 'low' | 'normal' | 'high' | 'urgent';

export const TRANSACTION_TYPE_MAX_LENGTH = 180;
export const TRANSACTION_DEPARTMENT_MAX_LENGTH = 240;
export const TRANSACTION_STATION_MAX_LENGTH = 240;
export const TRANSACTION_ASSIGNEE_MAX_LENGTH = 240;
export const TRANSACTION_NOTE_MAX_LENGTH = 4_000;
export const TRANSACTION_FEE_REASON_MAX_LENGTH = 600;

export interface TransactionEditorDraft {
  readonly companyId: string;
  readonly primaryContactId: string;
  readonly type: string;
  readonly department: string;
  readonly status: TransactionEditorStatus;
  readonly priority: TransactionEditorPriority;
  readonly currentFee: string;
  readonly completedAt: string;
  readonly stationName: string;
  readonly assignedToText: string;
  readonly stationOccurredAt: string;
  readonly noteBody: string;
  readonly feeChangeReason: string;
}

export type TransactionEditorField = keyof TransactionEditorDraft;
export type TransactionEditorErrors = Partial<Record<TransactionEditorField | 'form', string>>;

export interface TransactionEditorSource {
  readonly companies: readonly RowOf<'companies'>[];
  readonly contacts: readonly RowOf<'contacts'>[];
  readonly companyContacts: readonly RowOf<'company_contacts'>[];
  readonly transaction: RowOf<'transactions'> | null;
  readonly latestRoute: RowOf<'transaction_routes'> | null;
}

export interface NormalizedTransactionEditorDraft {
  readonly companyId: string;
  readonly primaryContactId: string | null;
  readonly type: string;
  readonly department: string | null;
  readonly status: TransactionEditorStatus;
  readonly priority: TransactionEditorPriority;
  readonly currentFee: number;
  readonly completedAt: string | null;
  readonly stationName: string | null;
  readonly assignedToText: string | null;
  readonly stationOccurredAt: string | null;
  readonly noteBody: string | null;
  readonly feeChangeReason: string | null;
}

export class TransactionEditorValidationError extends Error {
  readonly errors: TransactionEditorErrors;
  constructor(errors: TransactionEditorErrors) {
    super('Transaction editor validation failed');
    this.name = 'TransactionEditorValidationError';
    this.errors = Object.freeze({ ...errors });
  }
}

const STATUS_VALUES = new Set<TransactionEditorStatus>(['active', 'stalled', 'completed']);
const PRIORITY_VALUES = new Set<TransactionEditorPriority>(['low', 'normal', 'high', 'urgent']);
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

function normalizeDigits(value: string): string {
  return [...value].map((character) => {
    const arabicIndex = ARABIC_DIGITS.indexOf(character);
    if (arabicIndex >= 0) return String(arabicIndex);
    const persianIndex = PERSIAN_DIGITS.indexOf(character);
    if (persianIndex >= 0) return String(persianIndex);
    return character;
  }).join('');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toTransactionLocalDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function transactionLocalDateTimeToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseSafeTransactionFee(value: string): number | null {
  const normalized = normalizeDigits(value)
    .replace(/[\s,_٬]/g, '')
    .replace(/٫/g, '.')
    .trim();
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  if (cents <= 0n || cents > MAX_SAFE_CENTS) return null;
  return Number(cents) / 100;
}

export function createEmptyTransactionDraft(now = new Date()): TransactionEditorDraft {
  return Object.freeze({
    companyId: '',
    primaryContactId: '',
    type: '',
    department: '',
    status: 'active',
    priority: 'normal',
    currentFee: '',
    completedAt: '',
    stationName: '',
    assignedToText: '',
    stationOccurredAt: toTransactionLocalDateTime(now),
    noteBody: '',
    feeChangeReason: '',
  });
}

export function createTransactionEditDraft(source: TransactionEditorSource, now = new Date()): TransactionEditorDraft {
  const transaction = source.transaction;
  if (!transaction) return createEmptyTransactionDraft(now);
  const route = source.latestRoute;
  return Object.freeze({
    companyId: transaction.company_id,
    primaryContactId: transaction.primary_contact_id ?? '',
    type: transaction.type,
    department: transaction.department ?? '',
    status: STATUS_VALUES.has(transaction.status as TransactionEditorStatus) ? transaction.status as TransactionEditorStatus : 'active',
    priority: PRIORITY_VALUES.has(transaction.priority as TransactionEditorPriority) ? transaction.priority as TransactionEditorPriority : 'normal',
    currentFee: String(transaction.current_fee),
    completedAt: transaction.completed_at ? toTransactionLocalDateTime(transaction.completed_at) : '',
    stationName: route?.station_name ?? '',
    assignedToText: route?.assigned_to_text ?? '',
    stationOccurredAt: route?.occurred_at ? toTransactionLocalDateTime(route.occurred_at) : toTransactionLocalDateTime(now),
    noteBody: '',
    feeChangeReason: '',
  });
}

function relationIsCurrent(relation: RowOf<'company_contacts'>, at: Date): boolean {
  const day = at.toISOString().slice(0, 10);
  return (!relation.valid_from || relation.valid_from <= day) && (!relation.valid_to || relation.valid_to >= day);
}

export function getRelatedContactIds(source: TransactionEditorSource, companyId: string, at = new Date()): ReadonlySet<string> {
  const ids = new Set<string>();
  const company = source.companies.find((candidate) => candidate.id === companyId && candidate.deleted_at === null);
  if (company?.primary_contact_id) ids.add(company.primary_contact_id);
  for (const relation of source.companyContacts) {
    if (relation.company_id === companyId && relationIsCurrent(relation, at)) ids.add(relation.contact_id);
  }
  return ids;
}

export function getRelatedContacts(source: TransactionEditorSource, companyId: string): readonly RowOf<'contacts'>[] {
  const ids = getRelatedContactIds(source, companyId);
  return Object.freeze(source.contacts.filter((contact) => ids.has(contact.id) && contact.deleted_at === null && contact.status !== 'merged'));
}

function valuesDiffer(a: number, b: number): boolean {
  return Math.round(a * 100) !== Math.round(b * 100);
}

export function validateTransactionEditorDraft(
  draft: TransactionEditorDraft,
  source: TransactionEditorSource,
  mode: TransactionEditorMode,
  now = new Date(),
): TransactionEditorErrors {
  const errors: TransactionEditorErrors = {};
  const transaction = source.transaction;
  const company = source.companies.find((candidate) => candidate.id === draft.companyId && candidate.deleted_at === null && candidate.status !== 'merged');

  if (mode === 'edit') {
    if (!transaction) errors.form = 'تعذر العثور على المعاملة المطلوب تعديلها.';
    else if (transaction.deleted_at) errors.form = 'المعاملة محذوفة ولا يمكن تعديلها من Phase 5.2.';
    else if (transaction.archived_at) errors.form = 'المعاملة مؤرشفة. الاستعادة والتعديل بعد الأرشفة يتبعان Phase 5.4.';
    else if (transaction.status === 'completed' && draft.status !== 'completed') errors.form = 'إعادة تنشيط معاملة مكتملة إجراء دورة حياة ويتبع Phase 5.4.';
  }

  if (!draft.companyId.trim()) errors.companyId = 'اختر الشركة المرتبطة بالمعاملة.';
  else if (!company) errors.companyId = 'الشركة غير متاحة أو لم تعد صالحة للربط.';

  if (draft.primaryContactId) {
    const contact = source.contacts.find((candidate) => candidate.id === draft.primaryContactId && candidate.deleted_at === null && candidate.status !== 'merged');
    if (!contact) errors.primaryContactId = 'جهة الاتصال غير متاحة.';
    else if (!getRelatedContactIds(source, draft.companyId, now).has(contact.id)) errors.primaryContactId = 'جهة الاتصال المختارة غير مرتبطة بالشركة الحالية.';
  }

  const type = draft.type.trim();
  if (!type) errors.type = 'أدخل نوع المعاملة.';
  else if (type.length > TRANSACTION_TYPE_MAX_LENGTH) errors.type = `نوع المعاملة يتجاوز ${TRANSACTION_TYPE_MAX_LENGTH} حرفًا.`;

  if (draft.department.trim().length > TRANSACTION_DEPARTMENT_MAX_LENGTH) errors.department = `اسم الجهة يتجاوز ${TRANSACTION_DEPARTMENT_MAX_LENGTH} حرفًا.`;
  if (!STATUS_VALUES.has(draft.status)) errors.status = 'حالة المعاملة غير صالحة.';
  if (!PRIORITY_VALUES.has(draft.priority)) errors.priority = 'أولوية المعاملة غير صالحة.';

  const fee = parseSafeTransactionFee(draft.currentFee);
  if (fee === null) errors.currentFee = 'أدخل أتعابًا موجبة بدقة آمنة وبحد أقصى منزلتين عشريتين.';

  if (draft.status === 'completed') {
    const completedIso = transactionLocalDateTimeToIso(draft.completedAt);
    if (!completedIso) errors.completedAt = 'حدد تاريخ إكمال صالحًا.';
    else if (new Date(completedIso).getTime() > now.getTime() + 5 * 60_000) errors.completedAt = 'تاريخ الإكمال لا يمكن أن يكون في المستقبل.';
  }

  const stationName = draft.stationName.trim();
  if (stationName.length > TRANSACTION_STATION_MAX_LENGTH) errors.stationName = `اسم المحطة يتجاوز ${TRANSACTION_STATION_MAX_LENGTH} حرفًا.`;
  if (draft.assignedToText.trim().length > TRANSACTION_ASSIGNEE_MAX_LENGTH) errors.assignedToText = `اسم المسؤول يتجاوز ${TRANSACTION_ASSIGNEE_MAX_LENGTH} حرفًا.`;
  if (!stationName && draft.assignedToText.trim()) errors.stationName = 'أدخل اسم المحطة قبل تحديد المسؤول.';
  if (stationName) {
    const stationIso = transactionLocalDateTimeToIso(draft.stationOccurredAt);
    if (!stationIso) errors.stationOccurredAt = 'حدد وقتًا صالحًا للمحطة.';
    else if (new Date(stationIso).getTime() > now.getTime() + 5 * 60_000) errors.stationOccurredAt = 'وقت المحطة لا يمكن أن يكون في المستقبل.';
  }

  if (draft.noteBody.trim().length > TRANSACTION_NOTE_MAX_LENGTH) errors.noteBody = `الملاحظة تتجاوز ${TRANSACTION_NOTE_MAX_LENGTH} حرفًا.`;
  if (draft.feeChangeReason.trim().length > TRANSACTION_FEE_REASON_MAX_LENGTH) errors.feeChangeReason = `سبب تغيير الأتعاب يتجاوز ${TRANSACTION_FEE_REASON_MAX_LENGTH} حرفًا.`;

  if (mode === 'edit' && transaction && fee !== null && valuesDiffer(fee, transaction.current_fee)) {
    if (draft.feeChangeReason.trim().length < 3) errors.feeChangeReason = 'اكتب سببًا واضحًا لتغيير الأتعاب حتى يبقى السجل المالي قابلًا للتتبع.';
  }

  return Object.freeze(errors);
}

export function normalizeTransactionEditorDraft(
  draft: TransactionEditorDraft,
  source: TransactionEditorSource,
  mode: TransactionEditorMode,
  now = new Date(),
): NormalizedTransactionEditorDraft {
  const errors = validateTransactionEditorDraft(draft, source, mode, now);
  if (Object.keys(errors).length) throw new TransactionEditorValidationError(errors);
  const fee = parseSafeTransactionFee(draft.currentFee);
  if (fee === null) throw new TransactionEditorValidationError({ currentFee: 'قيمة الأتعاب غير صالحة.' });
  const stationName = draft.stationName.trim();
  return Object.freeze({
    companyId: draft.companyId.trim(),
    primaryContactId: draft.primaryContactId.trim() || null,
    type: draft.type.trim(),
    department: draft.department.trim() || null,
    status: draft.status,
    priority: draft.priority,
    currentFee: fee,
    completedAt: draft.status === 'completed' ? transactionLocalDateTimeToIso(draft.completedAt) : null,
    stationName: stationName || null,
    assignedToText: stationName ? draft.assignedToText.trim() || null : null,
    stationOccurredAt: stationName ? transactionLocalDateTimeToIso(draft.stationOccurredAt) : null,
    noteBody: draft.noteBody.trim() || null,
    feeChangeReason: draft.feeChangeReason.trim() || null,
  });
}
