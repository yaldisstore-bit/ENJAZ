import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { TransactionListSource } from './transactionListModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_A = '22222222-2222-4222-8222-222222222221';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const COMPANY_C = '22222222-2222-4222-8222-222222222223';

function company(id: string, legalName: string, displayName: string | null = null): RowOf<'companies'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    legal_name: legalName,
    display_name: displayName,
    capital: null,
    address: 'بغداد',
    activities: null,
    registration_number: null,
    legal_status: null,
    primary_contact_id: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-04T08:00:00.000Z',
    deleted_at: null,
  };
}

function transaction(
  id: string,
  companyId: string,
  type: string,
  patch: Partial<RowOf<'transactions'>> = {},
): RowOf<'transactions'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    company_id: companyId,
    primary_contact_id: null,
    type,
    department: 'مسجل الشركات',
    status: 'active',
    priority: 'normal',
    current_fee: 250_000,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-04T08:00:00.000Z',
    last_activity_at: '2026-09-04T08:00:00.000Z',
    completed_at: null,
    archived_at: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    legacy_id: null,
    legacy_source: null,
    ...patch,
  };
}

export function buildTransactionListPreviewSource(): TransactionListSource {
  const companies = [
    company(COMPANY_A, 'قمر السلطان للتجارة العامة وادارة واستثمار المطاعم محدودة المسؤولية', 'قمر السلطان'),
    company(COMPANY_B, 'روز بغداد لادارة واستثمار المطاعم وخدمات الضيافة محدودة المسؤولية', 'روز بغداد'),
    company(COMPANY_C, 'شعار بابل للتجارة والمقاولات العامة والاستثمار والتطوير العقاري محدودة المسؤولية', 'شعار بابل'),
  ];

  const transactions = [
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', COMPANY_A, 'تعديل عقد تأسيس', { legacy_id: '1042', priority: 'urgent', current_fee: 450_000, last_activity_at: '2026-09-05T08:15:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', COMPANY_B, 'قرار تأسيس', { legacy_id: '1038', status: 'stalled', priority: 'high', current_fee: 320_000, last_activity_at: '2026-09-03T09:00:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', COMPANY_C, 'تجديد بيانات شركة', { legacy_id: '1029', department: 'الضريبة', current_fee: 185_000, last_activity_at: '2026-09-04T14:20:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', COMPANY_A, 'إضافة نشاط تجاري', { legacy_id: '1017', status: 'delayed', priority: 'normal', current_fee: 210_000, last_activity_at: '2026-09-02T10:00:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', COMPANY_B, 'تغيير مدير مفوض', { legacy_id: '1008', status: 'completed', completed_at: '2026-08-28T16:00:00.000Z', current_fee: 275_000, last_activity_at: '2026-08-28T16:00:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', COMPANY_C, 'فتح فرع جديد', { legacy_id: '0994', archived_at: '2026-08-20T12:00:00.000Z', current_fee: 600_000, last_activity_at: '2026-08-20T12:00:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', COMPANY_A, 'تصديق محضر اجتماع', { legacy_id: '0988', priority: 'high', current_fee: 150_000, last_activity_at: '2026-09-01T11:30:00.000Z' }),
    transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', COMPANY_B, 'تعديل عنوان الشركة', { legacy_id: '0971', current_fee: 125_000, last_activity_at: '2026-08-31T09:45:00.000Z' }),
  ];

  return Object.freeze({ transactions: Object.freeze(transactions), companies: Object.freeze(companies) });
}
