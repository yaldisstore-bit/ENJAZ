import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import {
  buildCompanyListSnapshot,
  createCompanyDraft,
  normalizeCompanyListRequest,
  updateCompanyDraft,
  validateCompanyDraft,
} from '../src/features/companies/companyModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

function company(id: string, legalName: string, patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    legal_name: legalName,
    display_name: null,
    capital: 100_000_000,
    address: 'بغداد - الكرادة',
    activities: 'التجارة العامة والمقاولات',
    registration_number: 'REG-100',
    legal_status: 'محدودة المسؤولية',
    primary_contact_id: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-06T08:00:00.000Z',
    deleted_at: null,
    ...patch,
  };
}

test('company directory normalizes Arabic search and matches registration/address/activity', () => {
  const source = { companies: [
    company('a', 'شركة الإعمار للتجارة العامة', { display_name: 'الإعمار', registration_number: 'BGD-٢٠٢٦-١٢', address: 'بغداد - اليرموك' }),
    company('b', 'شركة أخرى', { activities: 'الخدمات الفندقية', registration_number: 'OTHER' }),
  ] };
  assert.equal(buildCompanyListSnapshot(source, { search: 'الاعمار' }).items[0]?.id, 'a');
  assert.equal(buildCompanyListSnapshot(source, { search: 'اليرموك' }).items[0]?.id, 'a');
  assert.equal(buildCompanyListSnapshot(source, { search: 'الفندقية' }).items[0]?.id, 'b');
  assert.equal(buildCompanyListSnapshot(source, { search: 'BGD' }).items[0]?.id, 'a');
});

test('company directory excludes deleted records and separates active from inactive/merged', () => {
  const source = { companies: [
    company('active', 'نشطة'),
    company('inactive', 'غير نشطة', { status: 'inactive' }),
    company('merged', 'مدمجة', { merged_into_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    company('deleted', 'محذوفة', { deleted_at: '2026-09-06T09:00:00.000Z' }),
  ] };
  const all = buildCompanyListSnapshot(source);
  assert.deepEqual(all.counts, { all: 3, active: 1, inactive: 2 });
  assert.deepEqual(buildCompanyListSnapshot(source, { filter: 'active' }).items.map((item) => item.id), ['active']);
  assert.deepEqual(new Set(buildCompanyListSnapshot(source, { filter: 'inactive' }).items.map((item) => item.id)), new Set(['inactive', 'merged']));
  assert.equal(all.items.some((item) => item.id === 'deleted'), false);
});

test('company list request clamps unsafe page inputs and caps page size', () => {
  assert.deepEqual(normalizeCompanyListRequest({ page: -4, pageSize: 999, search: ' x ' }), {
    filter: 'all', search: 'x', sort: 'activity-desc', page: 0, pageSize: 50,
  });
});

test('company draft accepts Arabic/Persian digit capital while rejecting unsafe money', () => {
  let draft = createCompanyDraft();
  draft = updateCompanyDraft(draft, 'legalName', 'ضياء المستقبل المشرق للتجارة العامة محدودة المسؤولية');
  draft = updateCompanyDraft(draft, 'capitalInput', '١٬٠٠٠٬٠٠٠٬٠٠٠');
  const valid = validateCompanyDraft(draft);
  assert.equal(valid.errors.capitalInput, undefined);
  assert.equal(valid.value?.capital, 1_000_000_000);

  draft = updateCompanyDraft(draft, 'capitalInput', '9999999999999999999999999');
  const unsafe = validateCompanyDraft(draft);
  assert.equal(unsafe.value, null);
  assert.match(unsafe.errors.capitalInput ?? '', /الدقة الآمن/);
});

test('company draft enforces legal name and bounded legal fields', () => {
  const empty = validateCompanyDraft(createCompanyDraft());
  assert.match(empty.errors.legalName ?? '', /مطلوب/);

  let draft = createCompanyDraft(company('x', 'شركة صالحة'));
  draft = updateCompanyDraft(draft, 'activities', 'أ'.repeat(1201));
  const result = validateCompanyDraft(draft);
  assert.equal(result.value, null);
  assert.match(result.errors.activities ?? '', /1200/);
});
