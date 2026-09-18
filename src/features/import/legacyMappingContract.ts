import { inspectLegacySnapshot, parseLegacySnapshot, type LegacyJsonValue, type LegacySnapshot } from './legacySnapshotContract.ts';

export const LEGACY_MAPPING_PLAN_SCHEMA='enjaz.legacy.mapping.plan.v1' as const;
export const LEGACY_MAPPING_PREVIEW_SCHEMA='enjaz.legacy.mapping.preview.v1' as const;

export type LegacyMappingTargetTable='companies'|'contacts'|'transactions';
export type LegacyNormalizationRule='identity_scalar'|'trim_text'|'strict_number';

export type LegacyFieldMapping={
  sourceField:string;
  targetField:string;
  normalize:LegacyNormalizationRule;
};
export type LegacyTypeMapping={
  legacyType:string;
  targetTable:LegacyMappingTargetTable;
  fieldMappings:LegacyFieldMapping[];
};
export type LegacyRelationshipTargetField='company_id'|'primary_contact_id';
export type LegacyRelationshipMapping={
  sourceLegacyType:string;
  linkKind:string;
  targetLegacyType:string;
  targetField:LegacyRelationshipTargetField;
};
export type LegacyMappingPlan={
  schema:typeof LEGACY_MAPPING_PLAN_SCHEMA;
  planId:string;
  typeMappings:LegacyTypeMapping[];
  relationshipMappings:LegacyRelationshipMapping[];
};

export type LegacyMappingPreviewRecord={
  sourceKey:string;
  legacyType:string;
  disposition:'MAPPED_PREVIEW'|'QUARANTINED_UNMAPPED_TYPE';
  targetTable:LegacyMappingTargetTable|null;
  normalizedFields:Record<string,string|number|boolean|null>|null;
  reviewRequired:boolean;
  writeAllowed:false;
};
export type LegacyRelationshipPreviewIntent={
  sourceKey:string;
  targetKey:string;
  linkKind:string;
  sourceTargetTable:LegacyMappingTargetTable;
  targetTargetTable:LegacyMappingTargetTable;
  targetField:LegacyRelationshipTargetField;
  disposition:'RESOLVED_RELATIONSHIP_PREVIEW'|'QUARANTINED_DANGLING_TARGET'|'QUARANTINED_DUPLICATE_SOURCE'|'QUARANTINED_DUPLICATE_TARGET';
  reviewRequired:boolean;
  foreignKeyAssigned:false;
  generatedTargetId:null;
  writeAllowed:false;
};
export type LegacyUnmappedRelationshipLink={sourceKey:string;kind:string;targetKey:string};
export type LegacyMappingPreview={
  schema:typeof LEGACY_MAPPING_PREVIEW_SCHEMA;
  planId:string;
  snapshotId:string;
  records:LegacyMappingPreviewRecord[];
  duplicateRecordKeys:string[];
  danglingLinks:Array<{sourceKey:string;kind:string;targetKey:string}>;
  unmappedLegacyTypes:string[];
  relationshipIntents:LegacyRelationshipPreviewIntent[];
  unmappedRelationshipLinks:LegacyUnmappedRelationshipLink[];
  readOnly:true;
  mappingPerformed:true;
  normalizationPerformed:true;
  persistencePerformed:false;
  importExecutionAllowed:false;
  targetMutationAllowed:false;
  targetAuthorityAssigned:false;
  relationshipMappingPerformed:boolean;
  foreignKeyAssignmentPerformed:false;
  idGenerationPerformed:false;
  eligibleForOrderedImport:false;
};

export class LegacyMappingContractError extends Error{
  readonly code:string;
  constructor(code:string){super(code);this.name='LegacyMappingContractError';this.code=code}
}

const TARGET_FIELDS:Readonly<Record<LegacyMappingTargetTable,readonly string[]>>=Object.freeze({
  companies:Object.freeze(['legal_name','display_name','capital','address','activities','registration_number','legal_status']),
  contacts:Object.freeze(['display_name','contact_type','phone','email','notes']),
  transactions:Object.freeze(['type','department','current_fee']),
});
const TARGET_TABLES=new Set<LegacyMappingTargetTable>(['companies','contacts','transactions']);
const RULES=new Set<LegacyNormalizationRule>(['identity_scalar','trim_text','strict_number']);
const RELATION_TARGETS=new Set([
  'transactions->companies:company_id',
  'transactions->contacts:primary_contact_id',
  'companies->contacts:primary_contact_id',
]);
const MAX_TYPE_MAPPINGS=50,MAX_FIELD_MAPPINGS=50,MAX_RELATIONSHIP_MAPPINGS=50;

