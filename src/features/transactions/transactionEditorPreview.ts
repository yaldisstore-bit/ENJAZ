import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { TransactionEditorSource } from './transactionEditorModel.ts';

const COMPANY_A = '11111111-1111-4111-8111-111111111111';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const CONTACT_A = '33333333-3333-4333-8333-333333333333';
const CONTACT_B = '44444444-4444-4444-8444-444444444444';
const CONTACT_C = '55555555-5555-4555-8555-555555555555';
const TRANSACTION_ID = '66666666-6666-4666-8666-666666666666';

function company(id: string, legalName: string, primaryContactId: string | null): RowOf<'companies'> {
  return Object.freeze({
    id,
    workspace_id: '77777777-7777-4777-8777-777777777777',
    legal_name: legalName,
    display_name: null,
    capital: null,
    address: 'بغداد',
    activities: null,
    registration_number: null,
    legal_status: null,
    primary_contact_id: primaryContactId,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    deleted_at: null,
  });
}

function contact(id: string, displayName: string, type: string): RowOf<'contacts'> {
  return Object.freeze({
    id,
    workspace_id: '77777777-7777-4777-8777-777777777777',
    display_name: displayName,
    contact_type: type,
    phone: null,
    email: null,
    notes: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    deleted_at: null,
  });
}

export function buildTransactionEditorPreviewSource(mode: 'create' | 'edit' = 'create'): TransactionEditorSource {
  const companies = Object.freeze([
    company(COMPANY_A, 'قمر السلطان للتجارة العامة وإدارة واستثمار المطاعم محدودة المسؤولية', CONTACT_A),
    company(COMPANY_B, 'شركة الرافدين للتجارة والمقاولات العامة', CONTACT_C),
  ]);
  const contacts = Object.freeze([
    contact(CONTACT_A, 'أحمد هادي إبراهيم', 'representative'),
    contact(CONTACT_B, 'سارة علي كريم', 'lawyer'),
    contact(CONTACT_C, 'مصطفى فيصل عبود', 'representative'),
  ]);
  const companyContacts = Object.freeze<RowOf<'company_contacts'>[]>([
    Object.freeze({ id: '88888888-8888-4888-8888-888888888881', workspace_id: '77777777-7777-4777-8777-777777777777', company_id: COMPANY_A, contact_id: CONTACT_A, relation_type: 'primary', valid_from: null, valid_to: null, created_at: '2026-08-01T08:00:00.000Z' }),
    Object.freeze({ id: '88888888-8888-4888-8888-888888888882', workspace_id: '77777777-7777-4777-8777-777777777777', company_id: COMPANY_A, contact_id: CONTACT_B, relation_type: 'lawyer', valid_from: null, valid_to: null, created_at: '2026-08-02T08:00:00.000Z' }),
    Object.freeze({ id: '88888888-8888-4888-8888-888888888883', workspace_id: '77777777-7777-4777-8777-777777777777', company_id: COMPANY_B, contact_id: CONTACT_C, relation_type: 'primary', valid_from: null, valid_to: null, created_at: '2026-08-03T08:00:00.000Z' }),
  ]);

  if (mode === 'create') return Object.freeze({ companies, contacts, companyContacts, transaction: null, latestRoute: null });

  const transaction: RowOf<'transactions'> = Object.freeze({
    id: TRANSACTION_ID,
    workspace_id: '77777777-7777-4777-8777-777777777777',
    company_id: COMPANY_A,
    primary_contact_id: CONTACT_A,
    type: 'تعديل عقد تأسيس',
    department: 'دائرة تسجيل الشركات',
    status: 'active',
    priority: 'high',
    current_fee: 450000,
    created_at: '2026-08-27T08:00:00.000Z',
    updated_at: '2026-09-05T03:00:00.000Z',
    last_activity_at: '2026-09-05T03:00:00.000Z',
    completed_at: null,
    archived_at: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    legacy_id: '1042',
    legacy_source: 'preview',
  });
  const latestRoute: RowOf<'transaction_routes'> = Object.freeze({
    id: '99999999-9999-4999-8999-999999999999',
    workspace_id: transaction.workspace_id,
    transaction_id: transaction.id,
    station_name: 'التدقيق القانوني',
    assigned_to_text: 'أحمد هادي',
    occurred_at: '2026-09-05T03:00:00.000Z',
    created_by: null,
    legacy_id: null,
    legacy_source: null,
  });
  return Object.freeze({ companies, contacts, companyContacts, transaction, latestRoute });
}

export const TRANSACTION_EDITOR_PREVIEW_EDIT_ID = TRANSACTION_ID;
