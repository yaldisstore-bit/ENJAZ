import { LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA, type LegacyOrderedImportExecutionManifest, type LegacyOrderedImportStageTable } from './legacyOrderedImportBinding.ts';

export const LEGACY_ORDERED_IMPORT_EXECUTION_REQUEST_SCHEMA='enjaz.legacy.ordered-import.execute-request.v1' as const;
export const LEGACY_ORDERED_IMPORT_RPC_ENVELOPE_SCHEMA='enjaz.legacy.ordered-import.rpc-envelope.v1' as const;

export type LegacyOrderedImportRpcEnvelope={
  schema:typeof LEGACY_ORDERED_IMPORT_RPC_ENVELOPE_SCHEMA;
  functionName:'execute_legacy_ordered_import_v1';
  workspaceId:string;
  batchId:string;
  idempotencyKey:string;
  manifest:LegacyOrderedImportExecutionManifest;
  callerJwtRequired:true;
  workspacePermissionVerified:false;
  serverIdempotencyEnforced:false;
  writeExecuted:false;
  eligibleForA3DatabaseBoundary:true;
};

export class LegacyOrderedImportExecutionError extends Error{
  readonly code:string;
  constructor(code:string){super(code);this.name='LegacyOrderedImportExecutionError';this.code=code}
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IDEMPOTENCY=/^[A-Za-z0-9:_-]{8,128}$/;
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,allowed:readonly string[],code:string)=>{const set=new Set(allowed);for(const key of Object.keys(value))if(!set.has(key))throw new LegacyOrderedImportExecutionError(code)};
const text=(value:unknown,code:string,max=512)=>{if(typeof value!=='string'||value.length<1||value.length>max)throw new LegacyOrderedImportExecutionError(code);return value};
const uuid=(value:unknown,code:string)=>{if(typeof value!=='string'||!UUID.test(value))throw new LegacyOrderedImportExecutionError(code);return value};
const bool=(value:unknown,expected:boolean,code:string)=>{if(value!==expected)throw new LegacyOrderedImportExecutionError(code);return expected};
const STAGE:Readonly<Record<LegacyOrderedImportStageTable,number>>=Object.freeze({contacts:1,companies:2,transactions:3});
const TARGET_FIELDS:Readonly<Record<LegacyOrderedImportStageTable,readonly string[]>>=Object.freeze({
  contacts:Object.freeze(['display_name','contact_type','phone','email','notes']),
  companies:Object.freeze(['legal_name','display_name','capital','address','activities','registration_number','legal_status']),
  transactions:Object.freeze(['type','department','current_fee']),
});
const RELATION_AUTHORITY=new Set([
  'companies->contacts:primary_contact_id',
  'transactions->companies:company_id',
  'transactions->contacts:primary_contact_id',
]);

function scalar(value:unknown):string|number|boolean|null{
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isFinite(value)){
    const cents=Math.round(value*100);
    if(Number.isSafeInteger(cents)&&Math.abs(value*100-cents)<1e-7)return value;
  }
  throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_FIELD_VALUE_INVALID');
}

