import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompanyDetailSource } from '../src/features/companies/companyService.ts';
import type { ContactProfileSource } from '../src/features/contacts/contactService.ts';
import { buildCompany360Source, buildContact360Source } from '../src/features/entity360/entity360Service.ts';

const companySource = {
  company: { id: 'company-1', legal_name: 'شركة الاختبار القانونية', display_name: 'شركة الاختبار', status: 'active', merged_into_id: null },
  transactions: [{ id: 'tx-1', current_fee: 250000 }], documents: [{ id: 'doc-1' }], payments: [{ id: 'pay-1', status: 'posted', amount: 50000 }], ledger: [],
  contacts: [{ relation: { id: 'rel-1' }, contact: { id: 'contact-1' } }], activity: [], blockers: [{ id: 'block-1', status: 'open' }, { id: 'block-2', status: 'resolved' }],
  truncated: { transactions: true, documents: false, payments: false, ledger: false, contacts: false, activity: false, blockers: false },
} as unknown as CompanyDetailSource;
const contactSource = {
  contact: { id: 'contact-1', display_name: 'أحمد هادي', contact_type: 'محامٍ', status: 'active', merged_into_id: null },
  companyRelations: [{ relation: { id: 'rel-1' }, company: { id: 'company-1' }, current: true }, { relation: { id: 'rel-2' }, company: { id: 'company-2' }, current: false }],
  transactions: [{ id: 'tx-1', current_fee: 125000 }, { id: 'tx-2', current_fee: 75000 }], truncated: { companyRelations: false, transactions: true },
} as unknown as ContactProfileSource;

test('company 360 composes authoritative Phase 6.1 context without duplicating source data', () => {
  const snapshot = buildCompany360Source(companySource);
  assert.equal(snapshot.kind, 'company'); assert.equal(snapshot.title, 'شركة الاختبار'); assert.equal(snapshot.counts.transactions, 1); assert.equal(snapshot.counts.contacts, 1); assert.equal(snapshot.counts.documents, 1); assert.equal(snapshot.counts.openBlockers, 1);
  assert.deepEqual(snapshot.finance, { amount: 50000, safe: true, partial: false }); assert.deepEqual(snapshot.truncatedScopes, ['transactions']);
  if (snapshot.kind === 'company') assert.equal(snapshot.company, companySource);
});

test('contact 360 composes Phase 6.2 relationships and declares partial transaction context', () => {
  const snapshot = buildContact360Source(contactSource);
  assert.equal(snapshot.kind, 'contact'); assert.equal(snapshot.title, 'أحمد هادي'); assert.equal(snapshot.counts.companies, 1); assert.equal(snapshot.counts.transactions, 2);
  assert.deepEqual(snapshot.finance, { amount: 200000, safe: true, partial: true }); assert.deepEqual(snapshot.truncatedScopes, ['transactions']);
  if (snapshot.kind === 'contact') assert.equal(snapshot.contact, contactSource);
});

test('360 financial pulse fails safe when precision cannot be represented safely', () => {
  const unsafe = { ...contactSource, transactions: [{ id: 'tx-unsafe', current_fee: Number.MAX_SAFE_INTEGER }], truncated: { companyRelations: false, transactions: false } } as unknown as ContactProfileSource;
  const snapshot = buildContact360Source(unsafe); assert.equal(snapshot.finance.safe, false); assert.equal(snapshot.finance.amount, null);
});
