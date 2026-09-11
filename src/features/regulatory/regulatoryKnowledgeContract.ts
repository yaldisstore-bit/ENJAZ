export const ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA = 'enjaz.regulatory-knowledge.v1' as const;
export const REGULATORY_ID_MAX_LENGTH = 128;
export const REGULATORY_LABEL_MAX_LENGTH = 320;
export const REGULATORY_URL_MAX_LENGTH = 2048;

export type RegulatorySourceKind =
  | 'law'
  | 'regulation'
  | 'instruction'
  | 'circular'
  | 'official_notice'
  | 'procedure';

export type RegulatorySourceScope = 'official_global' | 'workspace_curated';
export type DerivedKnowledgeKind = 'editorial_interpretation' | 'ai_summary';

export interface RegulatorySourceIdentity {
  readonly schema: typeof ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA;
  readonly sourceId: string;
  readonly scope: RegulatorySourceScope;
  readonly workspaceId: string | null;
  readonly kind: RegulatorySourceKind;
  readonly jurisdiction: string;
  readonly issuer: string;
  readonly referenceCode: string;
}

export interface RegulatoryProvenance {
  readonly publisher: string;
  readonly sourceUrl: string;
  readonly retrievedOn: string;
  readonly sourceHash: string;
}

export interface RegulatorySourceVersion {
  readonly schema: typeof ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA;
  readonly sourceId: string;
  readonly versionId: string;
  readonly revision: number;
  readonly titleAr: string;
  readonly publicationDate: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly supersedesVersionId: string | null;
  readonly sourceLocator: string;
  readonly provenance: RegulatoryProvenance;
  readonly authoritative: true;
}

export interface DerivedKnowledgeArtifact {
  readonly schema: typeof ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA;
  readonly artifactId: string;
  readonly kind: DerivedKnowledgeKind;
  readonly sourceId: string;
  readonly sourceVersionId: string;
  readonly body: string;
  readonly authoritative: false;
}

export interface RegulatoryCitation {
  readonly sourceId: string;
  readonly versionId: string;
  readonly label: string;
  readonly sourceUrl: string;
  readonly retrievedOn: string;
}

const SOURCE_KINDS: readonly RegulatorySourceKind[] = [
  'law',
  'regulation',
  'instruction',
  'circular',
  'official_notice',
  'procedure',
];
const SOURCE_SCOPES: readonly RegulatorySourceScope[] = ['official_global', 'workspace_curated'];
const DERIVED_KINDS: readonly DerivedKnowledgeKind[] = ['editorial_interpretation', 'ai_summary'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function normalizeRequiredString(value: unknown, label: string, maxLength = REGULATORY_LABEL_MAX_LENGTH): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(`Invalid ${label}`);
  return normalized;
}

function normalizeId(value: unknown, label: string): string {
  return normalizeRequiredString(value, label, REGULATORY_ID_MAX_LENGTH);
}

function parseIsoDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw new TypeError(`Invalid ${label}`);
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
}

function normalizeHttpsUrl(value: unknown): string {
  const raw = normalizeRequiredString(value, 'sourceUrl', REGULATORY_URL_MAX_LENGTH);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError('Invalid sourceUrl');
  }
  if (url.protocol !== 'https:' || !url.hostname) throw new TypeError('sourceUrl must use HTTPS');
  url.hash = '';
  return url.toString();
}

function parseEffectiveInterval(input: Readonly<{ effectiveFrom: unknown; effectiveTo?: unknown }>): Readonly<{ effectiveFrom: string; effectiveTo: string | null }> {
  const effectiveFrom = parseIsoDate(input.effectiveFrom, 'effectiveFrom');
  const effectiveTo = input.effectiveTo === null || input.effectiveTo === undefined || input.effectiveTo === ''
    ? null
    : parseIsoDate(input.effectiveTo, 'effectiveTo');
  if (effectiveTo !== null && effectiveTo <= effectiveFrom) throw new TypeError('effectiveTo must be later than effectiveFrom');
  return Object.freeze({ effectiveFrom, effectiveTo });
}