const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,allowed:readonly string[],code:string)=>{const a=new Set(allowed);for(const k of Object.keys(v))if(!a.has(k))throw new LegacyMappingContractError(code)};
const text=(v:unknown,code:string,max=160)=>{if(typeof v!=='string'||!v||v!==v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw new LegacyMappingContractError(code);return v};
const scalar=(v:LegacyJsonValue):v is string|number|boolean|null=>v===null||typeof v==='string'||typeof v==='number'||typeof v==='boolean';

function normalizeValue(value:LegacyJsonValue,rule:LegacyNormalizationRule):string|number|boolean|null{
  if(rule==='identity_scalar'){
    if(!scalar(value))throw new LegacyMappingContractError('LEGACY_MAPPING_VALUE_NOT_SCALAR');
    return value;
  }
  if(rule==='trim_text'){
    if(typeof value!=='string')throw new LegacyMappingContractError('LEGACY_MAPPING_TEXT_REQUIRED');
    return value.trim();
  }
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_INVALID');
    const scaled=Math.round(value*100);
    const tolerance=Number.EPSILON*Math.max(1,Math.abs(value))*8;
    if(!Number.isSafeInteger(scaled)||Math.abs(value-scaled/100)>tolerance)throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE');
    return value;
  }
  if(typeof value!=='string'||value!==value.trim()||!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_INVALID');
  const negative=value.startsWith('-'),unsigned=negative?value.slice(1):value;
  const parts=unsigned.split('.'),whole=parts[0]??'0',fraction=(parts[1]??'').padEnd(2,'0');
  const cents=BigInt(whole)*100n+BigInt(fraction||'0');
  if(cents>BigInt(Number.MAX_SAFE_INTEGER))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE');
  const n=Number(value);
  if(!Number.isFinite(n))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_INVALID');
  return n;
}

export function parseLegacyMappingPlan(value:unknown,snapshot:LegacySnapshot):LegacyMappingPlan{
  if(!object(value))throw new LegacyMappingContractError('LEGACY_MAPPING_PLAN_INVALID');
  exact(value,['schema','planId','typeMappings','relationshipMappings'],'LEGACY_MAPPING_PLAN_FIELD_FORBIDDEN');
  if(value.schema!==LEGACY_MAPPING_PLAN_SCHEMA)throw new LegacyMappingContractError('LEGACY_MAPPING_PLAN_SCHEMA_INVALID');
  const planId=text(value.planId,'LEGACY_MAPPING_PLAN_ID_INVALID',256);
  if(!Array.isArray(value.typeMappings)||value.typeMappings.length>MAX_TYPE_MAPPINGS)throw new LegacyMappingContractError('LEGACY_MAPPING_TYPES_INVALID');
  const observed=new Set(snapshot.records.map(r=>r.type)),seenTypes=new Set<string>(),typeMappings:LegacyTypeMapping[]=[];
  for(const raw of value.typeMappings){
    if(!object(raw))throw new LegacyMappingContractError('LEGACY_MAPPING_TYPE_INVALID');
    exact(raw,['legacyType','targetTable','fieldMappings'],'LEGACY_MAPPING_TYPE_FIELD_FORBIDDEN');
    const legacyType=text(raw.legacyType,'LEGACY_MAPPING_LEGACY_TYPE_INVALID',120);
    if(seenTypes.has(legacyType))throw new LegacyMappingContractError('LEGACY_MAPPING_LEGACY_TYPE_DUPLICATE');
    if(!observed.has(legacyType))throw new LegacyMappingContractError('LEGACY_MAPPING_LEGACY_TYPE_NOT_OBSERVED');
    seenTypes.add(legacyType);
    if(typeof raw.targetTable!=='string'||!TARGET_TABLES.has(raw.targetTable as LegacyMappingTargetTable))throw new LegacyMappingContractError('LEGACY_MAPPING_TARGET_TABLE_FORBIDDEN');
    const targetTable=raw.targetTable as LegacyMappingTargetTable;
    if(!Array.isArray(raw.fieldMappings)||raw.fieldMappings.length===0||raw.fieldMappings.length>MAX_FIELD_MAPPINGS)throw new LegacyMappingContractError('LEGACY_MAPPING_FIELDS_INVALID');
    const seenSource=new Set<string>(),seenTarget=new Set<string>(),fieldMappings:LegacyFieldMapping[]=[];
    for(const item of raw.fieldMappings){
      if(!object(item))throw new LegacyMappingContractError('LEGACY_MAPPING_FIELD_INVALID');
      exact(item,['sourceField','targetField','normalize'],'LEGACY_MAPPING_FIELD_CONTROL_FORBIDDEN');
      const sourceField=text(item.sourceField,'LEGACY_MAPPING_SOURCE_FIELD_INVALID',256);
      const targetField=text(item.targetField,'LEGACY_MAPPING_TARGET_FIELD_INVALID',128);
      if(seenSource.has(sourceField))throw new LegacyMappingContractError('LEGACY_MAPPING_SOURCE_FIELD_DUPLICATE');
      if(seenTarget.has(targetField))throw new LegacyMappingContractError('LEGACY_MAPPING_TARGET_FIELD_DUPLICATE');
      if(!TARGET_FIELDS[targetTable].includes(targetField))throw new LegacyMappingContractError('LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN');
      if(typeof item.normalize!=='string'||!RULES.has(item.normalize as LegacyNormalizationRule))throw new LegacyMappingContractError('LEGACY_MAPPING_RULE_INVALID');
      seenSource.add(sourceField);seenTarget.add(targetField);
      fieldMappings.push({sourceField,targetField,normalize:item.normalize as LegacyNormalizationRule});
    }
    typeMappings.push({legacyType,targetTable,fieldMappings});
  }
  const relationshipMappings:LegacyRelationshipMapping[]=[];
  const rawRelationships=value.relationshipMappings??[];
  if(!Array.isArray(rawRelationships)||rawRelationships.length>MAX_RELATIONSHIP_MAPPINGS)throw new LegacyMappingContractError('LEGACY_RELATION_MAPPINGS_INVALID');
  const typeByLegacy=new Map(typeMappings.map(item=>[item.legacyType,item] as const)),seenRelations=new Set<string>();
  for(const raw of rawRelationships){
    if(!object(raw))throw new LegacyMappingContractError('LEGACY_RELATION_MAPPING_INVALID');
    exact(raw,['sourceLegacyType','linkKind','targetLegacyType','targetField'],'LEGACY_RELATION_MAPPING_FIELD_FORBIDDEN');
    const sourceLegacyType=text(raw.sourceLegacyType,'LEGACY_RELATION_SOURCE_TYPE_INVALID',120);
    const linkKind=text(raw.linkKind,'LEGACY_RELATION_KIND_INVALID',120);
    const targetLegacyType=text(raw.targetLegacyType,'LEGACY_RELATION_TARGET_TYPE_INVALID',120);
    const targetField=text(raw.targetField,'LEGACY_RELATION_TARGET_FIELD_INVALID',128) as LegacyRelationshipTargetField;
    if(!observed.has(sourceLegacyType)||!observed.has(targetLegacyType))throw new LegacyMappingContractError('LEGACY_RELATION_TYPE_NOT_OBSERVED');
    const sourceMapping=typeByLegacy.get(sourceLegacyType),targetMapping=typeByLegacy.get(targetLegacyType);
    if(!sourceMapping||!targetMapping)throw new LegacyMappingContractError('LEGACY_RELATION_TYPE_MAPPING_REQUIRED');
    const authorityKey=sourceMapping.targetTable+'->'+targetMapping.targetTable+':'+targetField;
    if(!RELATION_TARGETS.has(authorityKey))throw new LegacyMappingContractError('LEGACY_RELATION_TARGET_FIELD_FORBIDDEN');
    const relationKey=sourceLegacyType+'|'+linkKind+'|'+targetLegacyType;
    if(seenRelations.has(relationKey))throw new LegacyMappingContractError('LEGACY_RELATION_MAPPING_DUPLICATE');
    seenRelations.add(relationKey);
    relationshipMappings.push({sourceLegacyType,linkKind,targetLegacyType,targetField});
  }
  return {schema:LEGACY_MAPPING_PLAN_SCHEMA,planId,typeMappings,relationshipMappings};
}

export function buildLegacyMappingPreview(snapshotValue:unknown,planValue:unknown):LegacyMappingPreview{
  const snapshot=parseLegacySnapshot(snapshotValue);
  const plan=parseLegacyMappingPlan(planValue,snapshot);
  const inventory=inspectLegacySnapshot(snapshot),byType=new Map(plan.typeMappings.map(m=>[m.legacyType,m] as const));
  const duplicateSet=new Set(inventory.duplicateRecordKeys);
  const danglingSources=new Set(inventory.danglingLinks.map(x=>x.sourceKey));
  const recordCounts=new Map<string,number>();
  for(const record of snapshot.records){const key=record.type+':'+record.id;recordCounts.set(key,(recordCounts.get(key)??0)+1)}
  const relationshipByKey=new Map(plan.relationshipMappings.map(m=>[m.sourceLegacyType+'|'+m.linkKind+'|'+m.targetLegacyType,m] as const));
  const relationshipIntents:LegacyRelationshipPreviewIntent[]=[];
  const unmappedRelationshipLinks:LegacyUnmappedRelationshipLink[]=[];
  const relationshipReviewSources=new Set<string>();
  for(const record of snapshot.records){
    const sourceKey=record.type+':'+record.id,sourceMapping=byType.get(record.type);
    for(const link of record.links){
      const targetKey=link.targetType+':'+link.targetId,relation=relationshipByKey.get(record.type+'|'+link.kind+'|'+link.targetType);
      if(!relation){unmappedRelationshipLinks.push({sourceKey,kind:link.kind,targetKey});relationshipReviewSources.add(sourceKey);continue}
      const targetMapping=byType.get(link.targetType);
      if(!sourceMapping||!targetMapping)throw new LegacyMappingContractError('LEGACY_RELATION_TYPE_MAPPING_REQUIRED');
      let disposition:LegacyRelationshipPreviewIntent['disposition']='RESOLVED_RELATIONSHIP_PREVIEW';
      if((recordCounts.get(sourceKey)??0)>1)disposition='QUARANTINED_DUPLICATE_SOURCE';
      else if((recordCounts.get(targetKey)??0)===0)disposition='QUARANTINED_DANGLING_TARGET';
      else if((recordCounts.get(targetKey)??0)>1)disposition='QUARANTINED_DUPLICATE_TARGET';
      const reviewRequired=disposition!=='RESOLVED_RELATIONSHIP_PREVIEW';
      if(reviewRequired)relationshipReviewSources.add(sourceKey);
      relationshipIntents.push({
        sourceKey,targetKey,linkKind:link.kind,sourceTargetTable:sourceMapping.targetTable,targetTargetTable:targetMapping.targetTable,
        targetField:relation.targetField,disposition,reviewRequired,foreignKeyAssigned:false,generatedTargetId:null,writeAllowed:false,
      });
    }
  }
  relationshipIntents.sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey)||a.linkKind.localeCompare(b.linkKind)||a.targetKey.localeCompare(b.targetKey));
  unmappedRelationshipLinks.sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey)||a.kind.localeCompare(b.kind)||a.targetKey.localeCompare(b.targetKey));
  const unmapped=new Set<string>();
  const records:LegacyMappingPreviewRecord[]=snapshot.records.map(record=>{
    const sourceKey=`${record.type}:${record.id}`,mapping=byType.get(record.type);
    if(!mapping){unmapped.add(record.type);return {sourceKey,legacyType:record.type,disposition:'QUARANTINED_UNMAPPED_TYPE',targetTable:null,normalizedFields:null,reviewRequired:true,writeAllowed:false}}
    const normalizedFields:Record<string,string|number|boolean|null>={};
    for(const field of mapping.fieldMappings){
      if(!(field.sourceField in record.fields))throw new LegacyMappingContractError('LEGACY_MAPPING_SOURCE_FIELD_MISSING');
      normalizedFields[field.targetField]=normalizeValue(record.fields[field.sourceField]!,field.normalize);
    }
    return {sourceKey,legacyType:record.type,disposition:'MAPPED_PREVIEW',targetTable:mapping.targetTable,normalizedFields,reviewRequired:duplicateSet.has(sourceKey)||danglingSources.has(sourceKey)||relationshipReviewSources.has(sourceKey),writeAllowed:false};
  });
  return {
    schema:LEGACY_MAPPING_PREVIEW_SCHEMA,planId:plan.planId,snapshotId:snapshot.snapshotId,records,
    duplicateRecordKeys:[...inventory.duplicateRecordKeys],danglingLinks:inventory.danglingLinks.map(x=>({...x})),
    unmappedLegacyTypes:[...unmapped].sort((a,b)=>a.localeCompare(b,'en')),
    relationshipIntents,unmappedRelationshipLinks,
    readOnly:true,mappingPerformed:true,normalizationPerformed:true,persistencePerformed:false,importExecutionAllowed:false,
    targetMutationAllowed:false,targetAuthorityAssigned:false,relationshipMappingPerformed:plan.relationshipMappings.length>0,
    foreignKeyAssignmentPerformed:false,idGenerationPerformed:false,eligibleForOrderedImport:false,
  };
}
