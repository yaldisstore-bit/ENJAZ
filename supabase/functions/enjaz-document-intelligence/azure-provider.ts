export type AzureFetch=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
export type EnjazOcrProviderResult={
  readonly text:string;
  readonly pages:readonly {readonly pageNumber:number;readonly text:string;readonly confidence:number;readonly fields:readonly unknown[]}[];
  readonly extracted:Readonly<Record<string,unknown>>;
  readonly classification:null;
  readonly confidence:number;
  readonly runId:string|null;
};

type J=Record<string,unknown>;
const API_VERSION='2024-11-30',MODEL='prebuilt-read',MAX_TEXT=8_000_000,MAX_PAGE_TEXT=2_000_000;
const obj=(v:unknown):J=>v&&typeof v==='object'&&!Array.isArray(v)?v as J:(()=>{throw new Error('AZURE_OCR_OBJECT_INVALID')})();
const bounded=(v:unknown,max:number,code:string)=>typeof v==='string'&&v.length<=max?v:(()=>{throw new Error(code)})();
const number=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1?n:null};
const average=(values:readonly number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export function normalizeAzureDocumentIntelligenceEndpoint(value:string){
  const u=new URL(value.trim());
  if(u.protocol!=='https:')throw new Error('AZURE_OCR_ENDPOINT_HTTPS_REQUIRED');
  u.search='';u.hash='';u.pathname=u.pathname.replace(/\/$/,'');
  return u;
}

export function parseAzureReadResult(value:unknown,operationLocation?:string|null):EnjazOcrProviderResult{
  const root=obj(value);if(root.status!=='succeeded')throw new Error('AZURE_OCR_RESULT_NOT_SUCCEEDED');
  const result=obj(root.analyzeResult),text=bounded(result.content??'',MAX_TEXT,'AZURE_OCR_TEXT_INVALID');
  if(!Array.isArray(result.pages)||!result.pages.length)throw new Error('AZURE_OCR_PAGES_INVALID');
  const seen=new Set<number>(),allConfidence:number[]=[];
  const pages=result.pages.map(raw=>{
    const p=obj(raw),pageNumber=Number(p.pageNumber);if(!Number.isSafeInteger(pageNumber)||pageNumber<1||seen.has(pageNumber))throw new Error('AZURE_OCR_PAGE_NUMBER_INVALID');seen.add(pageNumber);
    const words=Array.isArray(p.words)?p.words.map(obj):[],lines=Array.isArray(p.lines)?p.lines.map(obj):[];
    const confidenceValues:number[]=[];for(const w of words){const c=number(w.confidence);if(c!==null){confidenceValues.push(c);allConfidence.push(c)}}
    const lineText=lines.map(l=>typeof l.content==='string'?l.content:'').filter(Boolean).join('\n');
    const wordText=words.map(w=>typeof w.content==='string'?w.content:'').filter(Boolean).join(' ');
    const pageText=bounded(lineText||wordText,MAX_PAGE_TEXT,'AZURE_OCR_PAGE_TEXT_INVALID');
    return{pageNumber,text:pageText,confidence:average(confidenceValues),fields:[] as const};
  });
  let runId:string|null=null;if(operationLocation){const u=new URL(operationLocation);const parts=u.pathname.split('/').filter(Boolean);const i=parts.indexOf('analyzeResults');if(i>=0&&parts[i+1])runId=parts[i+1]!.slice(0,320)}
  return{text,pages,extracted:{},classification:null,confidence:average(allConfidence),runId};
}

export async function runAzureDocumentIntelligenceRead(input:{endpoint:string;key:string;sourceUrl:string;timeoutMs?:number;fetcher?:AzureFetch}):Promise<EnjazOcrProviderResult>{
  const endpoint=normalizeAzureDocumentIntelligenceEndpoint(input.endpoint),key=input.key.trim(),source=new URL(input.sourceUrl),fetcher=input.fetcher??fetch,timeoutMs=input.timeoutMs??90_000;
  if(!key)throw new Error('AZURE_OCR_KEY_REQUIRED');if(source.protocol!=='https:')throw new Error('AZURE_OCR_SOURCE_HTTPS_REQUIRED');
  const analyze=new URL(`${endpoint.origin}${endpoint.pathname}/documentintelligence/documentModels/${MODEL}:analyze`);analyze.searchParams.set('_overload','analyzeDocument');analyze.searchParams.set('api-version',API_VERSION);
  const started=await fetcher(analyze,{method:'POST',headers:{'Content-Type':'application/json','Ocp-Apim-Subscription-Key':key},body:JSON.stringify({urlSource:source.toString()})});
  if(started.status!==202)throw new Error(`AZURE_OCR_ANALYZE_HTTP_${started.status}`);
  const operationLocation=started.headers.get('operation-location');if(!operationLocation)throw new Error('AZURE_OCR_OPERATION_LOCATION_MISSING');
  const operation=new URL(operationLocation);if(operation.origin!==endpoint.origin)throw new Error('AZURE_OCR_OPERATION_ORIGIN_MISMATCH');
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const polled=await fetcher(operation,{method:'GET',headers:{'Ocp-Apim-Subscription-Key':key}});if(!polled.ok)throw new Error(`AZURE_OCR_POLL_HTTP_${polled.status}`);
    const payload=await polled.json(),record=obj(payload),status=typeof record.status==='string'?record.status:'';
    if(status==='succeeded')return parseAzureReadResult(payload,operationLocation);
    if(status==='failed'||status==='canceled')throw new Error(`AZURE_OCR_${status.toUpperCase()}`);
    if(status!=='running'&&status!=='notStarted')throw new Error('AZURE_OCR_STATUS_INVALID');
    const retry=Number(polled.headers.get('retry-after')||started.headers.get('retry-after')||1),wait=Math.min(3000,Math.max(250,Number.isFinite(retry)?retry*1000:1000));await sleep(wait);
  }
  throw new Error('AZURE_OCR_TIMEOUT');
}
