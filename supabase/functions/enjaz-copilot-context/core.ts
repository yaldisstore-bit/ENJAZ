export const CONTEXT_SCHEMA='enjaz.copilot.context.v1' as const;
export const CONTEXT_OPERATIONS=['search','summarize','compare','draft','explain'] as const;
export type ContextOperation=typeof CONTEXT_OPERATIONS[number];

export const CONTEXT_DOMAINS=['transactions','companies','people','procedures','documents'] as const;
export type ContextDomain=typeof CONTEXT_DOMAINS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','query','compareWith','limitPerDomain']);

export type ContextRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:ContextOperation;
  query:string;
  compareWith:string|null;
  limitPerDomain:number;
}>;

export type SearchReference=Readonly<{
  schema:'enjaz.global-search-result.v1';
  domain:ContextDomain;
  entityId:string;
  title:string;
  subtitle:string|null;
  destination:string;
}>;

export type ContextCitation=Readonly<{
  citationId:string;
  sourceSchema:'enjaz.global-search-result.v1';
  domain:ContextDomain;
  entityId:string;
  title:string;
  subtitle:string|null;
  destination:string;
  authoritative:true;
}>;

export type ContextResult=Readonly<{
  answer:string;
  citations:readonly ContextCitation[];
  grounding:Readonly<{
    authoritativeContextFound:boolean;
    sourceCount:number;
    sourceDomains:readonly ContextDomain[];
    generationMode:'deterministic_grounded_v1';
    providerUsed:false;
    nonAuthoritativeAssistance:true;
    readSemantics:'fresh_on_replay';
    replayed:boolean;
  }>;
  comparison:null|Readonly<{
    primaryCount:number;
    secondaryCount:number;
    sharedNormalizedTitles:readonly string[];
  }>;
}>;

function normalizedText(value:unknown,max:number){
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,max);
}
function domain(value:unknown):value is ContextDomain{return CONTEXT_DOMAINS.includes(value as ContextDomain)}

export function parseContextRequest(value:unknown):ContextRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  for(const key of Object.keys(row))if(!ALLOWED_KEYS.has(key))throw new Error('REQUEST_FIELD_FORBIDDEN');
  if(typeof row.workspaceId!=='string'||!UUID.test(row.workspaceId))throw new Error('WORKSPACE_ID_INVALID');
  if(typeof row.requestId!=='string'||!UUID.test(row.requestId))throw new Error('REQUEST_ID_INVALID');
  if(typeof row.operation!=='string'||!(CONTEXT_OPERATIONS as readonly string[]).includes(row.operation))throw new Error('OPERATION_FORBIDDEN');
  const query=normalizedText(row.query,120);
  if(query.length<2)throw new Error('QUERY_INVALID');
  const operation=row.operation as ContextOperation;
  const compareWith=normalizedText(row.compareWith,120)||null;
  if(operation==='compare'&&!compareWith)throw new Error('COMPARE_QUERY_REQUIRED');
  if(operation!=='compare'&&row.compareWith!==undefined&&row.compareWith!==null)throw new Error('COMPARE_QUERY_FORBIDDEN');
  const limit=row.limitPerDomain===undefined?4:Number(row.limitPerDomain);
  if(!Number.isSafeInteger(limit)||limit<1||limit>4)throw new Error('LIMIT_INVALID');
  return Object.freeze({workspaceId:row.workspaceId,requestId:row.requestId,operation,query,compareWith,limitPerDomain:limit});
}

export async function contextPayloadHash(req:ContextRequest){
  const value={workspaceId:req.workspaceId,operation:req.operation,query:req.query,compareWith:req.compareWith,limitPerDomain:req.limitPerDomain};
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function parseSearchReferences(value:unknown):readonly SearchReference[]{
  if(!Array.isArray(value))throw new Error('CONTEXT_SOURCE_INVALID');
  return Object.freeze(value.map((item)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('CONTEXT_SOURCE_INVALID');
    const row=item as Record<string,unknown>;
    if(row.schema!=='enjaz.global-search-result.v1'||!domain(row.domain))throw new Error('CONTEXT_SOURCE_INVALID');
    const entityId=normalizedText(row.entityId,128),title=normalizedText(row.title,180);
    const subtitle=row.subtitle===null?null:normalizedText(row.subtitle,220)||null;
    const destination=normalizedText(row.destination,320);
    if(!entityId||!title||!destination.startsWith('/app/'))throw new Error('CONTEXT_SOURCE_INVALID');
    return Object.freeze({schema:'enjaz.global-search-result.v1' as const,domain:row.domain,entityId,title,subtitle,destination});
  }));
}

