import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { DataPage, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
export const PHASE61_PREVIEW_USER_ID = '44444444-4444-4444-8444-444444444444';
const COMPANY_A = '22222222-2222-4222-8222-222222222221';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const TX_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

function company(id: string, legalName: string, displayName: string, patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return { id, workspace_id: WORKSPACE_ID, legal_name: legalName, display_name: displayName, capital: 100_000_000, address: 'بغداد - اليرموك', activities: 'التجارة العامة والمقاولات', registration_number: `REG-${id.slice(-4)}`, legal_status: 'محدودة المسؤولية', primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}

function transaction(): RowOf<'transactions'> {
  return { id: TX_A, workspace_id: WORKSPACE_ID, company_id: COMPANY_A, primary_contact_id: null, type: 'تعديل عقد تأسيس', department: 'مسجل الشركات', status: 'active', priority: 'high', current_fee: 250_000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', last_activity_at: '2026-09-06T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: '1042', legacy_source: null };
}

function makePage<T>(items: readonly T[], request: Readonly<{ offset?: number; limit?: number }> = {}): DataPage<T> {
  const offset = request.offset ?? 0;
  const limit = request.limit ?? 100;
  const pageItems = items.slice(offset, offset + limit);
  return Object.freeze({ items: Object.freeze([...pageItems]), offset, limit, total: items.length, hasMore: offset + pageItems.length < items.length });
}

export function createPhase61PreviewDataFactory(): EnjazDataLayerFactory {
  let companies: RowOf<'companies'>[] = [
    company(COMPANY_A, 'قمر السلطان للتجارة العامة وإدارة واستثمار المطاعم محدودة المسؤولية', 'قمر السلطان'),
    company(COMPANY_B, 'روز بغداد لإدارة واستثمار المطاعم وخدمات الضيافة محدودة المسؤولية', 'روز بغداد', { status: 'inactive', address: 'بغداد - الكرادة', capital: 250_000_000 }),
  ];
  const transactions = [transaction()];

  const companyRepository = {
    async list(request: ListRequest<'companies'> = {}) { return makePage(companies.filter((row) => row.deleted_at === null), request); },
    async getById(id: string) { return companies.find((row) => row.id === id && row.deleted_at === null) ?? null; },
    async create(values: Omit<RowOf<'companies'>, 'workspace_id' | 'created_at' | 'updated_at'>) {
      const row = company(values.id, values.legal_name, values.display_name ?? values.legal_name, { ...values, created_at: '2026-09-06T09:00:00.000Z', updated_at: '2026-09-06T09:00:00.000Z' });
      companies = [...companies, row];
      return row;
    },
    async update(id: string, patch: Partial<RowOf<'companies'>>) {
      const current = companies.find((row) => row.id === id);
      if (!current) throw new Error('preview company missing');
      const row = { ...current, ...patch, id, workspace_id: WORKSPACE_ID, updated_at: '2026-09-06T10:00:00.000Z' } as RowOf<'companies'>;
      companies = companies.map((item) => item.id === id ? row : item);
      return row;
    },
  };

  const emptyRepository = { async list() { return makePage([]); }, async getById() { return null; } };
  const layer = {
    companies: companyRepository,
    transactions: { async list(request: ListRequest<'transactions'> = {}) { return makePage(transactions.filter((row) => !request.filters?.some((filter) => filter.column === 'company_id' && filter.value !== row.company_id)), request); }, async getById(id: string) { return transactions.find((row) => row.id === id) ?? null; } },
    companyContacts: emptyRepository,
    contacts: emptyRepository,
    documents: emptyRepository,
    payments: emptyRepository,
    ledger: emptyRepository,
    lifecycleEvents: emptyRepository,
    blockers: emptyRepository,
  } as unknown as EnjazWorkspaceDataLayer;

  return Object.freeze({
    async resolveWorkspaceId(userId: string) { return userId === PHASE61_PREVIEW_USER_ID ? WORKSPACE_ID : null; },
    forWorkspace(workspaceId: string) {
      if (workspaceId !== WORKSPACE_ID) throw new Error('Phase 6.1 preview workspace mismatch');
      return layer;
    },
  });
}
