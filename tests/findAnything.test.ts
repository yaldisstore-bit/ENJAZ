import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildR2FindAnythingResults,
  normalizeR2Search,
} from '../src/ui-r2/find-anything/find-anything-model.ts';
import { buildR2PreviewSearchRecords } from '../src/ui-r2/find-anything/find-anything-preview.ts';

const PREVIEW_RECORDS = buildR2PreviewSearchRecords();

test('R2.0-8 normalizes Arabic forms without losing Latin/numeric search', () => {
  assert.equal(normalizeR2Search('  أتمتــة  '), 'اتمتة');
  assert.equal(normalizeR2Search('إدارة  ENJAZ-1042'), 'ادارة enjaz-1042');
  assert.equal(normalizeR2Search('مُعاملة'), 'معاملة');
});

test('R2.0-8 resolves canonical feature aliases to exactly one destination', () => {
  const vault = buildR2FindAnythingResults('خزنة');
  assert.equal(vault[0]?.destinationId, 'documents');
  assert.equal(vault[0]?.kind, 'feature');

  const automation = buildR2FindAnythingResults('أتمتة');
  assert.equal(automation[0]?.destinationId, 'automation');

  const lawyer = buildR2FindAnythingResults('محامي');
  assert.equal(lawyer[0]?.destinationId, 'people');
});

test('R2.0-8 discovers preview transactions by legacy id, type and company', () => {
  const byId = buildR2FindAnythingResults('1042', { records: PREVIEW_RECORDS });
  assert.equal(byId[0]?.kind, 'transaction');
  assert.equal(byId[0]?.destinationId, 'transactions.detail');
  assert.equal(byId[0]?.transactionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

  const byType = buildR2FindAnythingResults('تعديل عقد تأسيس', { records: PREVIEW_RECORDS });
  assert.ok(byType.some((result) => result.transactionId === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'));

  const byCompany = buildR2FindAnythingResults('روز بغداد', { records: PREVIEW_RECORDS });
  assert.ok(byCompany.some((result) => result.kind === 'transaction'));
});

test('R2.0-8 record provider stays bounded and labels preview truthfully', () => {
  const records = PREVIEW_RECORDS;
  assert.ok(records.length > 0);
  assert.ok(records.length <= 80);
  assert.ok(records.every((record) => record.secondary.includes('عينة Preview')));
  assert.ok(records.every((record) => record.destinationId === 'transactions.detail'));
});

test('R2.0-8 live search has no fabricated record fallback when no records are injected', () => {
  const results = buildR2FindAnythingResults('1042', { records: [] });
  assert.equal(results.some((result) => result.kind === 'transaction'), false);
});

test('R2.0-8 empty query returns bounded canonical shortcuts', () => {
  const results = buildR2FindAnythingResults('', { limit: 6 });
  assert.equal(results.length, 6);
  assert.deepEqual(results.map((result) => result.kind), ['feature', 'feature', 'feature', 'feature', 'feature', 'feature']);
  assert.equal(new Set(results.map((result) => result.destinationId)).size, results.length);
});