function cite(rows:readonly SearchReference[],prefix:string):ContextCitation[]{
  return rows.map((row,index)=>Object.freeze({
    citationId:`${prefix}${index+1}`,
    sourceSchema:'enjaz.global-search-result.v1' as const,
    domain:row.domain,
    entityId:row.entityId,
    title:row.title,
    subtitle:row.subtitle,
    destination:row.destination,
    authoritative:true as const,
  }));
}
function compact(citations:readonly ContextCitation[],max=8){
  return citations.slice(0,max).map(c=>`[${c.citationId}] ${c.title}${c.subtitle?` — ${c.subtitle}`:''}`).join('؛ ');
}
function domains(citations:readonly ContextCitation[]){
  return [...new Set(citations.map(c=>c.domain))] as ContextDomain[];
}
function normalizedTitle(value:string){return value.normalize('NFKC').toLocaleLowerCase('ar').replace(/\s+/g,' ').trim()}

export function buildContextResult(req:ContextRequest,primary:readonly SearchReference[],secondary:readonly SearchReference[]=[],replayed=false):ContextResult{
  const a=cite(primary,req.operation==='compare'?'A':'S');
  const b=req.operation==='compare'?cite(secondary,'B'):[];
  const citations=Object.freeze([...a,...b]);
  let answer='';
  let comparison:ContextResult['comparison']=null;

  if(req.operation==='compare'){
    const setB=new Set(b.map(c=>normalizedTitle(c.title)));
    const shared=[...new Set(a.map(c=>normalizedTitle(c.title)).filter(t=>setB.has(t)))].filter(Boolean);
    comparison=Object.freeze({primaryCount:a.length,secondaryCount:b.length,sharedNormalizedTitles:Object.freeze(shared)});
    if(!a.length&&!b.length)answer='لم أجد سياقًا موثوقًا لأي من طرفي المقارنة داخل مساحة العمل الحالية.';
    else answer=`المقارنة مبنية على مراجع ENJAZ المصرح بها فقط. المجموعة الأولى: ${a.length} مرجعًا${a.length?` — ${compact(a,4)}`:''}. المجموعة الثانية: ${b.length} مرجعًا${b.length?` — ${compact(b,4)}`:''}. العناوين المشتركة المطابقة مباشرة: ${shared.length}.`;
  }else if(!a.length){
    answer='لم أجد معلومات موثوقة مطابقة داخل مساحة العمل الحالية. لن أختلق جوابًا بدل البيانات المفقودة.';
  }else if(req.operation==='search'){
    answer=`وجدت ${a.length} مرجعًا موثوقًا داخل ENJAZ. استخدم المراجع أدناه لفتح السجل الأصلي.`;
  }else if(req.operation==='summarize'){
    answer=`ملخص سياقي مبني على ${a.length} مرجعًا موثوقًا: ${compact(a)}.`;
  }else if(req.operation==='explain'){
    answer=`التفسير التالي مستند إلى سجلات ENJAZ المصرح بها وليس حقيقة جديدة مولدة: ${compact(a)}.`;
  }else{
    answer=`مسودة أولية غير معتمدة مبنية على سياق ENJAZ الموثوق: ${compact(a)}. راجع السجلات المشار إليها قبل اعتماد النص أو إرساله.`;
  }

  return Object.freeze({
    answer,
    citations,
    grounding:Object.freeze({
      authoritativeContextFound:citations.length>0,
      sourceCount:citations.length,
      sourceDomains:Object.freeze(domains(citations)),
      generationMode:'deterministic_grounded_v1' as const,
      providerUsed:false as const,
      nonAuthoritativeAssistance:true as const,
      readSemantics:'fresh_on_replay' as const,
      replayed,
    }),
    comparison,
  });
}

export function successEnvelope(requestId:string,traceId:string,operation:ContextOperation,result:ContextResult){
  return Object.freeze({schema:CONTEXT_SCHEMA,ok:true,requestId,traceId,operation,result});
}

export function errorEnvelope(requestId:string|null,traceId:string|null,operation:ContextOperation|null,error:Readonly<{code:string;retryable:boolean;message:string}>){
  return Object.freeze({schema:CONTEXT_SCHEMA,ok:false,requestId,traceId,operation,error});
}
