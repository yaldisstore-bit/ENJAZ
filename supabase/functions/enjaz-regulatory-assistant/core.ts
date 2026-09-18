export const REGULATORY_ASSISTANCE_SCHEMA='enjaz.regulatory.assistance.v1' as const;
export const REGULATORY_ASSISTANCE_OPERATIONS=['answer'] as const;
export type RegulatoryAssistanceOperation=typeof REGULATORY_ASSISTANCE_OPERATIONS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SHA256=/^[a-f0-9]{64}$/;
const ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','query','asOf','limit']);
const KINDS=new Set(['law','regulation','instruction','circular','official_notice','procedure']);
const SCOPES=new Set(['official_global','workspace_curated']);

export type RegulatoryAssistanceRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:'answer';
  query:string;
  asOf:string;
  limit:number;
}>;

export type RegulatoryCitation=Readonly<{
  citationId:string;
  sourceId:string;
  versionId:string;
  sourceHash:string;
  sourceUrl:string;
  retrievedOn:string;
  label:string;
  authoritative:true;
}>;

export type RegulatoryOfficialTextEvidence=Readonly<{
  sourceId:string;
  versionId:string;
  officialText:string;
  authoritative:true;
}>;

export type RegulatoryStructuredFacts=Readonly<{
  sourceId:string;
  versionId:string;
  scope:'official_global'|'workspace_curated';
  kind:'law'|'regulation'|'instruction'|'circular'|'official_notice'|'procedure';
  jurisdiction:string;
  issuer:string;
  referenceCode:string;
  titleAr:string;
  publicationDate:string;
  effectiveFrom:string;
  effectiveTo:string|null;
  sourceLocator:string;
  publisher:string;
  sourceUrl:string;
  retrievedOn:string;
  sourceHash:string;
  authoritative:true;
}>;

type ParsedEvidence=Readonly<{
  workspaceId:string;
  asOf:string;
  facts:RegulatoryStructuredFacts;
  officialText:string;
}>;

export type RegulatoryAssistanceResult=Readonly<{
  answer:string;
  officialSourceText:readonly RegulatoryOfficialTextEvidence[];
  structuredFacts:readonly RegulatoryStructuredFacts[];
  interpretation:Readonly<{
    body:string;
    authoritative:false;
    mode:'deterministic_regulatory_grounding_v1';
  }>;
  citations:readonly RegulatoryCitation[];
  grounding:Readonly<{
    authoritativeContextFound:boolean;
    sourceCount:number;
    exactVersionBinding:true;
    sourceHashBinding:true;
    asOf:string;
    providerUsed:false;
    aiOutputAuthoritative:false;
    editorialOutputAuthoritative:false;
    missingAuthorityBehavior:'fail_closed_no_fabrication';
    ambiguousAsOfBehavior:'fail_closed';
  }>;
}>;

function normalizeText(value:unknown,max:number,label:string){
  if(typeof value!=='string')throw new Error(label+'_INVALID');
  const normalized=value.normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!normalized||normalized.length>max)throw new Error(label+'_INVALID');
  return normalized;
}
function isoDate(value:unknown,label:string){
  if(typeof value!=='string'||!DATE.test(value))throw new Error(label+'_INVALID');
  const [yearText,monthText,dayText]=value.split('-');
  if(!yearText||!monthText||!dayText)throw new Error(label+'_INVALID');
  const year=Number(yearText),month=Number(monthText),day=Number(dayText);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error(label+'_INVALID');
  return value;
}
function httpsUrl(value:unknown,label:string){
  const raw=normalizeText(value,2048,label);
  let url:URL;try{url=new URL(raw)}catch{throw new Error(label+'_INVALID')}
  if(url.protocol!=='https:'||!url.hostname)throw new Error(label+'_INVALID');
  url.hash='';return url.toString();
}
function nullableDate(value:unknown,label:string){return value===null?null:isoDate(value,label)}
function record(value:unknown,label:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(label+'_INVALID');
  return value as Record<string,unknown>;
}

