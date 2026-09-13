import assert from 'node:assert/strict';
import test from 'node:test';
import {DataAccessError} from '../src/data/contracts/DataAccessError.ts';
import {parseDocumentIntelligence,parseExtractionResult} from '../src/features/documents/documentIntelligenceContract.ts';

const A='11111111-1111-4111-8111-111111111111';
const D='22222222-2222-4222-8222-222222222222';
const V='33333333-3333-4333-8333-333333333333';

const payload=(overrides:Record<string,unknown>={})=>({
 schema:'enjaz.document-intelligence.v1',
 documentId:D,
 currentVersionId:V,
 currentVersionNumber:1,
 sourceAuthority:'SOURCE_FILE_REMAINS_AUTHORITATIVE',
 analyses:[{
  id:A,documentId:D,documentVersionId:V,sourceVersionNumber:1,analysisVersion:1,state:'review_required',reviewStatus:'unreviewed',ocrText:'شركة بغداد',
  extractedFields:{'اسم الشركة':{value:'شركة بغداد',confidence:0.98,pageNumber:1}},
  pages:[{pageNumber:1,text:'شركة بغداد',confidence:0.97,fields:[{key:'اسم الشركة',value:'شركة بغداد',confidence:0.98,pageNumber:1}]}],
  classification:'azure-prebuilt-layout',confidence:0.97,provider:'azure-document-intelligence/prebuilt-layout-v4',stale:false,analyzedAt:'2026-09-14T00:00:00Z',reviewedAt:null,verifiedAt:null,failureCode:null,
 }],
 ...overrides,
});

test('Document Intelligence contract preserves source authority and provenance fields',()=>{
 const result=parseDocumentIntelligence(payload());
 assert.equal(result.sourceAuthority,'SOURCE_FILE_REMAINS_AUTHORITATIVE');
 assert.equal(result.currentVersionNumber,1);
 assert.equal(result.analyses[0]?.state,'review_required');
 assert.equal(result.analyses[0]?.extractedFields['اسم الشركة']?.value,'شركة بغداد');
 assert.equal(result.analyses[0]?.pages[0]?.pageNumber,1);
});

test('Document Intelligence parser fails closed if source authority drifts',()=>{
 assert.throws(()=>parseDocumentIntelligence(payload({sourceAuthority:'OCR_REPLACES_SOURCE'})),(error:unknown)=>error instanceof DataAccessError);
});

test('Document Intelligence parser rejects impossible confidence and duplicate page provenance',()=>{
 const invalidConfidence=payload();
 (invalidConfidence.analyses[0] as Record<string,unknown>).confidence=1.5;
 assert.throws(()=>parseDocumentIntelligence(invalidConfidence),(error:unknown)=>error instanceof DataAccessError);
 const duplicate=payload();
 (duplicate.analyses[0] as Record<string,unknown>).pages=[{pageNumber:1,text:'a',confidence:1,fields:[]},{pageNumber:1,text:'b',confidence:1,fields:[]}];
 assert.throws(()=>parseDocumentIntelligence(duplicate),(error:unknown)=>error instanceof DataAccessError);
});

test('extraction response accepts only governed states',()=>{
 assert.deepEqual(parseExtractionResult({ok:true,analysisId:A,state:'review_required'}),{analysisId:A,state:'review_required'});
 assert.throws(()=>parseExtractionResult({ok:true,analysisId:A,state:'trusted_without_review'}),(error:unknown)=>error instanceof DataAccessError);
 assert.throws(()=>parseExtractionResult({ok:false,analysisId:A,state:'failed'}),(error:unknown)=>error instanceof DataAccessError);
});
