import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildContactListSnapshot, createContactDraft, isLawyerContactType, normalizeContactSearch, updateContactDraft, validateContactDraft } from '../src/features/contacts/contactModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
function contact(id: string, patch: Partial<RowOf<'contacts'>> = {}): RowOf<'contacts'> {
  return { id, workspace_id: WORKSPACE_ID, display_name: 'أحمد هادي إبراهيم', contact_type: 'محامٍ', phone: '07700000000', email: 'test@example.com', notes: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}

test('Arabic search normalizes hamza and diacritics and lawyer filter identifies Arabic lawyer types', () => {
  assert.equal(normalizeContactSearch('  أَحْمَد   '), 'احمد');
  assert.equal(isLawyerContactType('محامية شركات'), true);
  const snapshot = buildContactListSnapshot({ contacts: [contact('1'), contact('2', { display_name: 'سارة علي', contact_type: 'متابعة' })] }, { filter: 'lawyers', search: 'احمد' });
  assert.equal(snapshot.filteredTotal, 1);
  assert.equal(snapshot.items[0]?.displayName, 'أحمد هادي إبراهيم');
});

test('deleted records are excluded and merged records are truthful inactive entries', () => {
  const snapshot = buildContactListSnapshot({ contacts: [contact('1'), contact('2', { deleted_at: '2026-09-06T09:00:00.000Z' }), contact('3', { merged_into_id: '1' })] });
  assert.equal(snapshot.counts.all, 2);
  assert.equal(snapshot.counts.active, 1);
  assert.equal(snapshot.items.find((item) => item.id === '3')?.merged, true);
});

test('contact draft validates required identity and email while accepting ordinary lawyer data', () => {
  let draft = createContactDraft();
  draft = updateContactDraft(draft, 'displayName', 'نور حسين');
  draft = updateContactDraft(draft, 'contactType', 'محامية');
  draft = updateContactDraft(draft, 'email', 'nour@example.com');
  const valid = validateContactDraft(draft);
  assert.ok(valid.value);
  const bad = validateContactDraft(updateContactDraft(draft, 'email', 'not-an-email'));
  assert.equal(bad.value, null);
  assert.ok(bad.errors.email);
});
