import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
  OWNERSHIP_TOTAL_UNITS,
  assertNoConflictingOwnershipPeriods,
  buildOwnershipSnapshot,
  formatOwnershipPercentageUnits,
  parseBeneficialOwnerDeclaration,
  parseGovernanceAuthorityGrant,
  parseOwnershipPercentage,
  parseOwnershipStake,
} from '../src/features/governance/governanceOwnershipContract.ts';

function stake(input: {
  holderId: string;
  percentage: string;
  from: string;
  to?: string | null;
  companyId?: string;
  kind?: 'person' | 'company';
  role?: 'shareholder' | 'partner';
}) {
  const parsed = parseOwnershipStake({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: input.companyId ?? 'company-1',
    holder: { kind: input.kind ?? 'person', id: input.holderId },
    role: input.role ?? 'shareholder',
    percentage: input.percentage,
    effectiveFrom: input.from,
    effectiveTo: input.to ?? null,
  });
  assert.ok(parsed);
  return parsed;
}

test('ownership percentages use canonical exact micro-percent units and reject unsafe shapes', () => {
  assert.deepEqual(parseOwnershipPercentage('33.333333'), { canonical: '33.333333', units: 33_333_333n });
  assert.deepEqual(parseOwnershipPercentage('50.500000'), { canonical: '50.5', units: 50_500_000n });
  assert.deepEqual(parseOwnershipPercentage('100'), { canonical: '100', units: OWNERSHIP_TOTAL_UNITS });
  for (const invalid of ['0', '-1', '100.000001', '101', '1e2', '33.3333333', ' 50 ', 'NaN', 'Infinity', '٥٠']) {
    assert.equal(parseOwnershipPercentage(invalid), null, invalid);
  }
});

test('exact ownership reconciliation reaches 100 without floating-point drift', () => {
  const snapshot = buildOwnershipSnapshot([
    stake({ holderId: 'p1', percentage: '33.333333', from: '2026-01-01' }),
    stake({ holderId: 'p2', percentage: '33.333333', from: '2026-01-01' }),
    stake({ holderId: 'p3', percentage: '33.333334', from: '2026-01-01' }),
  ], 'company-1', '2026-09-10');
  assert.equal(snapshot.totalPercentage, '100');
  assert.equal(snapshot.totalPercentageUnits, OWNERSHIP_TOTAL_UNITS);
  assert.equal(snapshot.reconciledTo100, true);
});

test('impossible and incomplete ownership totals fail closed when full reconciliation is required', () => {
  const excessive = [
    stake({ holderId: 'p1', percentage: '60', from: '2026-01-01' }),
    stake({ holderId: 'p2', percentage: '50', from: '2026-01-01' }),
  ];
  assert.throws(() => buildOwnershipSnapshot(excessive, 'company-1', '2026-06-01'), /exceeds 100/i);

  const incomplete = [stake({ holderId: 'p1', percentage: '75', from: '2026-01-01' })];
  assert.throws(() => buildOwnershipSnapshot(incomplete, 'company-1', '2026-06-01'), /reconcile to 100/i);
  const partial = buildOwnershipSnapshot(incomplete, 'company-1', '2026-06-01', { requireFullReconciliation: false });
  assert.equal(partial.totalPercentage, '75');
  assert.equal(partial.reconciledTo100, false);
});

test('effective periods are half-open: overlap fails while end-equals-next-start is allowed', () => {
  const first = stake({ holderId: 'p1', percentage: '100', from: '2026-01-01', to: '2026-06-01' });
  const next = stake({ holderId: 'p1', percentage: '100', from: '2026-06-01' });
  assert.doesNotThrow(() => assertNoConflictingOwnershipPeriods([first, next]));

  const overlapping = stake({ holderId: 'p1', percentage: '100', from: '2026-05-31', to: '2026-08-01' });
  assert.throws(() => assertNoConflictingOwnershipPeriods([first, overlapping]), /conflicting/i);
});

test('as-of ownership snapshots preserve transfer history instead of overwriting current owner', () => {
  const history = [
    stake({ holderId: 'old-owner', percentage: '100', from: '2026-01-01', to: '2026-07-01' }),
    stake({ holderId: 'new-owner', percentage: '100', from: '2026-07-01' }),
  ];
  const before = buildOwnershipSnapshot(history, 'company-1', '2026-06-30');
  const after = buildOwnershipSnapshot(history, 'company-1', '2026-07-01');
  const beforeStake = before.stakes[0];
  const afterStake = after.stakes[0];
  assert.ok(beforeStake);
  assert.ok(afterStake);
  assert.equal(beforeStake.holder.id, 'old-owner');
  assert.equal(afterStake.holder.id, 'new-owner');
});

test('invalid dates and reversed effective periods are rejected', () => {
  assert.equal(parseOwnershipStake({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    holder: { kind: 'person', id: 'p1' },
    role: 'shareholder',
    percentage: '100',
    effectiveFrom: '2026-02-30',
    effectiveTo: null,
  }), null);
  assert.equal(parseOwnershipStake({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    holder: { kind: 'person', id: 'p1' },
    role: 'shareholder',
    percentage: '100',
    effectiveFrom: '2026-06-01',
    effectiveTo: '2026-05-31',
  }), null);
});

test('beneficial-owner declarations require an existing person reference shape', () => {
  const valid = parseBeneficialOwnerDeclaration({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    owner: { kind: 'person', id: 'person-1' },
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
  });
  assert.equal(valid?.owner.id, 'person-1');
  assert.equal(parseBeneficialOwnerDeclaration({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    owner: { kind: 'company', id: 'shadow-company' },
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
  }), null);
});

test('governance authority accepts only person roles and valid effective/expiry dates', () => {
  const grant = parseGovernanceAuthorityGrant({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    person: { kind: 'person', id: 'person-1' },
    role: 'authorized_person',
    scope: '  تمثيل الشركة   أمام الدوائر ',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    authorizationExpiresOn: '2027-01-01',
  });
  assert.equal(grant?.scope, 'تمثيل الشركة أمام الدوائر');
  assert.equal(parseGovernanceAuthorityGrant({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    person: { kind: 'company', id: 'c2' },
    role: 'manager',
    effectiveFrom: '2026-01-01',
  }), null);
  assert.equal(parseGovernanceAuthorityGrant({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId: 'c1',
    person: { kind: 'person', id: 'p1' },
    role: 'manager',
    effectiveFrom: '2026-01-01',
    authorizationExpiresOn: '2025-12-31',
  }), null);
});

test('formatting exact ownership units stays canonical', () => {
  assert.equal(formatOwnershipPercentageUnits(1n), '0.000001');
  assert.equal(formatOwnershipPercentageUnits(50_500_000n), '50.5');
  assert.equal(formatOwnershipPercentageUnits(OWNERSHIP_TOTAL_UNITS), '100');
});

test('foundation exposes no source-company or finance mutation authority and never sums ownership as floats', async () => {
  const sourceModule = await import('../src/features/governance/governanceOwnershipContract.ts');
  for (const forbidden of ['createCompany', 'updateCompany', 'deleteCompany', 'postPayment', 'writeLedger', 'saveGovernanceToDatabase']) {
    assert.equal(forbidden in sourceModule, false, forbidden);
  }
  const source = fs.readFileSync(new URL('../src/features/governance/governanceOwnershipContract.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /parseFloat\s*\(/);
  assert.doesNotMatch(source, /Number\s*\([^)]*percentage/i);
  assert.match(source, /BigInt/);
  assert.match(source, /OWNERSHIP_TOTAL_UNITS/);
});
