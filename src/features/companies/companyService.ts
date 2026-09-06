import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { CompanyDraft, CompanyListSource, ValidatedCompanyDraft } from './companyModel.ts';
import { validateCompanyDraft } from './companyModel.ts';

const COMPANY_BATCH_SIZE = 100;
export const COMPANY_SOURCE_LIMIT = 5_000;
const DETAIL_LIMIT = 100;
const ACTIVITY_LIMIT = 50;

export interface CompanyContactContext {
  readonly relation: RowOf<'company_contacts'>;
  readonly contact: RowOf<'contacts'> | null;
}

export interface CompanyDetailSource {
  readonly company: RowOf<'companies'>;
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly documents: readonly RowOf<'documents'>[];
  readonly payments: readonly RowOf<'payments'>[];
  readonly ledger: readonly RowOf<'financial_ledger_entries'>[];
  readonly contacts: readonly CompanyContactContext[];
  readonly activity: readonly RowOf<'entity_lifecycle_events'>[];
  readonly blockers: readonly RowOf<'transaction_blockers'>[];
  readonly truncated: Readonly<{
    transactions: boolean;
    documents: boolean;
    payments: boolean;
    ledger: boolean;
    contacts: boolean;
    activity: boolean;
    blockers: boolean;
  }>;
}

export class CompanyWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'CompanyWorkspaceUnavailableError';
  }
}

export class CompanyListCapacityError extends Error {
  constructor() {
    super(`Company list exceeds the Phase 6.1 safe source limit of ${COMPANY_SOURCE_LIMIT} rows`);
    this.name = 'CompanyListCapacityError';
  }
}

export class CompanyNotFoundError extends Error {
  constructor() {
    super('Company was not found in the current workspace');
    this.name = 'CompanyNotFoundError';
  }
}

export class CompanyEditConflictError extends Error {
  constructor() {
    super('Company changed after the editor was loaded');
    this.name = 'CompanyEditConflictError';
  }
}

export class CompanyMergedRecordError extends Error {
  constructor() {
    super('Merged company records cannot be edited in Phase 6.1');
    this.name = 'CompanyMergedRecordError';
  }
}

export class CompanyCreateReplayConflictError extends Error {
  constructor() {
    super('The stable company create operation id already belongs to different data');
    this.name = 'CompanyCreateReplayConflictError';
  }
}

async function resolveLayer(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; layer: EnjazWorkspaceDataLayer }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new CompanyWorkspaceUnavailableError();
  return Object.freeze({ workspaceId, layer: factory.forWorkspace(workspaceId) });
}

