import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRegulatoryEntryMatchesSearchReference,
  parseRegulatoryAssistanceRequest,
  parseRegulatorySearchEvidence,
} from '../supabase/functions/enjaz-regulatory-assistant/core.ts';

const W='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const R='33333333-3333-4333-8333-333333333333';
const S='44444444-4444-4444-8444-444444444444';
const S2='55555555-5555-4555-8555-555555555555';
const V='66666666-6666-4666-8666-666666666666';
const V2='77777777-7777-4777-8777-777777777777';
const H='a'.repeat(64);

const req=()=>parseRegulatoryAssistanceRequest({workspaceId:W,requestId:R,operation:'answer',query:'قانون الشركات',asOf:'2026-09-18',limit:4});
const item=(overrides={})=>({
  schema:'enjaz.regulatory-knowledge.search.v1',sourceId:S,scope:'official_global',workspaceId:null,kind:'law',
  jurisdiction:'العراق',issuer:'الجهة الرسمية',referenceCode:'LAW-A3',asOf:'2026-09-18',versionId:V,revision:1,
  titleAr:'قانون اختبار',publicationDate:'2026-01-01',effectiveFrom:'2026-01-02',effectiveTo:null,
  sourceLocator:'الجريدة الرسمية',publisher:'الجهة الرسمية',sourceUrl:'https://example.gov.iq/a3',
  retrievedOn:'2026-09-18',sourceHash:H,authoritative:true,excerpt:'نص رسمي',...overrides,
});
const search=(items=[item()],overrides={})=>({
  schema:'enjaz.regulatory-knowledge.search.v1',workspaceId:W,asOf:'2026-09-18',query:'قانون الشركات',items,...overrides,
});
const entry=(overrides={},officialOverrides={})=>({
  schema:'enjaz.regulatory-knowledge.entry.v1',sourceId:S,workspaceId:W,asOf:'2026-09-18',configured:true,
  official:{
    scope:'official_global',sourceWorkspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الجهة الرسمية',
    referenceCode:'LAW-A3',versionId:V,revision:1,titleAr:'قانون اختبار',publicationDate:'2026-01-01',
    effectiveFrom:'2026-01-02',effectiveTo:null,supersedesVersionId:null,sourceLocator:'الجريدة الرسمية',
    publisher:'الجهة الرسمية',sourceUrl:'https://example.gov.iq/a3',retrievedOn:'2026-09-18',
    sourceHash:H,officialText:'نص رسمي موثوق لاختبار A3.',authoritative:true,...officialOverrides,
  },derivedArtifacts:[],...overrides,
});

test('12.4 A3 binds exact official search reference to entry',()=>{
  const request=req();
  const refs=parseRegulatorySearchEvidence(search(),request);
  assert.equal(refs.length,1);
  assert.deepEqual(refs[0],{sourceId:S,versionId:V,sourceHash:H,scope:'official_global',sourceWorkspaceId:null,asOf:'2026-09-18'});
  assert.doesNotThrow(()=>assertRegulatoryEntryMatchesSearchReference(entry(),refs[0]!,request));
});

test('12.4 A3 search root binds caller workspace and asOf',()=>{
  const request=req();
  assert.throws(()=>parseRegulatorySearchEvidence(search(undefined,{workspaceId:OTHER}),request),/REGULATORY_SEARCH_WORKSPACE_MISMATCH/);
  assert.throws(()=>parseRegulatorySearchEvidence(search(undefined,{asOf:'2026-09-17'}),request),/REGULATORY_SEARCH_ASOF_MISMATCH/);
});

test('12.4 A3 rejects malformed or non-authoritative search items',()=>{
  const request=req();
  assert.throws(()=>parseRegulatorySearchEvidence(search([item({authoritative:false})]),request),/REGULATORY_SEARCH_ITEM_INVALID/);
  assert.throws(()=>parseRegulatorySearchEvidence(search([item({sourceHash:'bad'})]),request),/REGULATORY_SEARCH_ITEM_INVALID/);
  assert.throws(()=>parseRegulatorySearchEvidence(search([item({asOf:'2026-09-17'})]),request),/REGULATORY_SEARCH_ASOF_MISMATCH/);
});

test('12.4 A3 locks scope to source-workspace shape',()=>{
  const request=req();
  assert.throws(()=>parseRegulatorySearchEvidence(search([item({scope:'official_global',workspaceId:W})]),request),/REGULATORY_SEARCH_SCOPE_WORKSPACE_MISMATCH/);
  const curated=parseRegulatorySearchEvidence(search([item({scope:'workspace_curated',workspaceId:W})]),request);
  assert.equal(curated[0]?.sourceWorkspaceId,W);
  assert.throws(()=>parseRegulatorySearchEvidence(search([item({scope:'workspace_curated',workspaceId:OTHER})]),request),/REGULATORY_SEARCH_SCOPE_WORKSPACE_MISMATCH/);
});

test('12.4 A3 fails closed on duplicate or ambiguous search versions',()=>{
  const request=req();
  assert.throws(()=>parseRegulatorySearchEvidence(search([item(),item()]),request),/REGULATORY_SEARCH_DUPLICATE_SOURCE/);
  assert.throws(()=>parseRegulatorySearchEvidence(search([item(),item({versionId:V2})]),request),/REGULATORY_SEARCH_VERSION_AMBIGUOUS/);
  const two=parseRegulatorySearchEvidence(search([item(),item({sourceId:S2,versionId:V2,sourceHash:'b'.repeat(64)})]),request);
  assert.equal(two.length,2);
});

test('12.4 A3 rejects entry source/version/hash/scope drift',()=>{
  const request=req();
  const ref=parseRegulatorySearchEvidence(search(),request)[0]!;
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({sourceId:S2}),ref,request),/REGULATORY_SOURCE_BINDING_CONFLICT/);
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({}, {versionId:V2}),ref,request),/REGULATORY_SOURCE_BINDING_CONFLICT/);
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({}, {sourceHash:'b'.repeat(64)}),ref,request),/REGULATORY_SOURCE_BINDING_CONFLICT/);
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({}, {scope:'workspace_curated',sourceWorkspaceId:W}),ref,request),/REGULATORY_SOURCE_BINDING_CONFLICT/);
});

test('12.4 A3 rejects entry workspace/asOf drift and unconfigured-after-search',()=>{
  const request=req();
  const ref=parseRegulatorySearchEvidence(search(),request)[0]!;
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({workspaceId:OTHER}),ref,request),/REGULATORY_WORKSPACE_MISMATCH/);
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({asOf:'2026-09-17'}),ref,request),/REGULATORY_ASOF_MISMATCH/);
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference({...entry(),configured:false,official:null},ref,request),/REGULATORY_SEARCH_ENTRY_MISSING/);
});

test('12.4 A3 binds workspace-curated entry to caller workspace',()=>{
  const request=req();
  const refs=parseRegulatorySearchEvidence(search([item({scope:'workspace_curated',workspaceId:W})]),request);
  assert.doesNotThrow(()=>assertRegulatoryEntryMatchesSearchReference(entry({}, {scope:'workspace_curated',sourceWorkspaceId:W}),refs[0]!,request));
  assert.throws(()=>assertRegulatoryEntryMatchesSearchReference(entry({}, {scope:'workspace_curated',sourceWorkspaceId:OTHER}),refs[0]!,request),/REGULATORY_SOURCE_BINDING_CONFLICT/);
});
