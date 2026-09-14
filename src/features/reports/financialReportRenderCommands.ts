import { DataAccessError, normalizeThrownDataFailure } from '../../data/contracts/DataAccessError.ts';
import type { FinancialReportQuery } from '../finance/financeReports.ts';

export interface FinancialReportPdfRenderInput {
  readonly workspaceId: string;
  readonly query: FinancialReportQuery;
  readonly expectedFingerprint: string;
}

export interface FinancialReportPdfRenderResult {
  readonly file: Blob;
  readonly filename: string;
  readonly fingerprint: string;
  readonly identity: string;
  readonly pageCount: number;
}

export interface FinancialReportEdgeTransport {
  edge(functionName: string, init?: RequestInit): Promise<Response>;
}

export interface FinancialReportRenderGateway {
  renderPdf(input: FinancialReportPdfRenderInput): Promise<FinancialReportPdfRenderResult>;
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FP=/^ENJAZ-FR-[0-9a-f]{16}$/;
const DEFAULT_TIMEOUT=30_000;

function requireUuid(value:string,label:string){if(!UUID.test(value.trim()))throw new DataAccessError(`Invalid ${label}`,'DATA_VALIDATION_FAILED');return value.trim()}
function safeFilename(value:string|null,fingerprint:string){const match=value?.match(/filename="?([^";]+)"?/i),candidate=match?.[1]?.trim();if(candidate&&/^[A-Za-z0-9._-]+\.pdf$/i.test(candidate))return candidate;return `enjaz-finance-${fingerprint}.pdf`}
function parseErrorBody(value:unknown):Readonly<Record<string,unknown>>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Readonly<Record<string,unknown>>:{}}

export function createFinancialReportRenderGateway(client:FinancialReportEdgeTransport,timeoutMs=DEFAULT_TIMEOUT):FinancialReportRenderGateway{
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120_000)throw new Error('Invalid financial report renderer timeout');
 return Object.freeze({
  async renderPdf(input:FinancialReportPdfRenderInput){
   const workspaceId=requireUuid(input.workspaceId,'workspace id');
   if(!FP.test(input.expectedFingerprint))throw new DataAccessError('Invalid report fingerprint','DATA_VALIDATION_FAILED');
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const controller=new AbortController();timer=setTimeout(()=>controller.abort(),timeoutMs);
    const response=await client.edge('enjaz-financial-report-render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId,query:input.query,expectedFingerprint:input.expectedFingerprint}),signal:controller.signal});
    if(!response.ok){
     const body=parseErrorBody(await response.json().catch(()=>null));
     const code=typeof body.error==='string'?body.error:'';
     if(response.status===401||response.status===403)throw new DataAccessError(code||'Financial report render forbidden','DATA_FORBIDDEN');
     if(response.status===409&&code==='REPORT_FINGERPRINT_STALE')throw new DataAccessError('Financial report changed before PDF generation','DATA_CONFLICT',body);
     if(response.status===400||response.status===413)throw new DataAccessError(code||'Financial report render rejected input','DATA_VALIDATION_FAILED',body);
     throw new DataAccessError(code||`Financial report render failed (${response.status})`,'DATA_OPERATION_FAILED',body);
    }
    const contentType=response.headers.get('content-type')?.toLowerCase()??'';
    const fingerprint=response.headers.get('x-enjaz-report-fingerprint')??'';
    const identity=response.headers.get('x-enjaz-report-identity')??'';
    const pages=Number(response.headers.get('x-enjaz-report-pages')??'0');
    if(!contentType.startsWith('application/pdf')||fingerprint!==input.expectedFingerprint||!identity.startsWith('ENJAZ:REPORT:v1:')||!Number.isSafeInteger(pages)||pages<1)throw new DataAccessError('Invalid financial PDF certificate','DATA_OPERATION_FAILED');
    const file=await response.blob();
    if(file.size<1500)throw new DataAccessError('Financial PDF is unexpectedly small','DATA_OPERATION_FAILED');
    return Object.freeze({file,filename:safeFilename(response.headers.get('content-disposition'),fingerprint),fingerprint,identity,pageCount:pages});
   }catch(error){throw normalizeThrownDataFailure(error,'read')}finally{if(timer!==undefined)clearTimeout(timer)}
  },
 });
}
