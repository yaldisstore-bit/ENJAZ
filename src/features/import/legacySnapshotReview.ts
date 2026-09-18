import {
  inspectLegacySnapshot,
  type LegacySnapshot,
  type LegacySnapshotInventory,
} from './legacySnapshotContract.ts';

export type LegacyReviewIssueCode =
  | 'UNKNOWN_LEGACY_TYPE'
  | 'DUPLICATE_RECORD_KEY'
  | 'DANGLING_LINK';

export type LegacyTypeReview = {
  legacyType: string;
  recordCount: number;
  disposition: 'RECOGNIZED_FOR_REVIEW' | 'QUARANTINED_UNKNOWN';
  targetSystem: null;
  targetEntity: null;
  mappingPerformed: false;
};

export type LegacySnapshotReviewIssue = {
  code: LegacyReviewIssueCode;
  key: string;
  reviewRequired: true;
};

export type LegacySnapshotReviewManifest = {
  schema: 'enjaz.legacy.snapshot.review.v1';
  snapshotId: string;
  sourceSystem: string;
  recognizedLegacyTypes: string[];
  typeReviews: LegacyTypeReview[];
  issues: LegacySnapshotReviewIssue[];
  quarantinedTypeCount: number;
  quarantinedRecordCount: number;
  requiresReview: boolean;
  readOnly: true;
  mappingAllowed: false;
  normalizationAllowed: false;
  persistenceAllowed: false;
  importExecutionAllowed: false;
  targetAuthorityAssigned: false;
};

const MAX_RECOGNIZED_TYPES = 200;

const validateRecognizedLegacyTypes = (
  inventory: LegacySnapshotInventory,
  recognizedLegacyTypes: readonly string[],
): string[] => {
  if (!Array.isArray(recognizedLegacyTypes) || recognizedLegacyTypes.length > MAX_RECOGNIZED_TYPES) {
    throw new Error('LEGACY_REVIEW_RECOGNIZED_TYPES_INVALID');
  }
  const observed = new Set(inventory.typeCounts.map(item => item.type));
  const unique = new Set<string>();
  const exact: string[] = [];
  for (const value of recognizedLegacyTypes) {
    if (typeof value !== 'string' || !value || value !== value.trim() || value.length > 120) {
      throw new Error('LEGACY_REVIEW_RECOGNIZED_TYPE_INVALID');
    }
    if (unique.has(value)) throw new Error('LEGACY_REVIEW_RECOGNIZED_TYPE_DUPLICATE');
    if (!observed.has(value)) throw new Error('LEGACY_REVIEW_RECOGNIZED_TYPE_NOT_OBSERVED');
    unique.add(value);
    exact.push(value);
  }
  return exact.sort((a,b)=>a.localeCompare(b,'en'));
};

export const buildLegacySnapshotReviewManifest = (
  snapshot: LegacySnapshot,
  recognizedLegacyTypes: readonly string[] = [],
): LegacySnapshotReviewManifest => {
  const inventory = inspectLegacySnapshot(snapshot);
  const recognized = validateRecognizedLegacyTypes(inventory, recognizedLegacyTypes);
  const recognizedSet = new Set(recognized);

  const typeReviews: LegacyTypeReview[] = inventory.typeCounts.map(({type,count}) => ({
    legacyType:type,
    recordCount:count,
    disposition:recognizedSet.has(type) ? 'RECOGNIZED_FOR_REVIEW' : 'QUARANTINED_UNKNOWN',
    targetSystem:null,
    targetEntity:null,
    mappingPerformed:false,
  }));

  const issues: LegacySnapshotReviewIssue[] = [];
  for (const item of typeReviews) {
    if (item.disposition === 'QUARANTINED_UNKNOWN') {
      issues.push({code:'UNKNOWN_LEGACY_TYPE',key:item.legacyType,reviewRequired:true});
    }
  }
  for (const key of inventory.duplicateRecordKeys) {
    issues.push({code:'DUPLICATE_RECORD_KEY',key,reviewRequired:true});
  }
  for (const link of inventory.danglingLinks) {
    issues.push({
      code:'DANGLING_LINK',
      key:`${link.sourceKey}|${link.kind}|${link.targetKey}`,
      reviewRequired:true,
    });
  }
  issues.sort((a,b)=>a.code.localeCompare(b.code)||a.key.localeCompare(b.key));

  const quarantined = typeReviews.filter(item=>item.disposition==='QUARANTINED_UNKNOWN');
  return {
    schema:'enjaz.legacy.snapshot.review.v1',
    snapshotId:snapshot.snapshotId,
    sourceSystem:snapshot.source.system,
    recognizedLegacyTypes:recognized,
    typeReviews,
    issues,
    quarantinedTypeCount:quarantined.length,
    quarantinedRecordCount:quarantined.reduce((sum,item)=>sum+item.recordCount,0),
    requiresReview:issues.length>0,
    readOnly:true,
    mappingAllowed:false,
    normalizationAllowed:false,
    persistenceAllowed:false,
    importExecutionAllowed:false,
    targetAuthorityAssigned:false,
  };
};
