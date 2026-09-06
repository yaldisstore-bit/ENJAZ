import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildCompanyListSnapshot, createCompanyDraft, updateCompanyDraft, validateCompanyDraft } from '../src/features/companies/companyModel.ts';
import { buildContactListSnapshot, createContactDraft, updateContactDraft, validateContactDraft } from '../src/features/contacts/contactModel.ts';
import { isCurrentCompanyRelation } from '../src/features/contacts/contactService.ts';
import type { ContactProfileSource } from '../src/features/contacts/contactService.ts';
import { buildContact360Source } from '../src/features/entity360/entity360Service.ts';

const W = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-09-06T12:00:00.000Z');

function company(id: string, patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return {
    id,
    workspace_id: W,
    legal_name: 'شركة اختبار',
    display_name: null,
    capital: null,
    address: null,
    activities: null,
    registration_number: null,
    legal_status: null,
    primary_contact_id: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-06T08:00:00.000Z',
    deleted_at: null,
    ...patch,
  };
}

function contact(id: string, patch: Partial<RowOf<'contacts'>> = {}): RowOf<'contacts'> {
  return {
    id,
    workspace_id: W,
    display_name: 'نور حسين',
    contact_type: 'محامية',
    phone: null,
    email: null,
    notes: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-06T08:00:00.000Z',
    deleted_at: null,
    ...patch,
  };
}

function relation(patch: Partial<RowOf<'company_contacts'>> = {}): RowOf<'company_contacts'> {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    workspace_id: W,
    company_id: 'company-1',
    contact_id: 'contact-1',
    relation_type: 'محامية',
    valid_from: null,
    valid_to: null,
    created_at: '2026-09-01T08:00:00.000Z',
    ...patch,
  };
}

test('invalid legacy relationship dates fail closed instead of becoming current', () => {
  assert.equal(isCurrentCompanyRelation(relation(), NOW), true);
  assert.equal(isCurrentCompanyRelation(relation({ valid_from: 'legacy-not-a-date' }), NOW), false);
  assert.equal(isCurrentCompanyRelation(relation({ valid_to: '0000-broken-date' }), NOW), false);
  assert.equal(isCurrentCompanyRelation(relation({ valid_from: '2026-09-07T00:00:00.000Z' }), NOW), false);
  assert.equal(isCurrentCompanyRelation(relation({ valid_to: '2026-09-05T00:00:00.000Z' }), NOW), false);
});

test('duplicate legacy mappings remain truthful records and are never silently collapsed', () => {
  const companies = buildCompanyListSnapshot({ companies: [
    company('company-a', { legal_name: 'شركة ألف', legacy_id: 'LEGACY-DUP' }),
    company('company-b', { legal_name: 'شركة باء', legacy_id: 'LEGACY-DUP' }),
  ] }, { search: 'LEGACY-DUP', pageSize: 50 });
  assert.equal(companies.filteredTotal, 2);
  assert.deepEqual(new Set(companies.items.map((item) => item.id)), new Set(['company-a', 'company-b']));

  const contacts = buildContactListSnapshot({ contacts: [
    contact('contact-a', { display_name: 'أحمد Alpha', legacy_id: 'LEGACY-DUP' }),
    contact('contact-b', { display_name: 'سارة Beta', legacy_id: 'LEGACY-DUP' }),
  ] }, { search: 'legacy-dup', pageSize: 50 });
  assert.equal(contacts.filteredTotal, 2);
  assert.deepEqual(new Set(contacts.items.map((item) => item.id)), new Set(['contact-a', 'contact-b']));
});

test('huge company and person names are rejected at the write boundary', () => {
  let companyDraft = createCompanyDraft();
  companyDraft = updateCompanyDraft(companyDraft, 'legalName', 'ش'.repeat(241));
  assert.equal(validateCompanyDraft(companyDraft).value, null);

  let contactDraft = createContactDraft();
  contactDraft = updateContactDraft(contactDraft, 'displayName', 'ن'.repeat(201));
  contactDraft = updateContactDraft(contactDraft, 'contactType', 'محامية');
  assert.equal(validateContactDraft(contactDraft).value, null);
});

test('mixed Arabic Latin and digit search remains deterministic under noisy spacing', () => {
  const companies = buildCompanyListSnapshot({ companies: [
    company('mixed-company', { legal_name: 'شركة Al-Nahrain ٢٠٢٦ للتجارة', registration_number: 'IQ-BGD-77' }),
  ] }, { search: '  النهرين   2026  IQ-BGD ' });
  assert.equal(companies.filteredTotal, 1);

  const contacts = buildContactListSnapshot({ contacts: [
    contact('mixed-contact', { display_name: 'أَحْمَد Ahmed ٢٠٢٦', notes: 'Baghdad بغداد' }),
  ] }, { search: 'احمد ahmed بغداد' });
  assert.equal(contacts.filteredTotal, 1);
});

test('large relationship graphs remain explicit about truncation in 360 context', () => {
  const companyRelations = Array.from({ length: 100 }, (_, index) => ({
    relation: relation({ id: `rel-${index}`, company_id: `company-${index}` }),
    company: company(`company-${index}`),
    current: index % 2 === 0,
  }));
  const source = {
    contact: contact('contact-1'),
    companyRelations,
    transactions: [],
    truncated: { companyRelations: true, transactions: false },
  } as unknown as ContactProfileSource;
  const snapshot = buildContact360Source(source);
  assert.equal(snapshot.counts.companies, 50);
  assert.deepEqual(snapshot.truncatedScopes, ['companyRelations']);
  assert.equal(snapshot.finance.safe, true);
});

test('missing relation targets stay explicit in the source graph', () => {
  const source = {
    contact: contact('contact-1'),
    companyRelations: [{ relation: relation(), company: null, current: true }],
    transactions: [],
    truncated: { companyRelations: false, transactions: false },
  } as unknown as ContactProfileSource;
  const snapshot = buildContact360Source(source);
  assert.equal(snapshot.counts.companies, 1);
  if (snapshot.kind === 'contact') assert.equal(snapshot.contact.companyRelations[0]?.company, null);
});