export function parseRegulatoryAssistanceRequest(value:unknown):RegulatoryAssistanceRequest{
  const row=record(value,'REQUEST');
  for(const key of Object.keys(row))if(!ALLOWED_KEYS.has(key))throw new Error('REQUEST_FIELD_FORBIDDEN');
  if(typeof row.workspaceId!=='string'||!UUID.test(row.workspaceId))throw new Error('WORKSPACE_ID_INVALID');
  if(typeof row.requestId!=='string'||!UUID.test(row.requestId))throw new Error('REQUEST_ID_INVALID');
  if(row.operation!=='answer')throw new Error('OPERATION_FORBIDDEN');
  const query=normalizeText(row.query,240,'QUERY');
  if(query.length<2)throw new Error('QUERY_INVALID');
  const asOf=isoDate(row.asOf,'AS_OF');
  const limit=row.limit===undefined?4:Number(row.limit);
  if(!Number.isSafeInteger(limit)||limit<1||limit>8)throw new Error('LIMIT_INVALID');
  return Object.freeze({workspaceId:row.workspaceId,requestId:row.requestId,operation:'answer',query,asOf,limit});
}

export async function regulatoryAssistancePayloadHash(req:RegulatoryAssistanceRequest){
  const bytes=new TextEncoder().encode(JSON.stringify({workspaceId:req.workspaceId,operation:req.operation,query:req.query,asOf:req.asOf,limit:req.limit}));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function parseRegulatoryEntryEvidence(value:unknown):ParsedEvidence|null{
  const root=record(value,'REGULATORY_ENTRY');
  if(root.schema!=='enjaz.regulatory-knowledge.entry.v1')throw new Error('REGULATORY_ENTRY_SCHEMA_INVALID');
  if(typeof root.workspaceId!=='string'||!UUID.test(root.workspaceId))throw new Error('REGULATORY_ENTRY_WORKSPACE_INVALID');
  const asOf=isoDate(root.asOf,'REGULATORY_ENTRY_AS_OF');
  if(root.configured===false){
    if(root.official!==null)throw new Error('REGULATORY_UNCONFIGURED_OFFICIAL_FORBIDDEN');
    return null;
  }
  if(root.configured!==true)throw new Error('REGULATORY_ENTRY_CONFIGURED_INVALID');
  const sourceId=normalizeText(root.sourceId,128,'SOURCE_ID');
  if(!UUID.test(sourceId))throw new Error('SOURCE_ID_INVALID');
  const official=record(root.official,'REGULATORY_OFFICIAL');
  if(official.authoritative!==true)throw new Error('REGULATORY_OFFICIAL_AUTHORITY_INVALID');
  if(!SCOPES.has(String(official.scope)))throw new Error('REGULATORY_SCOPE_INVALID');
  if(!KINDS.has(String(official.kind)))throw new Error('REGULATORY_KIND_INVALID');
  const versionId=normalizeText(official.versionId,128,'VERSION_ID');
  if(!UUID.test(versionId))throw new Error('VERSION_ID_INVALID');
  const sourceHash=normalizeText(official.sourceHash,64,'SOURCE_HASH').toLowerCase();
  if(!SHA256.test(sourceHash))throw new Error('SOURCE_HASH_INVALID');
  const officialText=normalizeText(official.officialText,100000,'OFFICIAL_TEXT');
  const facts=Object.freeze({
    sourceId,versionId,
    scope:official.scope as RegulatoryStructuredFacts['scope'],
    kind:official.kind as RegulatoryStructuredFacts['kind'],
    jurisdiction:normalizeText(official.jurisdiction,320,'JURISDICTION'),
    issuer:normalizeText(official.issuer,320,'ISSUER'),
    referenceCode:normalizeText(official.referenceCode,320,'REFERENCE_CODE'),
    titleAr:normalizeText(official.titleAr,320,'TITLE'),
    publicationDate:isoDate(official.publicationDate,'PUBLICATION_DATE'),
    effectiveFrom:isoDate(official.effectiveFrom,'EFFECTIVE_FROM'),
    effectiveTo:nullableDate(official.effectiveTo,'EFFECTIVE_TO'),
    sourceLocator:normalizeText(official.sourceLocator,1000,'SOURCE_LOCATOR'),
    publisher:normalizeText(official.publisher,320,'PUBLISHER'),
    sourceUrl:httpsUrl(official.sourceUrl,'SOURCE_URL'),
    retrievedOn:isoDate(official.retrievedOn,'RETRIEVED_ON'),
    sourceHash,authoritative:true as const,
  });
  return Object.freeze({workspaceId:root.workspaceId,asOf,facts,officialText});
}

function compactOfficialText(text:string,max=460){
  const clean=text.normalize('NFKC').replace(/\s+/g,' ').trim();
  return clean.length<=max?clean:clean.slice(0,max-1)+'…';
}

export function buildRegulatoryAssistanceResult(req:RegulatoryAssistanceRequest,entries:readonly unknown[]):RegulatoryAssistanceResult{
  const parsed=entries.map(parseRegulatoryEntryEvidence).filter((x):x is ParsedEvidence=>x!==null);
  const bySource=new Map<string,string>();
  const deduped:ParsedEvidence[]=[];
  const seenVersion=new Set<string>();
  for(const item of parsed){
    if(item.workspaceId!==req.workspaceId)throw new Error('REGULATORY_WORKSPACE_MISMATCH');
    if(item.asOf!==req.asOf)throw new Error('REGULATORY_ASOF_MISMATCH');
    const prior=bySource.get(item.facts.sourceId);
    if(prior&&prior!==item.facts.versionId)throw new Error('REGULATORY_ASOF_AMBIGUOUS');
    bySource.set(item.facts.sourceId,item.facts.versionId);
    const key=item.facts.sourceId+'|'+item.facts.versionId;
    if(!seenVersion.has(key)){seenVersion.add(key);deduped.push(item)}
  }
  const bounded=deduped.slice(0,req.limit);
  const structuredFacts=Object.freeze(bounded.map(x=>x.facts));
  const officialSourceText=Object.freeze(bounded.map(x=>Object.freeze({sourceId:x.facts.sourceId,versionId:x.facts.versionId,officialText:x.officialText,authoritative:true as const})));
  const citations=Object.freeze(bounded.map((x,index)=>Object.freeze({
    citationId:'R'+(index+1),sourceId:x.facts.sourceId,versionId:x.facts.versionId,sourceHash:x.facts.sourceHash,
    sourceUrl:x.facts.sourceUrl,retrievedOn:x.facts.retrievedOn,
    label:`${x.facts.issuer} — ${x.facts.referenceCode} — ${x.facts.titleAr} — نافذ من ${x.facts.effectiveFrom}`,
    authoritative:true as const,
  })));
  let answer:string;
  if(!bounded.length){
    answer='لا توجد مادة تنظيمية موثوقة ونافذة في التاريخ المحدد تكفي للإجابة. لن أنشئ تفسيرًا بديلًا عن المصدر الرسمي المفقود.';
  }else{
    const summaries=bounded.map((x,index)=>`[R${index+1}] ${x.facts.titleAr}: ${compactOfficialText(x.officialText)}`);
    answer=`تفسير غير ملزم مبني حصراً على ${bounded.length} مصدر تنظيمي موثوق كما في ${req.asOf}: ${summaries.join(' | ')}`;
  }
  return Object.freeze({
    answer,officialSourceText,structuredFacts,
    interpretation:Object.freeze({body:answer,authoritative:false as const,mode:'deterministic_regulatory_grounding_v1' as const}),
    citations,
    grounding:Object.freeze({
      authoritativeContextFound:bounded.length>0,sourceCount:bounded.length,exactVersionBinding:true as const,sourceHashBinding:true as const,
      asOf:req.asOf,providerUsed:false as const,aiOutputAuthoritative:false as const,editorialOutputAuthoritative:false as const,
      missingAuthorityBehavior:'fail_closed_no_fabrication' as const,ambiguousAsOfBehavior:'fail_closed' as const,
    }),
  });
}

export function successEnvelope(requestId:string,result:RegulatoryAssistanceResult){
  return Object.freeze({schema:REGULATORY_ASSISTANCE_SCHEMA,ok:true,requestId,operation:'answer' as const,result});
}
