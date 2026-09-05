import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTransactionEditorPreviewSource } from '../src/features/transactions/transactionEditorPreview.ts';
import {
  createEmptyTransactionDraft,
  createTransactionEditDraft,
  getRelatedContacts,
  normalizeTransactionEditorDraft,
  parseSafeTransactionFee,
  toTransactionLocalDateTime,
  validateTransactionEditorDraft,
  type TransactionEditorDraft,
  type TransactionEditorSource,
} from '../src/features/transactions/transactionEditorModel.ts';

const NOW = new Date('2026-09-05T12:00:00.000Z');

function validCreateDraft(source: TransactionEditorSource): TransactionEditorDraft {
  return Object.freeze({
    ...createEmptyTransactionDraft(NOW),
    companyId: source.companies[0]?.id ?? '',
    primaryContactId: source.contacts[0]?.id ?? '',
    type: 'تعديل عقد تأسيس',
    department: 'دائرة تسجيل الشركات',
    currentFee: '450000.50',
    stationOccurredAt: toTransactionLocalDateTime(new Date(NOW.getTime() - 60_000)),
  });
}

test('transaction fee parser accepts Arabic/Persian digits but rejects unsafe or imprecise values', () => {
  assert.equal(parseSafeTransactionFee('٤٥٠٬٠٠٠٫٥٠'), 450000.5);
  assert.equal(parseSafeTransactionFee('۴۵۰۰۰۰.۲۵'), 450000.25);
  assert.equal(parseSafeTransactionFee('0'), null);
  assert.equal(parseSafeTransactionFee('-1'), null);
  assert.equal(parseSafeTransactionFee('12.345'), null);
  assert.equal(parseSafeTransactionFee('9999999999999999.99'), null);
});

test('empty transaction create fails closed on company, type and fee', () => {
  const source = buildTransactionEditorPreviewSource('create');
  const errors = validateTransactionEditorDraft(createEmptyTransactionDraft(NOW), source, 'create', NOW);
  assert.ok(errors.companyId);
  assert.ok(errors.type);
  assert.ok(errors.currentFee);
});

test('valid create normalizes workspace-owned business fields only', () => {
  const source = buildTransactionEditorPreviewSource('create');
  const normalized = normalizeTransactionEditorDraft(validCreateDraft(source), source, 'create', NOW);
  assert.equal(normalized.companyId, source.companies[0]?.id);
  assert.equal(normalized.currentFee, 450000.5);
  assert.equal(normalized.status, 'active');
  assert.equal(normalized.completedAt, null);
  assert.equal(normalized.stationName, null);
});

test('company selection limits primary contact to a current related contact', () => {
  const source = buildTransactionEditorPreviewSource('create');
  const company = source.companies[0];
  const unrelated = source.contacts.find((contact) => !getRelatedContacts(source, company?.id ?? '').some((related) => related.id === contact.id));
  assert.ok(company && unrelated);
  const draft = Object.freeze({ ...validCreateDraft(source), companyId: company.id, primaryContactId: unrelated.id });
  const errors = validateTransactionEditorDraft(draft, source, 'create', NOW);
  assert.match(errors.primaryContactId ?? '', /غير مرتبطة/);
});

test('completed transaction requires a valid non-future completion date', () => {
  const source = buildTransactionEditorPreviewSource('create');
  const base = validCreateDraft(source);
  let errors = validateTransactionEditorDraft(Object.freeze({ ...base, status: 'completed', completedAt: '' }), source, 'create', NOW);
  assert.ok(errors.completedAt);
  errors = validateTransactionEditorDraft(Object.freeze({ ...base, status: 'completed', completedAt: toTransactionLocalDateTime(new Date(NOW.getTime() + 60 * 60_000)) }), source, 'create', NOW);
  assert.match(errors.completedAt ?? '', /المستقبل/);
});

test('station assignment cannot use a future timestamp or assignee without station', () => {
  const source = buildTransactionEditorPreviewSource('create');
  const base = validCreateDraft(source);
  let errors = validateTransactionEditorDraft(Object.freeze({ ...base, stationName: '', assignedToText: 'مسؤول التدقيق' }), source, 'create', NOW);
  assert.ok(errors.stationName);
  errors = validateTransactionEditorDraft(Object.freeze({ ...base, stationName: 'التدقيق', stationOccurredAt: toTransactionLocalDateTime(new Date(NOW.getTime() + 60 * 60_000)) }), source, 'create', NOW);
  assert.match(errors.stationOccurredAt ?? '', /المستقبل/);
});

test('fee edit requires an explicit reason and preserves current source fee in the edit draft', () => {
  const source = buildTransactionEditorPreviewSource('edit');
  const edit = createTransactionEditDraft(source, NOW);
  assert.equal(Number(edit.currentFee), source.transaction?.current_fee);
  const changed = Object.freeze({ ...edit, currentFee: '475000', feeChangeReason: '' });
  const errors = validateTransactionEditorDraft(changed, source, 'edit', NOW);
  assert.match(errors.feeChangeReason ?? '', /سبب/);
});

test('archived transactions and completed reactivation stay outside Phase 5.2', () => {
  const source = buildTransactionEditorPreviewSource('edit');
  assert.ok(source.transaction);
  const archivedSource: TransactionEditorSource = Object.freeze({
    ...source,
    transaction: Object.freeze({ ...source.transaction, archived_at: '2026-09-05T10:00:00.000Z' }),
  });
  const archivedErrors = validateTransactionEditorDraft(createTransactionEditDraft(archivedSource, NOW), archivedSource, 'edit', NOW);
  assert.match(archivedErrors.form ?? '', /Phase 5.4/);

  const completedSource: TransactionEditorSource = Object.freeze({
    ...source,
    transaction: Object.freeze({ ...source.transaction, status: 'completed', completed_at: '2026-09-05T09:00:00.000Z' }),
  });
  const reactivationDraft = Object.freeze({ ...createTransactionEditDraft(completedSource, NOW), status: 'active' as const, completedAt: '' });
  const completedErrors = validateTransactionEditorDraft(reactivationDraft, completedSource, 'edit', NOW);
  assert.match(completedErrors.form ?? '', /Phase 5.4/);
});
