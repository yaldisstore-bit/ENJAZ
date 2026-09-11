export const ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA = 'enjaz.governance-ownership.v1' as const;
export const OWNERSHIP_SCALE = 1_000_000n;
export const OWNERSHIP_TOTAL_UNITS = 100n * OWNERSHIP_SCALE;
export const GOVERNANCE_ID_MAX_LENGTH = 128;
export const GOVERNANCE_SCOPE_MAX_LENGTH = 240;

export type GovernancePartyKind = 'person' | 'company';
export type OwnershipRole = 'shareholder' | 'partner';
export type GovernanceAuthorityRole = 'director' | 'manager' | 'authorized_person';

export interface GovernancePartyReference {
  readonly kind: GovernancePartyKind;
  readonly id: string;
}

export interface OwnershipStake {
  readonly schema: typeof ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA;
  readonly companyId: string;
  readonly holder: GovernancePartyReference;
  readonly role: OwnershipRole;
  readonly percentage: string;
  readonly percentageUnits: bigint;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}

export interface OwnershipSnapshot {
  readonly schema: typeof ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA;
  readonly companyId: string;
  readonly asOf: string;
  readonly stakes: readonly OwnershipStake[];
  readonly totalPercentage: string;
  readonly totalPercentageUnits: bigint;
  readonly reconciledTo100: boolean;
}

export interface BeneficialOwnerDeclaration {
  readonly schema: typeof ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA;
  readonly companyId: string;
  readonly owner: Readonly<{ kind: 'person'; id: string }>;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}

export interface GovernanceAuthorityGrant {
  readonly schema: typeof ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA;
  readonly companyId: string;
  readonly person: Readonly<{ kind: 'person'; id: string }>;
  readonly role: GovernanceAuthorityRole;
  readonly scope: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly authorizationExpiresOn: string | null;
}

const OWNERSHIP_ROLES: readonly OwnershipRole[] = ['shareholder', 'partner'];
const AUTHORITY_ROLES: readonly GovernanceAuthorityRole[] = ['director', 'manager', 'authorized_person'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CANONICAL_PERCENT = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,6})?$/;

function normalizeId(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > GOVERNANCE_ID_MAX_LENGTH) throw new TypeError(`Invalid ${label}`);
  return normalized;
}

function normalizeScope(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new TypeError('Invalid governance authority scope');
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > GOVERNANCE_SCOPE_MAX_LENGTH) throw new TypeError('Invalid governance authority scope');
  return normalized;
}

function parseIsoDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw new TypeError(`Invalid ${label}`);
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
}

function parseEffectiveInterval(input: Readonly<{ effectiveFrom: unknown; effectiveTo?: unknown }>): Readonly<{ effectiveFrom: string; effectiveTo: string | null }> {
  const effectiveFrom = parseIsoDate(input.effectiveFrom, 'effectiveFrom');
  const effectiveTo = input.effectiveTo === null || input.effectiveTo === undefined || input.effectiveTo === ''
    ? null
    : parseIsoDate(input.effectiveTo, 'effectiveTo');
  if (effectiveTo !== null && effectiveTo <= effectiveFrom) throw new TypeError('effectiveTo must be later than effectiveFrom');
  return Object.freeze({ effectiveFrom, effectiveTo });
}

export function parseOwnershipPercentage(value: unknown): Readonly<{ canonical: string; units: bigint }> | null {
  if (typeof value !== 'string' || !CANONICAL_PERCENT.test(value)) return null;
  const decimalPoint = value.indexOf('.');
  const whole = decimalPoint === -1 ? value : value.slice(0, decimalPoint);
  const fractional = decimalPoint === -1 ? '' : value.slice(decimalPoint + 1);
  const units = BigInt(whole) * OWNERSHIP_SCALE + BigInt((fractional + '000000').slice(0, 6));
  if (units <= 0n || units > OWNERSHIP_TOTAL_UNITS) return null;
  const canonicalFraction = fractional.replace(/0+$/, '');
  return Object.freeze({ canonical: canonicalFraction ? `${whole}.${canonicalFraction}` : whole, units });
}

export function formatOwnershipPercentageUnits(units: bigint): string {
  if (units < 0n || units > OWNERSHIP_TOTAL_UNITS) throw new RangeError('Ownership percentage units out of range');
  const whole = units / OWNERSHIP_SCALE;
  const fractional = (units % OWNERSHIP_SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return fractional ? `${whole}.${fractional}` : whole.toString();
}

export function parseGovernancePartyReference(value: unknown): GovernancePartyReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== 'person' && record.kind !== 'company') return null;
  try {
    return Object.freeze({ kind: record.kind, id: normalizeId(record.id, 'party id') });
  } catch {
    return null;
  }
}

