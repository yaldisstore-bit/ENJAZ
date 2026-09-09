import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
  ENJAZ_SAVED_VIEW_SCHEMA,
  createEnjazSavedViewDefinition,
  createSavedViewDraft,
  fromTransactionSavedView,
  parseEnjazSavedViewDefinition,
  parseGlobalSearchResultReference,
  toTransactionSavedView,
} from '../src/features/searchIntelligence/searchSavedViewContract.ts';
import {
  TRANSACTION_SAVED_VIEW_SCHEMA,
  createTransactionSavedViewDefinition,
} from '../src/features/transactions/transactionListModel.ts';

test('unknown saved-view schema and domain fail closed', () => {
  assert.equal(parseEnjazSavedViewDefinition({ schema: 'legacy', domain: 'transactions' }), null);
  assert.equal(parseEnjazSavedViewDefinition({
    schema: ENJAZ_SAVED_VIEW_SCHEMA,
    domain: 'finance',
    query: '',
    filters: {},
    sort: null,
    dateRange: { from: null, to: null },
    pageSize: null,
    sourceSchema: null,
  }), null);
  assert.throws(() => createEnjazSavedViewDefinition({ domain: 'finance' as never }), /domain/i);
});

test('saved-view definition stores query configuration only and normalizes bounded input', () => {
  const view = createEnjazSavedViewDefinition({
    domain: 'companies',
    query: '   شركة   النور   ',
    filters: { status: ' active ', includeArchived: false, priority: 2 },
    sort: 'name-asc',
    dateRange: { from: '2026-01-01', to: '2026-12-31' },
    pageSize: 40,
  });
  assert.equal(view.query, 'شركة النور');
  assert.deepEqual(view.filters, { status: 'active', includeArchived: false, priority: 2 });
  assert.deepEqual(view.dateRange, { from: '2026-01-01', to: '2026-12-31' });
  assert.equal(view.pageSize, 40);
  assert.equal('items' in view, false);
  assert.equal('rows' in view, false);
  assert.equal('entities' in view, false);
});

test('unsafe filter shapes, invalid ranges and unsafe page sizes fail closed', () => {
  assert.equal(parseEnjazSavedViewDefinition({
    schema: ENJAZ_SAVED_VIEW_SCHEMA,
    domain: 'transactions',
    query: '',
    filters: { nested: { unsafe: true } },
    sort: null,
    dateRange: { from: null, to: null },
    pageSize: null,
    sourceSchema: null,
  }), null);
  assert.throws(() => createEnjazSavedViewDefinition({
    domain: 'transactions',
    dateRange: { from: '2026-12-31', to: '2026-01-01' },
  }), /date range/i);
  assert.throws(() => createEnjazSavedViewDefinition({ domain: 'transactions', pageSize: 101 }), /page size/i);
});

test('personal visibility is default while shared scopes remain explicit metadata', () => {
  const definition = createEnjazSavedViewDefinition({ domain: 'people' });
  assert.equal(createSavedViewDraft({ name: '  فريقي  ', definition }).visibility, 'personal');
  assert.equal(createSavedViewDraft({ name: 'الفريق', visibility: 'team', definition }).visibility, 'team');
  assert.equal(createSavedViewDraft({ name: 'المؤسسة', visibility: 'workspace', definition }).visibility, 'workspace');
  assert.throws(() => createSavedViewDraft({ name: '   ', definition }), /name/i);
});

test('transaction saved-view adapter reuses canonical transaction schema without semantic drift', () => {
  const transaction = createTransactionSavedViewDefinition({
    view: 'stalled',
    search: '  معاملة   متوقفة ',
    sort: 'created-desc',
    pageSize: 37,
  });
  const generalized = fromTransactionSavedView(transaction);
  assert.equal(generalized.domain, 'transactions');
  assert.equal(generalized.sourceSchema, TRANSACTION_SAVED_VIEW_SCHEMA);
  assert.equal(generalized.query, transaction.search);
  assert.equal(generalized.filters.view, transaction.view);
  assert.equal(generalized.sort, transaction.sort);
  assert.equal(generalized.pageSize, transaction.pageSize);
  assert.deepEqual(toTransactionSavedView(generalized), transaction);
});

test('transaction adapter rejects incompatible source schema, view and sort instead of silently defaulting', () => {
  const base = createEnjazSavedViewDefinition({
    domain: 'transactions',
    query: 'x',
    filters: { view: 'current' },
    sort: 'activity-desc',
    pageSize: 20,
    sourceSchema: TRANSACTION_SAVED_VIEW_SCHEMA,
  });
  assert.equal(toTransactionSavedView({ ...base, sourceSchema: 'other' }), null);
  assert.equal(toTransactionSavedView({ ...base, filters: { view: 'unknown' } }), null);
  assert.equal(toTransactionSavedView({ ...base, sort: 'invented-sort' }), null);
});

test('global search result is a canonical deep-link reference and rejects unauthorized shapes', () => {
  const result = parseGlobalSearchResultReference({
    schema: ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
    domain: 'procedures',
    entityId: 'procedure-1',
    title: 'إجراء حكومي',
    subtitle: 'وزارة',
    destination: '/app/procedures/procedure-1',
  });
  assert.deepEqual(result, {
    schema: ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
    domain: 'procedures',
    entityId: 'procedure-1',
    title: 'إجراء حكومي',
    subtitle: 'وزارة',
    destination: '/app/procedures/procedure-1',
  });
  assert.equal(parseGlobalSearchResultReference({
    schema: ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
    domain: 'finance',
    entityId: '1',
    title: 'Leak',
    subtitle: null,
    destination: '/app/finance/1',
  }), null);
  assert.equal(parseGlobalSearchResultReference({
    schema: ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
    domain: 'documents',
    entityId: '1',
    title: 'Doc',
    subtitle: null,
    destination: 'https://external.invalid/doc/1',
  }), null);
});

test('foundation exposes no mutation authority over source business entities', async () => {
  const source = await import('../src/features/searchIntelligence/searchSavedViewContract.ts');
  for (const forbidden of ['createTransaction', 'updateTransaction', 'deleteTransaction', 'updateCompany', 'writeDocument', 'postPayment']) {
    assert.equal(forbidden in source, false, forbidden);
  }
});