async function collectCompanies(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'companies'>[]> {
  const rows: RowOf<'companies'>[] = [];
  let offset = 0;
  for (;;) {
    const page = await layer.companies.list({
      filters: [{ column: 'deleted_at', operator: 'is', value: null }],
      orderBy: [{ column: 'updated_at', ascending: false }],
      offset,
      limit: COMPANY_BATCH_SIZE,
    });
    rows.push(...page.items);
    if (rows.length > COMPANY_SOURCE_LIMIT) throw new CompanyListCapacityError();
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing company source page');
    offset += page.items.length;
  }
}

export async function loadCompanyListSource(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; source: CompanyListSource }>> {
  const { workspaceId, layer } = await resolveLayer(factory, userId);
  const companies = await collectCompanies(layer);
  return Object.freeze({ workspaceId, source: Object.freeze({ companies }) });
}

async function loadContacts(layer: EnjazWorkspaceDataLayer, companyId: string): Promise<Readonly<{ items: readonly CompanyContactContext[]; truncated: boolean }>> {
  const relationsPage = await layer.companyContacts.list({
    filters: [{ column: 'company_id', operator: 'eq', value: companyId }],
    orderBy: [{ column: 'created_at', ascending: false }],
    offset: 0,
    limit: DETAIL_LIMIT,
  });
  const relations = relationsPage.items;
  const ids = [...new Set(relations.map((row) => row.contact_id))];
  const contacts: RowOf<'contacts'>[] = [];
  for (let index = 0; index < ids.length; index += COMPANY_BATCH_SIZE) {
    const batch = ids.slice(index, index + COMPANY_BATCH_SIZE);
    if (!batch.length) continue;
    const page = await layer.contacts.list({
      filters: [
        { column: 'id', operator: 'in', value: batch },
        { column: 'deleted_at', operator: 'is', value: null },
      ],
      orderBy: [{ column: 'display_name', ascending: true }],
      offset: 0,
      limit: COMPANY_BATCH_SIZE,
    });
    contacts.push(...page.items);
  }
  const byId = new Map(contacts.map((row) => [row.id, row] as const));
  return Object.freeze({
    items: Object.freeze(relations.map((relation) => Object.freeze({ relation, contact: byId.get(relation.contact_id) ?? null }))),
    truncated: relationsPage.hasMore,
  });
}

async function loadBlockers(layer: EnjazWorkspaceDataLayer, transactionIds: readonly string[]): Promise<Readonly<{ items: readonly RowOf<'transaction_blockers'>[]; truncated: boolean }>> {
  const rows: RowOf<'transaction_blockers'>[] = [];
  let truncated = false;
  for (let index = 0; index < transactionIds.length; index += COMPANY_BATCH_SIZE) {
    const batch = transactionIds.slice(index, index + COMPANY_BATCH_SIZE);
    if (!batch.length) continue;
    const page = await layer.blockers.list({
      filters: [{ column: 'transaction_id', operator: 'in', value: batch }],
      orderBy: [{ column: 'opened_at', ascending: false }],
      offset: 0,
      limit: DETAIL_LIMIT,
    });
    rows.push(...page.items);
    truncated ||= page.hasMore;
  }
  return Object.freeze({ items: Object.freeze(rows.slice(0, DETAIL_LIMIT)), truncated: truncated || rows.length > DETAIL_LIMIT });
}

export async function loadCompanyDetailSource(factory: EnjazDataLayerFactory, userId: string, companyId: string): Promise<Readonly<{ workspaceId: string; source: CompanyDetailSource }>> {
  const { workspaceId, layer } = await resolveLayer(factory, userId);
  const company = await layer.companies.getById(companyId);
  if (!company || company.deleted_at !== null) throw new CompanyNotFoundError();

  const [transactionsPage, documentsPage, paymentsPage, ledgerPage, contactsResult, activityPage] = await Promise.all([
    layer.transactions.list({ filters: [{ column: 'company_id', operator: 'eq', value: companyId }, { column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'last_activity_at', ascending: false }], offset: 0, limit: DETAIL_LIMIT }),
    layer.documents.list({ filters: [{ column: 'company_id', operator: 'eq', value: companyId }], orderBy: [{ column: 'updated_at', ascending: false }], offset: 0, limit: DETAIL_LIMIT }),
    layer.payments.list({ filters: [{ column: 'company_id', operator: 'eq', value: companyId }], orderBy: [{ column: 'paid_at', ascending: false }], offset: 0, limit: DETAIL_LIMIT }),
    layer.ledger.list({ filters: [{ column: 'company_id', operator: 'eq', value: companyId }], orderBy: [{ column: 'occurred_at', ascending: false }], offset: 0, limit: DETAIL_LIMIT }),
    loadContacts(layer, companyId),
    layer.lifecycleEvents.list({ filters: [{ column: 'entity_type', operator: 'eq', value: 'company' }, { column: 'entity_id', operator: 'eq', value: companyId }], orderBy: [{ column: 'effective_at', ascending: false }], offset: 0, limit: ACTIVITY_LIMIT }),
  ]);
  const blockersResult = await loadBlockers(layer, transactionsPage.items.map((row) => row.id));

  return Object.freeze({
    workspaceId,
    source: Object.freeze({
      company,
      transactions: Object.freeze([...transactionsPage.items]),
      documents: Object.freeze([...documentsPage.items]),
      payments: Object.freeze([...paymentsPage.items]),
      ledger: Object.freeze([...ledgerPage.items]),
      contacts: contactsResult.items,
      activity: Object.freeze([...activityPage.items]),
      blockers: blockersResult.items,
      truncated: Object.freeze({
        transactions: transactionsPage.hasMore,
        documents: documentsPage.hasMore,
        payments: paymentsPage.hasMore,
        ledger: ledgerPage.hasMore,
        contacts: contactsResult.truncated,
        activity: activityPage.hasMore,
        blockers: blockersResult.truncated,
      }),
    }),
  });
}

function sameCreatePayload(existing: RowOf<'companies'>, value: ValidatedCompanyDraft): boolean {
  return existing.deleted_at === null && existing.merged_into_id === null
    && existing.legal_name === value.legalName
    && existing.display_name === value.displayName
    && existing.capital === value.capital
    && existing.address === value.address
    && existing.activities === value.activities
    && existing.registration_number === value.registrationNumber
    && existing.legal_status === value.legalStatus
    && existing.status === value.status;
}

export async function saveCompany(
  factory: EnjazDataLayerFactory,
  userId: string,
  mode: 'create' | 'edit',
  draft: CompanyDraft,
  options: Readonly<{ companyId?: string | null; expectedUpdatedAt?: string | null; createOperationId?: string | null }> = {},
): Promise<RowOf<'companies'>> {
  const validation = validateCompanyDraft(draft);
  if (!validation.value) throw new Error('Company draft failed model validation');
  const value = validation.value;
  const { layer } = await resolveLayer(factory, userId);

  if (mode === 'create') {
    const operationId = options.createOperationId?.trim();
    if (!operationId) throw new Error('Stable company create operation id is required');
    const existing = await layer.companies.getById(operationId);
    if (existing) {
      if (sameCreatePayload(existing, value)) return existing;
      throw new CompanyCreateReplayConflictError();
    }
    return layer.companies.create({
      id: operationId,
      legal_name: value.legalName,
      display_name: value.displayName,
      capital: value.capital,
      address: value.address,
      activities: value.activities,
      registration_number: value.registrationNumber,
      legal_status: value.legalStatus,
      primary_contact_id: null,
      status: value.status,
      merged_into_id: null,
      legacy_id: null,
      legacy_source: null,
      deleted_at: null,
    });
  }

  const companyId = options.companyId?.trim();
  if (!companyId) throw new CompanyNotFoundError();
  const current = await layer.companies.getById(companyId);
  if (!current || current.deleted_at !== null) throw new CompanyNotFoundError();
  if (current.merged_into_id !== null) throw new CompanyMergedRecordError();
  if (options.expectedUpdatedAt && current.updated_at !== options.expectedUpdatedAt) throw new CompanyEditConflictError();
  return layer.companies.update(companyId, {
    legal_name: value.legalName,
    display_name: value.displayName,
    capital: value.capital,
    address: value.address,
    activities: value.activities,
    registration_number: value.registrationNumber,
    legal_status: value.legalStatus,
    status: value.status,
  });
}