export function parseOwnershipStake(value: unknown): OwnershipStake | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA) return null;
  if (!OWNERSHIP_ROLES.includes(record.role as OwnershipRole)) return null;
  const holder = parseGovernancePartyReference(record.holder);
  const percentage = parseOwnershipPercentage(record.percentage);
  if (!holder || !percentage) return null;
  try {
    const companyId = normalizeId(record.companyId, 'companyId');
    const interval = parseEffectiveInterval({ effectiveFrom: record.effectiveFrom, effectiveTo: record.effectiveTo });
    return Object.freeze({
      schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
      companyId,
      holder,
      role: record.role as OwnershipRole,
      percentage: percentage.canonical,
      percentageUnits: percentage.units,
      ...interval,
    });
  } catch {
    return null;
  }
}

function intervalsOverlap(left: OwnershipStake, right: OwnershipStake): boolean {
  const leftEndsAfterRightStarts = left.effectiveTo === null || left.effectiveTo > right.effectiveFrom;
  const rightEndsAfterLeftStarts = right.effectiveTo === null || right.effectiveTo > left.effectiveFrom;
  return leftEndsAfterRightStarts && rightEndsAfterLeftStarts;
}

export function assertNoConflictingOwnershipPeriods(stakes: readonly OwnershipStake[]): void {
  const grouped = new Map<string, OwnershipStake[]>();
  for (const rawStake of stakes) {
    const stake = parseOwnershipStake(rawStake);
    if (!stake) throw new TypeError('Invalid ownership stake');
    const key = `${stake.companyId}\u0000${stake.holder.kind}\u0000${stake.holder.id}\u0000${stake.role}`;
    const group = grouped.get(key) ?? [];
    group.push(stake);
    grouped.set(key, group);
  }
  for (const group of grouped.values()) {
    const ordered = [...group].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (!previous || !current) throw new TypeError('Ownership ordering invariant failed');
      if (intervalsOverlap(previous, current)) throw new TypeError('Conflicting ownership effective periods');
    }
  }
}

function isActiveOn(stake: OwnershipStake, asOf: string): boolean {
  return stake.effectiveFrom <= asOf && (stake.effectiveTo === null || asOf < stake.effectiveTo);
}

export function buildOwnershipSnapshot(
  stakes: readonly OwnershipStake[],
  companyIdInput: string,
  asOfInput: string,
  options: Readonly<{ requireFullReconciliation?: boolean }> = {},
): OwnershipSnapshot {
  const companyId = normalizeId(companyIdInput, 'companyId');
  const asOf = parseIsoDate(asOfInput, 'asOf');
  assertNoConflictingOwnershipPeriods(stakes);
  const active = stakes
    .map((stake) => parseOwnershipStake(stake))
    .filter((stake): stake is OwnershipStake => stake !== null && stake.companyId === companyId && isActiveOn(stake, asOf));
  const totalPercentageUnits = active.reduce((total, stake) => total + stake.percentageUnits, 0n);
  if (totalPercentageUnits > OWNERSHIP_TOTAL_UNITS) throw new TypeError('Ownership exceeds 100%');
  const reconciledTo100 = totalPercentageUnits === OWNERSHIP_TOTAL_UNITS;
  if ((options.requireFullReconciliation ?? true) && !reconciledTo100) throw new TypeError('Ownership does not reconcile to 100%');
  return Object.freeze({
    schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId,
    asOf,
    stakes: Object.freeze(active),
    totalPercentage: formatOwnershipPercentageUnits(totalPercentageUnits),
    totalPercentageUnits,
    reconciledTo100,
  });
}

export function parseBeneficialOwnerDeclaration(value: unknown): BeneficialOwnerDeclaration | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA) return null;
  const owner = parseGovernancePartyReference(record.owner);
  if (!owner || owner.kind !== 'person') return null;
  try {
    const companyId = normalizeId(record.companyId, 'companyId');
    const interval = parseEffectiveInterval({ effectiveFrom: record.effectiveFrom, effectiveTo: record.effectiveTo });
    return Object.freeze({
      schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
      companyId,
      owner: Object.freeze({ kind: 'person', id: owner.id }),
      ...interval,
    });
  } catch {
    return null;
  }
}

export function parseGovernanceAuthorityGrant(value: unknown): GovernanceAuthorityGrant | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA || !AUTHORITY_ROLES.includes(record.role as GovernanceAuthorityRole)) return null;
  const person = parseGovernancePartyReference(record.person);
  if (!person || person.kind !== 'person') return null;
  try {
    const companyId = normalizeId(record.companyId, 'companyId');
    const interval = parseEffectiveInterval({ effectiveFrom: record.effectiveFrom, effectiveTo: record.effectiveTo });
    const authorizationExpiresOn = record.authorizationExpiresOn === null || record.authorizationExpiresOn === undefined || record.authorizationExpiresOn === ''
      ? null
      : parseIsoDate(record.authorizationExpiresOn, 'authorizationExpiresOn');
    if (authorizationExpiresOn !== null && authorizationExpiresOn < interval.effectiveFrom) {
      throw new TypeError('authorizationExpiresOn precedes effectiveFrom');
    }
    return Object.freeze({
      schema: ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
      companyId,
      person: Object.freeze({ kind: 'person', id: person.id }),
      role: record.role as GovernanceAuthorityRole,
      scope: normalizeScope(record.scope),
      ...interval,
      authorizationExpiresOn,
    });
  } catch {
    return null;
  }
}
