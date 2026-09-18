import { buildLegacyMappingPreview, type LegacyMappingPreview, type LegacyMappingTargetTable } from './legacyMappingContract.ts';

export const LEGACY_ORDERED_IMPORT_PLAN_SCHEMA='enjaz.legacy.ordered-import.plan.v1' as const;

export type LegacyOrderedImportStageTable='contacts'|'companies'|'transactions';
export type LegacyOrderedImportItem={
  ordinal:number;
  stage:number;
  sourceKey:string;
  targetTable:LegacyOrderedImportStageTable;
  normalizedFields:Record<string,string|number|boolean|null>;
  writeAllowed:false;
  generatedTargetId:null;
};
export type LegacyOrderedRelationshipBinding={
  sourceKey:string;
  targetKey:string;
  targetField:'company_id'|'primary_contact_id';
  sourceTargetTable:LegacyOrderedImportStageTable;
  targetTargetTable:LegacyOrderedImportStageTable;
  assignmentPerformed:false;
  generatedTargetId:null;
  writeAllowed:false;
};
export type LegacyOrderedImportPlan={
  schema:typeof LEGACY_ORDERED_IMPORT_PLAN_SCHEMA;
  snapshotId:string;
  mappingPlanId:string;
  stageOrder:readonly ['contacts','companies','transactions'];
  items:LegacyOrderedImportItem[];
  relationshipBindings:LegacyOrderedRelationshipBinding[];
  deterministic:true;
  readOnlyPlan:true;
  persistencePerformed:false;
  importExecutionAllowed:false;
  targetMutationPerformed:false;
  idGenerationPerformed:false;
  foreignKeyAssignmentPerformed:false;
  idempotencyBindingPerformed:false;
  eligibleForA2Binding:true;
};

export class LegacyOrderedImportContractError extends Error{
  readonly code:string;
  constructor(code:string){super(code);this.name='LegacyOrderedImportContractError';this.code=code}
}

const STAGE_ORDER=Object.freeze(['contacts','companies','transactions'] as const);
const STAGE:Readonly<Record<LegacyOrderedImportStageTable,number>>=Object.freeze({contacts:1,companies:2,transactions:3});
const isStageTable=(value:LegacyMappingTargetTable):value is LegacyOrderedImportStageTable=>value==='contacts'||value==='companies'||value==='transactions';

function failIfUnsafe(preview:LegacyMappingPreview){
  if(preview.records.length===0)throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_EMPTY');
  if(preview.unmappedLegacyTypes.length)throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES');
  if(preview.duplicateRecordKeys.length)throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_DUPLICATE_KEYS');
  if(preview.danglingLinks.length)throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_DANGLING_LINKS');
  if(preview.unmappedRelationshipLinks.length)throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_UNMAPPED_RELATIONSHIPS');
  if(preview.relationshipIntents.some(x=>x.disposition!=='RESOLVED_RELATIONSHIP_PREVIEW'||x.reviewRequired))throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_RELATIONSHIP_REVIEW_REQUIRED');
  if(preview.records.some(x=>x.disposition!=='MAPPED_PREVIEW'||x.reviewRequired||x.targetTable===null||x.normalizedFields===null))throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_RECORD_REVIEW_REQUIRED');
}

export function buildLegacyOrderedImportPlan(snapshotValue:unknown,mappingPlanValue:unknown):LegacyOrderedImportPlan{
  const preview=buildLegacyMappingPreview(snapshotValue,mappingPlanValue);
  failIfUnsafe(preview);

  const bySource=new Map(preview.records.map(record=>[record.sourceKey,record] as const));
  const items=preview.records.map(record=>{
    if(record.targetTable===null||record.normalizedFields===null||!isStageTable(record.targetTable))throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_TARGET_TABLE_INVALID');
    return {
      ordinal:0,
      stage:STAGE[record.targetTable],
      sourceKey:record.sourceKey,
      targetTable:record.targetTable,
      normalizedFields:{...record.normalizedFields},
      writeAllowed:false as const,
      generatedTargetId:null,
    };
  }).sort((a,b)=>a.stage-b.stage||a.sourceKey.localeCompare(b.sourceKey,'en'));

  items.forEach((item,index)=>{item.ordinal=index+1});

  const relationshipBindings=preview.relationshipIntents.map(intent=>{
    const source=bySource.get(intent.sourceKey),target=bySource.get(intent.targetKey);
    if(!source||!target||source.targetTable===null||target.targetTable===null||!isStageTable(source.targetTable)||!isStageTable(target.targetTable))throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_RELATIONSHIP_ENDPOINT_INVALID');
    if(STAGE[target.targetTable]>=STAGE[source.targetTable])throw new LegacyOrderedImportContractError('LEGACY_ORDERED_IMPORT_DEPENDENCY_ORDER_INVALID');
    return {
      sourceKey:intent.sourceKey,
      targetKey:intent.targetKey,
      targetField:intent.targetField,
      sourceTargetTable:source.targetTable,
      targetTargetTable:target.targetTable,
      assignmentPerformed:false as const,
      generatedTargetId:null,
      writeAllowed:false as const,
    };
  }).sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey,'en')||a.targetField.localeCompare(b.targetField,'en')||a.targetKey.localeCompare(b.targetKey,'en'));

  return {
    schema:LEGACY_ORDERED_IMPORT_PLAN_SCHEMA,
    snapshotId:preview.snapshotId,
    mappingPlanId:preview.planId,
    stageOrder:STAGE_ORDER,
    items,
    relationshipBindings,
    deterministic:true,
    readOnlyPlan:true,
    persistencePerformed:false,
    importExecutionAllowed:false,
    targetMutationPerformed:false,
    idGenerationPerformed:false,
    foreignKeyAssignmentPerformed:false,
    idempotencyBindingPerformed:false,
    eligibleForA2Binding:true,
  };
}