export function parseLegacyOrderedImportExecutionManifest(value:unknown):LegacyOrderedImportExecutionManifest{
  if(!object(value))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_MANIFEST_INVALID');
  exact(value,[
    'schema','snapshotId','mappingPlanId','workspaceId','batchId','idempotencyKey','stageOrder','items','relationshipBindings',
    'deterministic','workspacePermissionVerified','idempotencyBound','idempotencyEnforcementPerformed','targetIdsGenerated',
    'foreignKeyBindingPerformed','foreignKeyAssignmentPerformed','persistencePerformed','importExecutionAllowed',
    'targetMutationPerformed','readyForA3ExecutionBoundary'
  ],'LEGACY_IMPORT_EXECUTION_MANIFEST_FIELD_FORBIDDEN');
  if(value.schema!==LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_MANIFEST_SCHEMA_INVALID');
  const snapshotId=text(value.snapshotId,'LEGACY_IMPORT_EXECUTION_SNAPSHOT_ID_INVALID',256);
  const mappingPlanId=text(value.mappingPlanId,'LEGACY_IMPORT_EXECUTION_MAPPING_PLAN_ID_INVALID',256);
  const workspaceId=uuid(value.workspaceId,'LEGACY_IMPORT_EXECUTION_WORKSPACE_ID_INVALID');
  const batchId=uuid(value.batchId,'LEGACY_IMPORT_EXECUTION_BATCH_ID_INVALID');
  if(typeof value.idempotencyKey!=='string'||!IDEMPOTENCY.test(value.idempotencyKey))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_IDEMPOTENCY_KEY_INVALID');
  if(!Array.isArray(value.stageOrder)||value.stageOrder.join(',')!=='contacts,companies,transactions')throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_STAGE_ORDER_INVALID');

  bool(value.deterministic,true,'LEGACY_IMPORT_EXECUTION_NONDETERMINISTIC');
  bool(value.workspacePermissionVerified,false,'LEGACY_IMPORT_EXECUTION_PERMISSION_PRECLAIM_FORBIDDEN');
  bool(value.idempotencyBound,true,'LEGACY_IMPORT_EXECUTION_IDEMPOTENCY_BINDING_REQUIRED');
  bool(value.idempotencyEnforcementPerformed,false,'LEGACY_IMPORT_EXECUTION_IDEMPOTENCY_PRECLAIM_FORBIDDEN');
  bool(value.targetIdsGenerated,false,'LEGACY_IMPORT_EXECUTION_GENERATED_IDS_FORBIDDEN');
  bool(value.foreignKeyBindingPerformed,true,'LEGACY_IMPORT_EXECUTION_RELATION_BINDING_REQUIRED');
  bool(value.foreignKeyAssignmentPerformed,false,'LEGACY_IMPORT_EXECUTION_FK_PREASSIGN_FORBIDDEN');
  bool(value.persistencePerformed,false,'LEGACY_IMPORT_EXECUTION_PERSISTENCE_PRECLAIM_FORBIDDEN');
  bool(value.importExecutionAllowed,false,'LEGACY_IMPORT_EXECUTION_CLIENT_AUTHORITY_FORBIDDEN');
  bool(value.targetMutationPerformed,false,'LEGACY_IMPORT_EXECUTION_TARGET_MUTATION_PRECLAIM_FORBIDDEN');
  bool(value.readyForA3ExecutionBoundary,true,'LEGACY_IMPORT_EXECUTION_A3_READINESS_REQUIRED');

  if(!Array.isArray(value.items)||value.items.length<1||value.items.length>5000)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_ITEMS_INVALID');
  const sourceKeys=new Set<string>(),targetIds=new Set<string>();
  const items=value.items.map((raw,index)=>{
    if(!object(raw))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_ITEM_INVALID');
    exact(raw,['ordinal','stage','sourceKey','targetTable','targetId','normalizedFields','writeAllowed'],'LEGACY_IMPORT_EXECUTION_ITEM_FIELD_FORBIDDEN');
    if(raw.ordinal!==index+1)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_ORDINAL_INVALID');
    if(raw.targetTable!=='contacts'&&raw.targetTable!=='companies'&&raw.targetTable!=='transactions')throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_TARGET_TABLE_INVALID');
    const targetTable=raw.targetTable as LegacyOrderedImportStageTable;
    if(raw.stage!==STAGE[targetTable])throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_STAGE_INVALID');
    const sourceKey=text(raw.sourceKey,'LEGACY_IMPORT_EXECUTION_SOURCE_KEY_INVALID');
    const targetId=uuid(raw.targetId,'LEGACY_IMPORT_EXECUTION_TARGET_ID_INVALID');
    if(sourceKeys.has(sourceKey))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_SOURCE_KEY_DUPLICATE');
    if(targetIds.has(targetId))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_TARGET_ID_DUPLICATE');
    sourceKeys.add(sourceKey);targetIds.add(targetId);
    if(raw.writeAllowed!==false)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_ITEM_WRITE_AUTHORITY_FORBIDDEN');
    if(!object(raw.normalizedFields))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_NORMALIZED_FIELDS_INVALID');
    const normalizedFields:Record<string,string|number|boolean|null>={};
    for(const [key,val] of Object.entries(raw.normalizedFields)){
      if(!TARGET_FIELDS[targetTable].includes(key))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_TARGET_FIELD_FORBIDDEN');
      normalizedFields[key]=scalar(val);
    }
    if(Object.keys(normalizedFields).length<1)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_NORMALIZED_FIELDS_EMPTY');
    if(index>0){
      const prev=value.items[index-1] as Record<string,unknown>;
      const ps=Number(prev.stage);
      if(ps>Number(raw.stage)||(ps===Number(raw.stage)&&String(prev.sourceKey).localeCompare(sourceKey,'en')>0))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_ITEM_ORDER_INVALID');
    }
    return {ordinal:index+1,stage:STAGE[targetTable],sourceKey,targetTable,targetId,normalizedFields,writeAllowed:false as const};
  });

  if(!Array.isArray(value.relationshipBindings)||value.relationshipBindings.length>10000)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATIONSHIPS_INVALID');
  const itemBySource=new Map(items.map(item=>[item.sourceKey,item] as const)),relationKeys=new Set<string>();
  const relationshipBindings=value.relationshipBindings.map((raw,index)=>{
    if(!object(raw))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_INVALID');
    exact(raw,['sourceKey','targetKey','targetField','sourceTargetId','targetTargetId','sourceTargetTable','targetTargetTable','assignmentPerformed','writeAllowed'],'LEGACY_IMPORT_EXECUTION_RELATION_FIELD_FORBIDDEN');
    const sourceKey=text(raw.sourceKey,'LEGACY_IMPORT_EXECUTION_RELATION_SOURCE_INVALID'),targetKey=text(raw.targetKey,'LEGACY_IMPORT_EXECUTION_RELATION_TARGET_INVALID');
    const source=itemBySource.get(sourceKey),target=itemBySource.get(targetKey);
    if(!source||!target)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_ENDPOINT_MISSING');
    if(raw.sourceTargetTable!==source.targetTable||raw.targetTargetTable!==target.targetTable)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_TABLE_DRIFT');
    if(raw.sourceTargetId!==source.targetId||raw.targetTargetId!==target.targetId)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_ID_DRIFT');
    if(raw.targetField!=='company_id'&&raw.targetField!=='primary_contact_id')throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_FIELD_INVALID');
    const authority=source.targetTable+'->'+target.targetTable+':'+raw.targetField;
    if(!RELATION_AUTHORITY.has(authority))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_AUTHORITY_INVALID');
    if(target.stage>=source.stage)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_ORDER_INVALID');
    if(raw.assignmentPerformed!==false||raw.writeAllowed!==false)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_WRITE_PRECLAIM_FORBIDDEN');
    const relationKey=sourceKey+'|'+raw.targetField+'|'+targetKey;
    if(relationKeys.has(relationKey))throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_DUPLICATE');
    relationKeys.add(relationKey);
    if(index>0){
      const prev=value.relationshipBindings[index-1] as Record<string,unknown>;
      const pk=String(prev.sourceKey)+'|'+String(prev.targetField)+'|'+String(prev.targetKey);
      if(pk.localeCompare(relationKey,'en')>0)throw new LegacyOrderedImportExecutionError('LEGACY_IMPORT_EXECUTION_RELATION_SORT_INVALID');
    }
    return {sourceKey,targetKey,targetField:raw.targetField,sourceTargetId:source.targetId,targetTargetId:target.targetId,sourceTargetTable:source.targetTable,targetTargetTable:target.targetTable,assignmentPerformed:false as const,writeAllowed:false as const};
  });

  return {
    schema:LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA,snapshotId,mappingPlanId,workspaceId,batchId,idempotencyKey:value.idempotencyKey,
    stageOrder:['contacts','companies','transactions'],items,relationshipBindings,deterministic:true,workspacePermissionVerified:false,
    idempotencyBound:true,idempotencyEnforcementPerformed:false,targetIdsGenerated:false,foreignKeyBindingPerformed:true,
    foreignKeyAssignmentPerformed:false,persistencePerformed:false,importExecutionAllowed:false,targetMutationPerformed:false,readyForA3ExecutionBoundary:true,
  };
}

export function prepareLegacyOrderedImportRpcEnvelope(manifestValue:unknown):LegacyOrderedImportRpcEnvelope{
  const manifest=parseLegacyOrderedImportExecutionManifest(manifestValue);
  return {
    schema:LEGACY_ORDERED_IMPORT_RPC_ENVELOPE_SCHEMA,
    functionName:'execute_legacy_ordered_import_v1',
    workspaceId:manifest.workspaceId,
    batchId:manifest.batchId,
    idempotencyKey:manifest.idempotencyKey,
    manifest,
    callerJwtRequired:true,
    workspacePermissionVerified:false,
    serverIdempotencyEnforced:false,
    writeExecuted:false,
    eligibleForA3DatabaseBoundary:true,
  };
}