export function parseRegulatorySourceIdentity(value: unknown): RegulatorySourceIdentity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA) return null;
  if (!SOURCE_KINDS.includes(record.kind as RegulatorySourceKind)) return null;
  if (!SOURCE_SCOPES.includes(record.scope as RegulatorySourceScope)) return null;
  try {
    const scope = record.scope as RegulatorySourceScope;
    const workspaceId = record.workspaceId === null || record.workspaceId === undefined || record.workspaceId === ''
      ? null
      : normalizeId(record.workspaceId, 'workspaceId');
    if (scope === 'official_global' && workspaceId !== null) return null;
    if (scope === 'workspace_curated' && workspaceId === null) return null;
    return Object.freeze({
      schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
      sourceId: normalizeId(record.sourceId, 'sourceId'),
      scope,
      workspaceId,
      kind: record.kind as RegulatorySourceKind,
      jurisdiction: normalizeRequiredString(record.jurisdiction, 'jurisdiction'),
      issuer: normalizeRequiredString(record.issuer, 'issuer'),
      referenceCode: normalizeRequiredString(record.referenceCode, 'referenceCode'),
    });
  } catch {
    return null;
  }
}

export function parseRegulatoryProvenance(value: unknown): RegulatoryProvenance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  try {
    const sourceHash = normalizeRequiredString(record.sourceHash, 'sourceHash', 64).toLowerCase();
    if (!SHA256.test(sourceHash)) return null;
    return Object.freeze({
      publisher: normalizeRequiredString(record.publisher, 'publisher'),
      sourceUrl: normalizeHttpsUrl(record.sourceUrl),
      retrievedOn: parseIsoDate(record.retrievedOn, 'retrievedOn'),
      sourceHash,
    });
  } catch {
    return null;
  }
}

export function parseRegulatorySourceVersion(value: unknown): RegulatorySourceVersion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA) return null;
  if (record.authoritative !== undefined && record.authoritative !== true) return null;
  const provenance = parseRegulatoryProvenance(record.provenance);
  if (!provenance) return null;
  try {
    const revision = record.revision;
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1 || revision > 1_000_000) return null;
    const sourceId = normalizeId(record.sourceId, 'sourceId');
    const versionId = normalizeId(record.versionId, 'versionId');
    const supersedesVersionId = record.supersedesVersionId === null || record.supersedesVersionId === undefined || record.supersedesVersionId === ''
      ? null
      : normalizeId(record.supersedesVersionId, 'supersedesVersionId');
    if (supersedesVersionId === versionId) return null;
    const publicationDate = parseIsoDate(record.publicationDate, 'publicationDate');
    const interval = parseEffectiveInterval({ effectiveFrom: record.effectiveFrom, effectiveTo: record.effectiveTo });
    return Object.freeze({
      schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
      sourceId,
      versionId,
      revision,
      titleAr: normalizeRequiredString(record.titleAr, 'titleAr'),
      publicationDate,
      ...interval,
      supersedesVersionId,
      sourceLocator: normalizeRequiredString(record.sourceLocator, 'sourceLocator'),
      provenance,
      authoritative: true,
    });
  } catch {
    return null;
  }
}

export function parseDerivedKnowledgeArtifact(value: unknown): DerivedKnowledgeArtifact | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA) return null;
  if (!DERIVED_KINDS.includes(record.kind as DerivedKnowledgeKind)) return null;
  if (record.authoritative === true) return null;
  try {
    return Object.freeze({
      schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
      artifactId: normalizeId(record.artifactId, 'artifactId'),
      kind: record.kind as DerivedKnowledgeKind,
      sourceId: normalizeId(record.sourceId, 'sourceId'),
      sourceVersionId: normalizeId(record.sourceVersionId, 'sourceVersionId'),
      body: normalizeRequiredString(record.body, 'body', 20_000),
      authoritative: false,
    });
  } catch {
    return null;
  }
}

function versionsOverlap(left: RegulatorySourceVersion, right: RegulatorySourceVersion): boolean {
  const leftEndsAfterRightStarts = left.effectiveTo === null || left.effectiveTo > right.effectiveFrom;
  const rightEndsAfterLeftStarts = right.effectiveTo === null || right.effectiveTo > left.effectiveFrom;
  return leftEndsAfterRightStarts && rightEndsAfterLeftStarts;
}

