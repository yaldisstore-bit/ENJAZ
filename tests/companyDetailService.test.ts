import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { loadCompanyDetailSource } from '../src/features/companies/companyService.ts';

const W = '11111111-1111-4111-8111-111111111111';
const U = '44444444-4444-4444-8444-444444444444';
const C = '22222222-2222-4222-8222-222222222222';
const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const P = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const page = <TValue>(items: readonly TValue[], hasMore = false) => ({ items, offset: 0, limit: 100, total: items.length, hasMore });

const company: RowOf<'companies'> = { id: C, workspace_id: W, legal_name: 'شركة الاختبار', display_name: 'الاختبار', capital: 100000000, address: 'بغداد', activities: 'تجارة عامة', registration_number: 'REG-1', legal_status: 'محدودة المسؤولية', primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null };
const transaction: RowOf<'transactions'> = { id: T, workspace_id: W, company_id: C, primary_contact_id: null, type: 'تعديل عقد', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: 250000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', last_activity_at: '2026-09-06T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null };
const contact: RowOf<'contacts'> = { id: P, workspace_id: W, display_name: 'أحمد هادي', contact_type: 'manager', phone: null, email: null, notes: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null };
const relation: RowOf<'company_contacts'> = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', workspace_id: W, company_id: C, contact_id: P, relation_type: 'manager', valid_from: null, valid_to: null, created_at: '2026-08-01T08:00:00.000Z' };
const document: RowOf<'documents'> = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', workspace_id: W, company_id: C, transaction_id: null, title: 'شهادة تأسيس.pdf', document_type: 'certificate', mime_type: 'application/pdf', storage_path: `${W}/doc/original.pdf`, size_bytes: 100, original_size_bytes: 100, checksum: null, status: 'active', captured_at: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', legacy_id: null, legacy_source: null };
const payment: RowOf<'payments'> = { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', workspace_id: W, transaction_id: T, company_id: C, amount: 50000, method: 'cash', paid_at: '2026-09-06T08:00:00.000Z', status: 'posted', receipt_ref: 'R-1', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-06T08:00:00.000Z' };
const activity: RowOf<'entity_lifecycle_events'> = { id: '12121212-1212-4121-8121-121212121212', workspace_id: W, entity_type: 'company', entity_id: C, event_type: 'created', title: 'إنشاء الشركة', effective_at: '2026-08-01T08:00:00.000Z', recorded_at: '2026-08-01T08:00:00.000Z', note: null, state_snapshot: null, source: 'system', actor_user_id: null };
const blocker: RowOf<'transaction_blockers'> = { id: '13131313-1313-4131-8131-131313131313', workspace_id: W, transaction_id: T, title: 'نقص مستند', severity: 'high', note: null, status: 'open', opened_at: '2026-09-06T08:00:00.000Z', resolved_at: null };

test('company detail composes relations from authoritative repositories and exposes truncation', async () => {
  const layer = {
    companies: { async getById() { return company; } },
    transactions: { async list() { return page([transaction], true); } },
    documents: { async list() { return page([document]); } },
    payments: { async list() { return page([payment]); } },
    ledger: { async list() { return page([]); } },
    companyContacts: { async list() { return page([relation]); } },
    contacts: { async list() { return page([contact]); } },
    lifecycleEvents: { async list() { return page([activity]); } },
    blockers: { async list() { return page([blocker]); } },
  } as unknown as EnjazWorkspaceDataLayer;
  const factory = { async resolveWorkspaceId() { return W; }, forWorkspace() { return layer; } } as EnjazDataLayerFactory;
  const result = await loadCompanyDetailSource(factory, U, C);
  assert.equal(result.source.company.id, C);
  assert.equal(result.source.transactions[0]?.id, T);
  assert.equal(result.source.contacts[0]?.contact?.display_name, 'أحمد هادي');
  assert.equal(result.source.documents[0]?.title, 'شهادة تأسيس.pdf');
  assert.equal(result.source.payments[0]?.receipt_ref, 'R-1');
  assert.equal(result.source.activity[0]?.event_type, 'created');
  assert.equal(result.source.blockers[0]?.severity, 'high');
  assert.equal(result.source.truncated.transactions, true);
});
