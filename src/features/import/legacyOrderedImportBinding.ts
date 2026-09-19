import { buildLegacyOrderedImportPlan, type LegacyOrderedImportPlan, type LegacyOrderedImportStageTable } from './legacyOrderedImportContract.ts';

export const LEGACY_ORDERED_IMPORT_BINDING_SCHEMA='enjaz.legacy.ordered-import.binding.v1' as const;
export const LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA='enjaz.legacy.ordered-import.execution-manifest.v1' as const;

export type LegacyTargetIdBinding={sourceKey:string;targetId:string};
export type LegacyOrderedImportBindingSpec={
  schema:typeof LEGACY_ORDERED_IMPORT_BINDING_SCHEMA;
  workspaceId:string;
  batchId:string;
  idempotencyKey:string;
  bindings:LegacyTargetIdBinding[];
};
export type LegacyBoundImportItem={
  ordinal:number;
  stage:number;
  sourceKey:string;
  targetTable:LegacyOrderedImportStageTable;
  targetId:string;
  normalizedFields:Record<string,string|number|boolean|null>;
  writeAllowed:false;
};
export type LegacyBoundRelationship={
  sourceKey:string;
  targetKey:string;
  targetField:'company_id'|'primary_contact_id';
  sourceTargetId:string;
  targetTargetId:string;
  sourceTargetTable:LegacyOrderedImportStageTable;
  targetTargetTable:LegacyOrderedImportStageTable;
  assignmentPerformed:false;
  writeAllowed:false;
};
export type LegacyOrderedImportExecutionManifest={
  schema:typeof LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA;
  snapshotId:string;
  mappingPlanId:string;
  workspaceId:string;
  batchId:string;
  idempotencyKey:string;
  stageOrder:readonly ['contacts','companies','transactions'];
  items:LegacyBoundImportItem[];
  relationshipBindings:LegacyBoundRelationship[];
  deterministic:true;
  workspacePermissionVerified:false;
  idempotencyBound:true;
  idempotencyEnforcementPerformed:false;
  targetIdsGenerated:false;
  foreignKeyBindingPerformed:true;
  foreignKeyAssignmentPerformed:false;
  persistencePerformed:false;
  importExecutionAllowed:false;
  targetMutationPerformed:false;
  readyForA3ExecutionBoundary:true;
};

export class LegacyOrderedImportBindingError extends Error{
  readonly code:string;
  constructor(code:string){super(code);this.name='LegacyOrderedImportBindingError';this.code=code}
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IDEMPOTENCY=/^[A-Za-z0-9:_-]{8,128}$/;
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,allowed:readonly string[],code:string)=>{const set=new Set(allowed);for(const key of Object.keys(value))if(!set.has(key))throw new LegacyOrderedImportBindingError(code)};
const canonicalUuid=(value:unknown,code:string)=>{if(typeof value!=='string'||!UUID.test(value))throw new LegacyOrderedImportBindingError(code);return value};

export function parseLegacyOrderedImportBindingSpec(value:unknown,plan:LegacyOrderedImportPlan):LegacyOrderedImportBindingSpec{
  if(!object(value))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_BINDING_INVALID');
  exact(value,['schema','workspaceId','batchId','idempotencyKey','bindings'],'LEGACY_IMPORT_BINDING_FIELD_FORBIDDEN');
  if(value.schema!==LEGACY_ORDERED_IMPORT_BINDING_SCHEMA)throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_BINDING_SCHEMA_INVALID');
  const workspaceId=canonicalUuid(value.workspaceId,'LEGACY_IMPORT_WORKSPACE_ID_INVALID');
  const batchId=canonicalUuid(value.batchId,'LEGACY_IMPORT_BATCH_ID_INVALID');
  if(typeof value.idempotencyKey!=='string'||!IDEMPOTENCY.test(value.idempotencyKey))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_IDEMPOTENCY_KEY_INVALID');
  if(!Array.isArray(value.bindings)||value.bindings.length!==plan.items.length)throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_BINDING_COUNT_INVALID');
  const expected=new Set(plan.items.map(item=>item.sourceKey)),seenSource=new Set<string>(),seenTarget=new Set<string>(),bindings:LegacyTargetIdBinding[]=[];
  for(const raw of value.bindings){
    if(!object(raw))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_TARGET_BINDING_INVALID');
    exact(raw,['sourceKey','targetId'],'LEGACY_IMPORT_TARGET_BINDING_FIELD_FORBIDDEN');
    if(typeof raw.sourceKey!=='string'||!expected.has(raw.sourceKey))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_SOURCE_KEY_UNKNOWN');
    if(seenSource.has(raw.sourceKey))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_SOURCE_KEY_DUPLICATE');
    const targetId=canonicalUuid(raw.targetId,'LEGACY_IMPORT_TARGET_ID_INVALID');
    if(seenTarget.has(targetId))throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_TARGET_ID_DUPLICATE');
    seenSource.add(raw.sourceKey);seenTarget.add(targetId);bindings.push({sourceKey:raw.sourceKey,targetId});
  }
  if(seenSource.size!==expected.size)throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_SOURCE_BINDING_MISSING');
  return {schema:LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,workspaceId,batchId,idempotencyKey:value.idempotencyKey,bindings};
}

export function buildLegacyOrderedImportExecutionManifest(snapshotValue:unknown,mappingPlanValue:unknown,bindingValue:unknown):LegacyOrderedImportExecutionManifest{
  const plan=buildLegacyOrderedImportPlan(snapshotValue,mappingPlanValue);
  const binding=parseLegacyOrderedImportBindingSpec(bindingValue,plan);
  const targetBySource=new Map(binding.bindings.map(item=>[item.sourceKey,item.targetId] as const));
  const items:LegacyBoundImportItem[]=plan.items.map(item=>{
    const targetId=targetBySource.get(item.sourceKey);
    if(!targetId)throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_SOURCE_BINDING_MISSING');
    return {ordinal:item.ordinal,stage:item.stage,sourceKey:item.sourceKey,targetTable:item.targetTable,targetId,normalizedFields:{...item.normalizedFields},writeAllowed:false};
  });
  const relationshipBindings:LegacyBoundRelationship[]=plan.relationshipBindings.map(rel=>{
    const sourceTargetId=targetBySource.get(rel.sourceKey),targetTargetId=targetBySource.get(rel.targetKey);
    if(!sourceTargetId||!targetTargetId)throw new LegacyOrderedImportBindingError('LEGACY_IMPORT_RELATION_BINDING_MISSING');
    return {sourceKey:rel.sourceKey,targetKey:rel.targetKey,targetField:rel.targetField,sourceTargetId,targetTargetId,sourceTargetTable:rel.sourceTargetTable,targetTargetTable:rel.targetTargetTable,assignmentPerformed:false,writeAllowed:false};
  });
  return {
    schema:LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA,snapshotId:plan.snapshotId,mappingPlanId:plan.mappingPlanId,
    workspaceId:binding.workspaceId,batchId:binding.batchId,idempotencyKey:binding.idempotencyKey,stageOrder:plan.stageOrder,items,relationshipBindings,
    deterministic:true,workspacePermissionVerified:false,idempotencyBound:true,idempotencyEnforcementPerformed:false,targetIdsGenerated:false,
    foreignKeyBindingPerformed:true,foreignKeyAssignmentPerformed:false,persistencePerformed:false,importExecutionAllowed:false,targetMutationPerformed:false,
    readyForA3ExecutionBoundary:true,
  };
}
