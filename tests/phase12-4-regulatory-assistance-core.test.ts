import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGULATORY_ASSISTANCE_SCHEMA,REGULATORY_ASSISTANCE_OPERATIONS,
  parseRegulatoryAssistanceRequest,regulatoryAssistancePayloadHash,parseRegulatoryEntryEvidence,
  buildRegulatoryAssistanceResult,successEnvelope,
} from '../supabase/functions/enjaz-regulatory-assistant/core.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333';
const V='44444444-4444-4444-8444-444444444444';
const V2='55555555-5555-4555-8555-555555555555';
const H='a'.repeat(64);

const request=()=>parseRegulatoryAssistanceRequest({workspaceId:W,requestId:R,operation:'answer',query:'قانون الشركات العراقي',asOf:'2026-09-18',limit:4});
const entry=(versionId=V,overrides={})=>({
  schema:'enjaz.regulatory-knowledge.entry.v1',sourceId:S,workspaceId:W,asOf:'2026-09-18',configured:true,
  official:{
    scope:'official_global',sourceWorkspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'مجلس النواب',
    referenceCode:'21/1997',versionId,revision:1,titleAr:'قانون الشركات',publicationDate:'1997-01-01',
    effectiveFrom:'1997-01-01',effectiveTo:null,supersedesVersionId:null,sourceLocator:'الوقائع العراقية',
    publisher:'الوقائع العراقية',sourceUrl:'https://example.gov.iq/law/21',retrievedOn:'2026-09-18',
    sourceHash:H,officialText:'هذا نص رسمي اختباري لقانون الشركات يوضح المادة التنظيمية المعتمدة.',authoritative:true,
    ...overrides,
  },derivedArtifacts:[],
});

test('12.4 A1 request is answer-only, explicit-asOf and bounded',()=>{
  assert.deepEqual(REGULATORY_ASSISTANCE_OPERATIONS,['answer']);
  const req=request();
  assert.equal(req.asOf,'2026-09-18');
  assert.equal(req.limit,4);
  assert.throws(()=>parseRegulatoryAssistanceRequest({...req,asOf:undefined}),/AS_OF_INVALID/);
  assert.throws(()=>parseRegulatoryAssistanceRequest({...req,operation:'mutate'}),/OPERATION_FORBIDDEN/);
  assert.throws(()=>parseRegulatoryAssistanceRequest({...req,provider:'openai'}),/REQUEST_FIELD_FORBIDDEN/);
  assert.throws(()=>parseRegulatoryAssistanceRequest({...req,limit:9}),/LIMIT_INVALID/);
});

test('12.4 A1 payload hash binds workspace query asOf and limit',async()=>{
  const req=request();
  const hash=await regulatoryAssistancePayloadHash(req);
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert.notEqual(hash,await regulatoryAssistancePayloadHash({...req,query:'قانون آخر'}));
  assert.notEqual(hash,await regulatoryAssistancePayloadHash({...req,asOf:'2025-09-18'}));
  assert.notEqual(hash,await regulatoryAssistancePayloadHash({...req,limit:3}));
});

test('12.4 A1 accepts only authoritative exact-version M8 entries',()=>{
  const parsed=parseRegulatoryEntryEvidence(entry());
  assert.equal(parsed?.facts.sourceId,S);
  assert.equal(parsed?.facts.versionId,V);
  assert.equal(parsed?.facts.sourceHash,H);
  assert.equal(parsed?.facts.authoritative,true);
  assert.throws(()=>parseRegulatoryEntryEvidence(entry(V,{authoritative:false})),/REGULATORY_OFFICIAL_AUTHORITY_INVALID/);
  assert.throws(()=>parseRegulatoryEntryEvidence(entry(V,{sourceHash:'bad'})),/SOURCE_HASH_INVALID/);
  assert.throws(()=>parseRegulatoryEntryEvidence({...entry(),schema:'shadow.truth.v1'}),/REGULATORY_ENTRY_SCHEMA_INVALID/);
});

test('12.4 A1 separates official text, structured facts and non-authoritative interpretation',()=>{
  const req=request();
  const result=buildRegulatoryAssistanceResult(req,[entry()]);
  assert.equal(result.officialSourceText.length,1);
  assert.equal(result.officialSourceText[0]?.authoritative,true);
  assert.equal(result.structuredFacts.length,1);
  assert.equal(result.structuredFacts[0]?.authoritative,true);
  assert.equal(result.interpretation.authoritative,false);
  assert.equal(result.grounding.providerUsed,false);
  assert.equal(result.grounding.aiOutputAuthoritative,false);
  assert.equal(result.citations[0]?.sourceId,S);
  assert.equal(result.citations[0]?.versionId,V);
  assert.equal(result.citations[0]?.sourceHash,H);
  assert.equal(result.citations[0]?.authoritative,true);
  const envelope=successEnvelope(R,result);
  assert.equal(envelope.schema,REGULATORY_ASSISTANCE_SCHEMA);
});

test('12.4 A1 fails closed on ambiguous same-source asOf versions',()=>{
  const req=request();
  assert.throws(()=>buildRegulatoryAssistanceResult(req,[entry(V),entry(V2,{revision:2})]),/REGULATORY_ASOF_AMBIGUOUS/);
});

test('12.4 A1 fails closed semantically when authoritative context is missing',()=>{
  const req=request();
  const result=buildRegulatoryAssistanceResult(req,[]);
  assert.equal(result.grounding.authoritativeContextFound,false);
  assert.equal(result.citations.length,0);
  assert.equal(result.officialSourceText.length,0);
  assert.equal(result.structuredFacts.length,0);
  assert.equal(result.interpretation.authoritative,false);
  assert.match(result.answer,/لن أنشئ تفسيرًا بديلًا/);
});

test('12.4 A1 rejects cross-workspace and asOf evidence mismatch',()=>{
  const req=request();
  assert.throws(()=>buildRegulatoryAssistanceResult(req,[{...entry(),workspaceId:'66666666-6666-4666-8666-666666666666'}]),/REGULATORY_WORKSPACE_MISMATCH/);
  assert.throws(()=>buildRegulatoryAssistanceResult(req,[{...entry(),asOf:'2026-09-17'}]),/REGULATORY_ASOF_MISMATCH/);
});
