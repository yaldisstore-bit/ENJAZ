import assert from 'node:assert/strict';
import test from 'node:test';
import {DataAccessError} from '../src/data/contracts/DataAccessError.ts';
import {inspectDocumentBinary} from '../src/features/documents/documentBinarySafety.ts';
import {assertDocumentIntelligenceTransition,isVerifiedIntelligenceUsable} from '../src/features/documents/documentIntelligenceContract.ts';
import {createDocumentUploadRetryTicket,executeDocumentUploadRetry} from '../src/features/documents/documentUploadRetry.ts';
import type {DocumentVaultGateway} from '../src/features/documents/documentVaultCommands.ts';
import {parseVaultDetail,type DocumentUploadInput} from '../src/features/documents/documentVaultContract.ts';
import {assertReportPdfPlanSafe,planReportPdfPages,reportPdfReservedZones,ReportPdfContractError} from '../src/features/reports/reportPdfContract.ts';

const WS='11111111-1111-4111-8111-111111111111';
const DOC='22222222-2222-4222-8222-222222222222';
const OP='33333333-3333-4333-8333-333333333333';
const enc=(text:string)=>new TextEncoder().encode(text);
const pdf=(body='1 0 obj\n<<>>\nendobj')=>new File([enc(`%PDF-1.4\n${body}\n%%EOF`)],'safe.pdf',{type:'application/pdf'});
const uploadInput=(file=pdf()):DocumentUploadInput=>({workspaceId:WS,title:'Zero Escape',documentType:'gate',companyId:null,transactionId:null,operationId:OP,file});

test('accepts a structurally safe PDF and emits SHA-256 evidence',async()=>{const result=await inspectDocumentBinary(pdf());assert.equal(result.schema,'enjaz.document-binary-safety.v1');assert.equal(result.mimeType,'application/pdf');assert.match(result.sha256,/^[0-9a-f]{64}$/)});
test('rejects a MIME/extension masquerade',async()=>{const file=new File([enc('%PDF-1.4\n%%EOF')],'fake.jpg',{type:'application/pdf'});await assert.rejects(()=>inspectDocumentBinary(file),DataAccessError)});
test('rejects an executable masquerading as PDF',async()=>{const bytes=new Uint8Array([0x4d,0x5a,0x90,0x00,0x25,0x50,0x44,0x46,0x2d]);const file=new File([bytes],'evil.pdf',{type:'application/pdf'});await assert.rejects(()=>inspectDocumentBinary(file),DataAccessError)});
test('rejects scriptable HTML masquerading as an allowed document',async()=>{const file=new File([enc('<!doctype html><script>alert(1)</script>')],'evil.pdf',{type:'application/pdf'});await assert.rejects(()=>inspectDocumentBinary(file),DataAccessError)});
test('rejects PDF active-content markers',async()=>{await assert.rejects(()=>inspectDocumentBinary(pdf('1 0 obj\n<< /OpenAction 2 0 R /JavaScript (x) >>\nendobj')),DataAccessError)});
test('rejects corrupt PDF missing EOF marker',async()=>{const file=new File([enc('%PDF-1.4\n1 0 obj\n<<>>')],'broken.pdf',{type:'application/pdf'});await assert.rejects(()=>inspectDocumentBinary(file),DataAccessError)});

test('offline upload becomes deferred without consuming an attempt',async()=>{const gateway={upload:async()=>{throw new Error('must not run')}} as unknown as DocumentVaultGateway;const ticket=createDocumentUploadRetryTicket(uploadInput());const outcome=await executeDocumentUploadRetry(gateway,ticket,{isOnline:()=>false,delay:async()=>{}});assert.equal(outcome.status,'deferred_offline');if(outcome.status==='deferred_offline'){assert.equal(outcome.ticket.attempts,0);assert.equal(outcome.ticket.operationId,OP)}});
test('transient retry reuses one operation identity until success',async()=>{const seen:string[]=[];let calls=0;const gateway={upload:async(input:DocumentUploadInput)=>{seen.push(input.operationId??'');calls++;if(calls===1)throw new DataAccessError('network','DATA_UNAVAILABLE');return{documentId:DOC,versionNumber:1}}} as unknown as DocumentVaultGateway;const outcome=await executeDocumentUploadRetry(gateway,createDocumentUploadRetryTicket(uploadInput()),{isOnline:()=>true,delay:async()=>{}});assert.equal(outcome.status,'uploaded');assert.deepEqual(seen,[OP,OP]);if(outcome.status==='uploaded')assert.equal(outcome.attempts,2)});
test('unknown write outcome is reconciled only with the same operation identity',async()=>{const seen:string[]=[];let calls=0;const gateway={upload:async(input:DocumentUploadInput)=>{seen.push(input.operationId??'');calls++;if(calls===1)throw new DataAccessError('unknown','DATA_OUTCOME_UNKNOWN');return{documentId:DOC,versionNumber:2}}} as unknown as DocumentVaultGateway;const outcome=await executeDocumentUploadRetry(gateway,createDocumentUploadRetryTicket(uploadInput()),{delay:async()=>{}});assert.equal(outcome.status,'uploaded');assert.deepEqual(seen,[OP,OP])});
test('validation or authorization failures are never retried',async()=>{let calls=0;const gateway={upload:async()=>{calls++;throw new DataAccessError('forbidden','DATA_FORBIDDEN')}} as unknown as DocumentVaultGateway;const outcome=await executeDocumentUploadRetry(gateway,createDocumentUploadRetryTicket(uploadInput()),{delay:async()=>{}});assert.equal(outcome.status,'failed');assert.equal(calls,1)});

test('broken authoritative document metadata fails closed',()=>{assert.throws(()=>parseVaultDetail({schema:'enjaz.document-detail.v1',document:{id:DOC,title:'x',documentType:null,fileName:'x.pdf',mimeType:'application/pdf',sizeBytes:-1,status:'ready',companyId:null,transactionId:null,createdAt:'2026-09-14T00:00:00Z',archivedAt:null},versions:[]}))});
test('failed OCR cannot jump to verified and stale verified OCR is unusable',()=>{assert.throws(()=>assertDocumentIntelligenceTransition('failed','verified'));assert.equal(isVerifiedIntelligenceUsable({state:'verified',stale:true}),false)});
test('long report deterministically splits across nonblank safe pages',()=>{const pages=planReportPdfPages([{kind:'flow',id:'long-report',height:1900,minFragmentHeight:24}]);assert.ok(pages.length>=3);assert.doesNotThrow(()=>assertReportPdfPlanSafe(pages));assert.ok(pages.every(page=>page.fragments.length>0))});
test('oversized atomic report content fails closed instead of clipping',()=>{assert.throws(()=>planReportPdfPages([{kind:'atomic',id:'oversized',height:10_000}]),(error:unknown)=>error instanceof ReportPdfContractError&&error.code==='REPORT_PDF_BLOCK_TOO_TALL')});
test('blank report pages remain forbidden',()=>{const zones=reportPdfReservedZones();assert.throws(()=>assertReportPdfPlanSafe([{pageNumber:1,fragments:[],zones}]),(error:unknown)=>error instanceof ReportPdfContractError&&error.code==='REPORT_PDF_BLANK_PAGE')});
