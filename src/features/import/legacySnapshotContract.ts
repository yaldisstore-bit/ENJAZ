export const LEGACY_SNAPSHOT_SCHEMA='enjaz.legacy.snapshot.intake.v1' as const;

export type LegacyJsonValue =
  | null
  | boolean
  | number
  | string
  | LegacyJsonValue[]
  | { [key: string]: LegacyJsonValue };

export type LegacySnapshotLink = {
  kind: string;
  targetType: string;
  targetId: string;
};

export type LegacySnapshotRecord = {
  type: string;
  id: string;
  fields: Record<string, LegacyJsonValue>;
  links: LegacySnapshotLink[];
};

export type LegacySnapshot = {
  schema: typeof LEGACY_SNAPSHOT_SCHEMA;
  snapshotId: string;
  source: {
    system: string;
    exportId: string | null;
  };
  capturedAt: string;
  records: LegacySnapshotRecord[];
};

export type LegacySnapshotInventory = {
  schema: 'enjaz.legacy.snapshot.inventory.v1';
  snapshotId: string;
  sourceSystem: string;
  recordCount: number;
  typeCounts: Array<{ type: string; count: number }>;
  duplicateRecordKeys: string[];
  danglingLinks: Array<{
    sourceKey: string;
    kind: string;
    targetKey: string;
  }>;
  requiresReview: boolean;
  authoritative: false;
  readOnly: true;
  mappingPerformed: false;
  normalizationPerformed: false;
  persistencePerformed: false;
  writePlanGenerated: false;
};

export class LegacySnapshotContractError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = 'LegacySnapshotContractError';
    this.code = code;
  }
}

const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;
const MAX_RECORDS = 5000;
const MAX_RECORD_BYTES = 128 * 1024;
const MAX_LINKS_PER_RECORD = 256;
const MAX_OBJECT_KEYS = 128;
const MAX_ARRAY_ITEMS = 500;
const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 32768;
const encoder = new TextEncoder();

const utf8ByteLength = (value: unknown, code: string): number => {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new LegacySnapshotContractError(code);
  }
  return encoder.encode(serialized).byteLength;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[], code: string) => {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allow.has(key)) throw new LegacySnapshotContractError(code);
  }
};

const boundedText = (value: unknown, code: string, max = 256): string => {
  if (typeof value !== 'string') throw new LegacySnapshotContractError(code);
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new LegacySnapshotContractError(code);
  }
  return text;
};

const validIsoTimestamp = (value: unknown): string => {
  const text = boundedText(value, 'LEGACY_SNAPSHOT_CAPTURED_AT_INVALID', 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(text) || Number.isNaN(Date.parse(text))) {
    throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_CAPTURED_AT_INVALID');
  }
  return text;
};

const validateJson = (value: unknown, depth = 0): LegacyJsonValue => {
  if (depth > MAX_DEPTH) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_VALUE_TOO_DEEP');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_NUMBER_INVALID');
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_STRING_TOO_LARGE');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_ARRAY_TOO_LARGE');
    return value.map((item) => validateJson(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_OBJECT_TOO_WIDE');
    const out: Record<string, LegacyJsonValue> = {};
    for (const key of keys) {
      const safeKey = boundedText(key, 'LEGACY_SNAPSHOT_FIELD_NAME_INVALID', 256);
      out[safeKey] = validateJson(value[key], depth + 1);
    }
    return out;
  }
  throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_VALUE_INVALID');
};

