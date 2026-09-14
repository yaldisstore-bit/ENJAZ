import assert from 'node:assert/strict';
import test from 'node:test';
import {DataAccessError} from '../src/data/contracts/DataAccessError.ts';
import {createFinancialReportRenderGateway,type FinancialReportEdgeTransport} from '../src/features/reports/financialReportRenderCommands.ts';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const FINGERPRINT='ENJAZ-FR-0123456789abcdef';
const QUERY={kind:'period' as const,from:'2026-09-01',to:'2026-09-30'};

function transport(response:Response):FinancialReportEdgeTransport{return{async edge(name,init){assert.equal(name,'enjaz-financial-report-render');assert.equal(init?.method,'POST');return response}}}
function pdfResponse(overrides:Record<string,string>={}){const bytes=new Uint8Array(1800);bytes.set(Buffer.from('%PDF-'));return new Response(bytes,{status:200,headers:{'Content-Type':'application/pdf','X-ENJAZ-Report-Fingerprint':FINGERPRINT,'X-ENJAZ-Report-Pages':'4','X-ENJAZ-Report-Identity':`ENJAZ:REPORT:v1:${WORKSPACE}:finance-period:period-workspace-2026-09-01-2026-09-30:${FINGERPRINT}`,...overrides}})}

test('10.4 report gateway accepts only certified binary PDF response',async()=>{
 const gateway=createFinancialReportRenderGateway(transport(pdfResponse()));
 const result=await gateway.renderPdf({workspaceId:WORKSPACE,query:QUERY,expectedFingerprint:FINGERPRINT});
 assert.equal(result.pageCount,4);assert.equal(result.fingerprint,FINGERPRINT);assert.equal(result.file.type,'application/pdf');assert.ok(result.file.size>=1500);assert.match(result.identity,/^ENJAZ:REPORT:v1:/);
});

test('10.4 report gateway maps stale server fingerprint to data conflict',async()=>{
 const response=new Response(JSON.stringify({error:'REPORT_FINGERPRINT_STALE',currentFingerprint:'ENJAZ-FR-fedcba9876543210'}),{status:409,headers:{'Content-Type':'application/json'}});
 const gateway=createFinancialReportRenderGateway(transport(response));
 await assert.rejects(()=>gateway.renderPdf({workspaceId:WORKSPACE,query:QUERY,expectedFingerprint:FINGERPRINT}),(error:unknown)=>error instanceof DataAccessError&&error.dataCode==='DATA_CONFLICT');
});

test('10.4 report gateway rejects mismatched PDF certificate',async()=>{
 const gateway=createFinancialReportRenderGateway(transport(pdfResponse({'X-ENJAZ-Report-Fingerprint':'ENJAZ-FR-fedcba9876543210'})));
 await assert.rejects(()=>gateway.renderPdf({workspaceId:WORKSPACE,query:QUERY,expectedFingerprint:FINGERPRINT}),(error:unknown)=>error instanceof DataAccessError&&error.dataCode==='DATA_OPERATION_FAILED');
});
