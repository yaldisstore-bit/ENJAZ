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
export type LegacyMappingPlan={
  schema:typeof LEGACY_MAPPING_PLAN_SCHEMA;
  planId:string;
  typeMappings:LegacyTypeMapping[];
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
export type LegacyMappingPreview={
  schema:typeof LEGACY_MAPPING_PREVIEW_SCHEMA;
  planId:string;
  snapshotId:string;
  records:LegacyMappingPreviewRecord[];
  duplicateRecordKeys:string[];
  danglingLinks:Array<{sourceKey:string;kind:string;targetKey:string}>;
  unmappedLegacyTypes:string[];
  readOnly:true;
  mappingPerformed:true;
  normalizationPerformed:true;
  persistencePerformed:false;
  importExecutionAllowed:false;
  targetMutationAllowed:false;
  targetAuthorityAssigned:false;
  relationshipMappingPerformed:false;
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
const MAX_TYPE_MAPPINGS=50,MAX_FIELD_MAPPINGS=50;

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
    return value;
  }
  if(typeof value!=='string'||value!==value.trim()||!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_INVALID');
  const n=Number(value);
  if(!Number.isFinite(n))throw new LegacyMappingContractError('LEGACY_MAPPING_NUMBER_INVALID');
  return n;
}

export function parseLegacyMappingPlan(value:unknown,snapshot:LegacySnapshot):LegacyMappingPlan{
  if(!object(value))throw new LegacyMappingContractError('LEGACY_MAPPING_PLAN_INVALID');
  exact(value,['schema','planId','typeMappings'],'LEGACY_MAPPING_PLAN_FIELD_FORBIDDEN');
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
  return {schema:LEGACY_MAPPING_PLAN_SCHEMA,planId,typeMappings};
}

export function buildLegacyMappingPreview(snapshotValue:unknown,planValue:unknown):LegacyMappingPreview{
  const snapshot=parseLegacySnapshot(snapshotValue);
  const plan=parseLegacyMappingPlan(planValue,snapshot);
  const inventory=inspectLegacySnapshot(snapshot),byType=new Map(plan.typeMappings.map(m=>[m.legacyType,m] as const));
  const duplicateSet=new Set(inventory.duplicateRecordKeys);
  const danglingSources=new Set(inventory.danglingLinks.map(x=>x.sourceKey));
  const unmapped=new Set<string>();
  const records:LegacyMappingPreviewRecord[]=snapshot.records.map(record=>{
    const sourceKey=`${record.type}:${record.id}`,mapping=byType.get(record.type);
    if(!mapping){unmapped.add(record.type);return {sourceKey,legacyType:record.type,disposition:'QUARANTINED_UNMAPPED_TYPE',targetTable:null,normalizedFields:null,reviewRequired:true,writeAllowed:false}}
    const normalizedFields:Record<string,string|number|boolean|null>={};
    for(const field of mapping.fieldMappings){
      if(!(field.sourceField in record.fields))throw new LegacyMappingContractError('LEGACY_MAPPING_SOURCE_FIELD_MISSING');
      normalizedFields[field.targetField]=normalizeValue(record.fields[field.sourceField]!,field.normalize);
    }
    return {sourceKey,legacyType:record.type,disposition:'MAPPED_PREVIEW',targetTable:mapping.targetTable,normalizedFields,reviewRequired:duplicateSet.has(sourceKey)||danglingSources.has(sourceKey),writeAllowed:false};
  });
  return {
    schema:LEGACY_MAPPING_PREVIEW_SCHEMA,planId:plan.planId,snapshotId:snapshot.snapshotId,records,
    duplicateRecordKeys:[...inventory.duplicateRecordKeys],danglingLinks:inventory.danglingLinks.map(x=>({...x})),
    unmappedLegacyTypes:[...unmapped].sort((a,b)=>a.localeCompare(b,'en')),
    readOnly:true,mappingPerformed:true,normalizationPerformed:true,persistencePerformed:false,importExecutionAllowed:false,
    targetMutationAllowed:false,targetAuthorityAssigned:false,relationshipMappingPerformed:false,eligibleForOrderedImport:false,
  };
}