const parseLink = (value: unknown): LegacySnapshotLink => {
  if (!isPlainObject(value)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_LINK_INVALID');
  exactKeys(value, ['kind','targetType','targetId'], 'LEGACY_SNAPSHOT_LINK_FIELD_FORBIDDEN');
  return {
    kind: boundedText(value.kind, 'LEGACY_SNAPSHOT_LINK_KIND_INVALID', 120),
    targetType: boundedText(value.targetType, 'LEGACY_SNAPSHOT_LINK_TARGET_TYPE_INVALID', 120),
    targetId: boundedText(value.targetId, 'LEGACY_SNAPSHOT_LINK_TARGET_ID_INVALID', 256),
  };
};

const parseRecord = (value: unknown): LegacySnapshotRecord => {
  if (!isPlainObject(value)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_RECORD_INVALID');
  exactKeys(value, ['type','id','fields','links'], 'LEGACY_SNAPSHOT_RECORD_FIELD_FORBIDDEN');
  if (!isPlainObject(value.fields)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_FIELDS_INVALID');
  if (utf8ByteLength(value, 'LEGACY_SNAPSHOT_RECORD_INVALID') > MAX_RECORD_BYTES) {
    throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_RECORD_TOO_LARGE');
  }
  const rawLinks = value.links ?? [];
  if (!Array.isArray(rawLinks) || rawLinks.length > MAX_LINKS_PER_RECORD) {
    throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_LINKS_INVALID');
  }
  return {
    type: boundedText(value.type, 'LEGACY_SNAPSHOT_RECORD_TYPE_INVALID', 120),
    id: boundedText(value.id, 'LEGACY_SNAPSHOT_RECORD_ID_INVALID', 256),
    fields: validateJson(value.fields) as Record<string, LegacyJsonValue>,
    links: rawLinks.map(parseLink),
  };
};

export const parseLegacySnapshot = (value: unknown): LegacySnapshot => {
  if (!isPlainObject(value)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_INVALID');
  if (utf8ByteLength(value, 'LEGACY_SNAPSHOT_INVALID') > MAX_SNAPSHOT_BYTES) {
    throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_TOO_LARGE');
  }
  exactKeys(value, ['schema','snapshotId','source','capturedAt','records'], 'LEGACY_SNAPSHOT_FIELD_FORBIDDEN');
  if (value.schema !== LEGACY_SNAPSHOT_SCHEMA) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_SCHEMA_INVALID');
  if (!isPlainObject(value.source)) throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_SOURCE_INVALID');
  exactKeys(value.source, ['system','exportId'], 'LEGACY_SNAPSHOT_SOURCE_FIELD_FORBIDDEN');
  const exportId = value.source.exportId == null ? null : boundedText(value.source.exportId, 'LEGACY_SNAPSHOT_EXPORT_ID_INVALID', 256);
  if (!Array.isArray(value.records) || value.records.length > MAX_RECORDS) {
    throw new LegacySnapshotContractError('LEGACY_SNAPSHOT_RECORDS_INVALID');
  }
  return {
    schema: LEGACY_SNAPSHOT_SCHEMA,
    snapshotId: boundedText(value.snapshotId, 'LEGACY_SNAPSHOT_ID_INVALID', 256),
    source: {
      system: boundedText(value.source.system, 'LEGACY_SNAPSHOT_SOURCE_SYSTEM_INVALID', 160),
      exportId,
    },
    capturedAt: validIsoTimestamp(value.capturedAt),
    records: value.records.map(parseRecord),
  };
};

const recordKey = (type: string, id: string) => `${type}:${id}`;

export const inspectLegacySnapshot = (snapshot: LegacySnapshot): LegacySnapshotInventory => {
  const counts = new Map<string, number>();
  const keys = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of snapshot.records) {
    const key = recordKey(record.type, record.id);
    if (keys.has(key)) duplicates.add(key);
    keys.add(key);
    counts.set(record.type, (counts.get(record.type) ?? 0) + 1);
  }

  const danglingLinks: LegacySnapshotInventory['danglingLinks'] = [];
  for (const record of snapshot.records) {
    const sourceKey = recordKey(record.type, record.id);
    for (const link of record.links) {
      const targetKey = recordKey(link.targetType, link.targetId);
      if (!keys.has(targetKey)) danglingLinks.push({ sourceKey, kind: link.kind, targetKey });
    }
  }

  const typeCounts = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([type, count]) => ({ type, count }));
  const duplicateRecordKeys = [...duplicates].sort();
  danglingLinks.sort((a, b) =>
    a.sourceKey.localeCompare(b.sourceKey) ||
    a.kind.localeCompare(b.kind) ||
    a.targetKey.localeCompare(b.targetKey)
  );

  return {
    schema: 'enjaz.legacy.snapshot.inventory.v1',
    snapshotId: snapshot.snapshotId,
    sourceSystem: snapshot.source.system,
    recordCount: snapshot.records.length,
    typeCounts,
    duplicateRecordKeys,
    danglingLinks,
    requiresReview: duplicateRecordKeys.length > 0 || danglingLinks.length > 0,
    authoritative: false,
    readOnly: true,
    mappingPerformed: false,
    normalizationPerformed: false,
    persistencePerformed: false,
    writePlanGenerated: false,
  };
};

export const intakeLegacySnapshot = (value: unknown): {
  snapshot: LegacySnapshot;
  inventory: LegacySnapshotInventory;
} => {
  const snapshot = parseLegacySnapshot(value);
  return { snapshot, inventory: inspectLegacySnapshot(snapshot) };
};
