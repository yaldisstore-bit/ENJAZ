import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { DataPage, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
export const PHASE62_PREVIEW_USER_ID = '44444444-4444-4444-8444-444444444444';
const COMPANY_A = '22222222-2222-4222-8222-222222222221';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const CONTACT_A = '33333333-3333-4333-8333-333333333331';
const CONTACT_B = '33333333-3333-4333-8333-333333333332';
const TX_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

function contact(id: string, name: string, type: string, patch: Partial<RowOf<'contacts'>> = {}): RowOf<'contacts'> {
  return { id, workspace_id: WORKSPACE_ID, display_name: name, contact_type: type, phone: '07700000000', email: `${id.slice(-4)}@example.com`, notes: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}
function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: WORKSPACE_ID, legal_name: name, display_name: name, capital: 100_000_000, address: 'بغداد', activities: 'التجارة العامة', registration_number: null, legal_status: 'محدودة المسؤولية', primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null };
}
function relation(id: string, companyId: string, contactId: string, type: string): RowOf<'company_contacts'> { return { id, workspace_id: WORKSPACE_ID, company_id: companyId, contact_id: contactId, relation_type: type, valid_from: '2026-09-01T00:00:00.000Z', valid_to: null, created_at: '2026-09-01T08:00:00.000Z' }; }
function transaction(): RowOf<'transactions'> { return { id: TX_A, workspace_id: WORKSPACE_ID, company_id: COMPANY_A, primary_contact_id: CONTACT_A, type: 'تعديل عقد تأسيس', department: 'مسجل الشركات', status: 'active', priority: 'high', current_fee: 250_000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', last_activity_at: '2026-09-06T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null }; }

function matchesFilters(row: Record<string, unknown>, filters: readonly { column: string; operator: string; value: unknown }[] = []): boolean {
  return filters.every((filter) => {
    const value = row[filter.column];
    if (filter.operator === 'eq') return value === filter.value;
    if (filter.operator === 'is') return value === filter.value;
    if (filter.operator === 'in') return Array.isArray(filter.value) && filter.value.includes(value);
    return true;
  });
}
function page<T extends object>(rows: readonly T[], request: Readonly<{ filters?: readonly { column: string; operator: string; value: unknown }[]; offset?: number; limit?: number }> = {}): DataPage<T> {
  const filtered = rows.filter((row) => matchesFilters(row as Record<string, unknown>, request.filters));
  const offset = request.offset ?? 0; const limit = request.limit ?? 100; const items = filtered.slice(offset, offset + limit);
  return Object.freeze({ items: Object.freeze([...items]), offset, limit, total: filtered.length, hasMore: offset + items.length < filtered.length });
}

export function createPhase62PreviewDataFactory(): EnjazDataLayerFactory {
  let contacts: RowOf<'contacts'>[] = [contact(CONTACT_A, 'نور حسين', 'محامية شركات', { notes: 'متابعة قرارات الشركات والمراسلات.' }), contact(CONTACT_B, 'سارة علي', 'مسؤولة متابعة')];
  const companies = [company(COMPANY_A, 'قمر السلطان'), company(COMPANY_B, 'روز بغداد')];
  let relations: RowOf<'company_contacts'>[] = [relation('55555555-5555-4555-8555-555555555551', COMPANY_A, CONTACT_A, 'محامية')];
  let transactions = [transaction()];
  const payments: RowOf<'payments'>[] = [{ id: '66666666-6666-4666-8666-666666666661', workspace_id: WORKSPACE_ID, transaction_id: TX_A, company_id: COMPANY_A, amount: 100_000, method: 'cash', paid_at: '2026-09-05T08:00:00.000Z', status: 'posted', receipt_ref: 'R-1', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-05T08:00:00.000Z' }];
  const ledger: RowOf<'financial_ledger_entries'>[] = [];
  const activity: RowOf<'entity_lifecycle_events'>[] = [];

  const layer = {
    contacts: {
      async list(request: ListRequest<'contacts'> = {}) { return page(contacts, request); },
      async getById(id: string) { return contacts.find((row) => row.id === id) ?? null; },
      async create(values: Omit<RowOf<'contacts'>, 'workspace_id' | 'created_at' | 'updated_at'>) { const row = contact(values.id, values.display_name, values.contact_type, { ...values, created_at: '2026-09-06T09:00:00.000Z', updated_at: '2026-09-06T09:00:00.000Z' }); contacts = [...contacts, row]; return row; },
      async update(id: string, patch: Partial<RowOf<'contacts'>>) { const current = contacts.find((row) => row.id === id); if (!current) throw new Error('preview contact missing'); const row = { ...current, ...patch, id, workspace_id: WORKSPACE_ID, updated_at: '2026-09-06T10:00:00.000Z' } as RowOf<'contacts'>; contacts = contacts.map((item) => item.id === id ? row : item); return row; },
    },
    companies: { async list(request: ListRequest<'companies'> = {}) { return page(companies, request); }, async getById(id: string) { return companies.find((row) => row.id === id) ?? null; } },
    companyContacts: {
      async list(request: ListRequest<'company_contacts'> = {}) { return page(relations, request); },
      async getById(id: string) { return relations.find((row) => row.id === id) ?? null; },
      async create(values: Omit<RowOf<'company_contacts'>, 'workspace_id' | 'created_at'>) { const row = { ...values, workspace_id: WORKSPACE_ID, created_at: '2026-09-06T09:00:00.000Z' } as RowOf<'company_contacts'>; relations = [...relations, row]; return row; },
      async update(id: string, patch: Partial<RowOf<'company_contacts'>>) { const current = relations.find((row) => row.id === id); if (!current) throw new Error('preview relation missing'); const row = { ...current, ...patch, id, workspace_id: WORKSPACE_ID } as RowOf<'company_contacts'>; relations = relations.map((item) => item.id === id ? row : item); return row; },
    },
    transactions: { async list(request: ListRequest<'transactions'> = {}) { return page(transactions, request); }, async getById(id: string) { return transactions.find((row) => row.id === id) ?? null; }, async update(id: string, patch: Partial<RowOf<'transactions'>>) { const current = transactions.find((row) => row.id === id); if (!current) throw new Error('preview transaction missing'); const row = { ...current, ...patch, updated_at: '2026-09-06T10:00:00.000Z' }; transactions = transactions.map((item) => item.id === id ? row : item); return row; } },
    payments: { async list(request: ListRequest<'payments'> = {}) { return page(payments, request); } },
    ledger: { async list(request: ListRequest<'financial_ledger_entries'> = {}) { return page(ledger, request); } },
    lifecycleEvents: { async list(request: ListRequest<'entity_lifecycle_events'> = {}) { return page(activity, request); } },
  } as unknown as EnjazWorkspaceDataLayer;

  return Object.freeze({ async resolveWorkspaceId(userId: string) { return userId === PHASE62_PREVIEW_USER_ID ? WORKSPACE_ID : null; }, forWorkspace(workspaceId: string) { if (workspaceId !== WORKSPACE_ID) throw new Error('Phase 6.2 preview workspace mismatch'); return layer; } });
}