export function assertDeterministicRegulatoryLineage(versions: readonly RegulatorySourceVersion[]): void {
  const parsed = versions.map((version) => parseRegulatorySourceVersion(version));
  if (parsed.some((version) => version === null)) throw new TypeError('Invalid regulatory source version');
  const valid = parsed as RegulatorySourceVersion[];
  const bySource = new Map<string, RegulatorySourceVersion[]>();
  const globalVersionIds = new Set<string>();

  for (const version of valid) {
    const globalKey = `${version.sourceId}\u0000${version.versionId}`;
    if (globalVersionIds.has(globalKey)) throw new TypeError('Duplicate regulatory version identity');
    globalVersionIds.add(globalKey);
    const group = bySource.get(version.sourceId) ?? [];
    group.push(version);
    bySource.set(version.sourceId, group);
  }

  for (const group of bySource.values()) {
    const ordered = [...group].sort((left, right) => left.revision - right.revision);
    const revisions = new Set<number>();
    const supersededBy = new Set<string>();
    for (let index = 0; index < ordered.length; index += 1) {
      const current = ordered[index];
      if (!current) throw new TypeError('Regulatory lineage ordering invariant failed');
      if (revisions.has(current.revision)) throw new TypeError('Duplicate regulatory revision');
      revisions.add(current.revision);
      if (index === 0) {
        if (current.revision !== 1 || current.supersedesVersionId !== null) throw new TypeError('Regulatory lineage must start at revision 1');
      } else {
        const previous = ordered[index - 1];
        if (!previous || current.revision !== previous.revision + 1 || current.supersedesVersionId !== previous.versionId) {
          throw new TypeError('Broken or forked regulatory version lineage');
        }
        if (supersededBy.has(previous.versionId)) throw new TypeError('Forked regulatory version lineage');
        supersededBy.add(previous.versionId);
      }
    }
    const byEffectiveDate = [...ordered].sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
    for (let index = 1; index < byEffectiveDate.length; index += 1) {
      const previous = byEffectiveDate[index - 1];
      const current = byEffectiveDate[index];
      if (!previous || !current) throw new TypeError('Regulatory effective ordering invariant failed');
      if (versionsOverlap(previous, current)) throw new TypeError('Overlapping authoritative regulatory effective periods');
    }
  }
}

export function resolveRegulatoryVersionAsOf(
  versions: readonly RegulatorySourceVersion[],
  sourceIdInput: string,
  asOfInput: string,
): RegulatorySourceVersion | null {
  const sourceId = normalizeId(sourceIdInput, 'sourceId');
  const asOf = parseIsoDate(asOfInput, 'asOf');
  assertDeterministicRegulatoryLineage(versions);
  const active = versions
    .map((version) => parseRegulatorySourceVersion(version))
    .filter((version): version is RegulatorySourceVersion =>
      version !== null
      && version.sourceId === sourceId
      && version.effectiveFrom <= asOf
      && (version.effectiveTo === null || asOf < version.effectiveTo));
  if (active.length > 1) throw new TypeError('Ambiguous regulatory version as-of resolution');
  return active[0] ?? null;
}

export function buildRegulatoryCitation(sourceInput: RegulatorySourceIdentity, versionInput: RegulatorySourceVersion): RegulatoryCitation {
  const source = parseRegulatorySourceIdentity(sourceInput);
  const version = parseRegulatorySourceVersion(versionInput);
  if (!source || !version || source.sourceId !== version.sourceId) throw new TypeError('Citation requires a matching authoritative source/version');
  return Object.freeze({
    sourceId: source.sourceId,
    versionId: version.versionId,
    label: `${source.issuer} — ${source.referenceCode} — ${version.titleAr} — إصدار ${version.revision} — نافذ من ${version.effectiveFrom}`,
    sourceUrl: version.provenance.sourceUrl,
    retrievedOn: version.provenance.retrievedOn,
  });
}

export function normalizeArabicRegulatorySearchText(value: string): string {
  if (typeof value !== 'string') throw new TypeError('Search text must be a string');
  return value
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar-IQ');
}
