import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTEXT_SCHEMA,buildContextResult,contextPayloadHash,parseContextRequest,parseSearchReferences,
} from '../supabase/functions/enjaz-copilot-context/core.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';

const refs=[
  {schema:'enjaz.global-search-result.v1',domain:'companies',entityId:'c1',title:'شركة ألف',subtitle:'123 · بغداد',destination:'/app/companies?entity=c1'},
  {schema:'enjaz.global-search-result.v1',domain:'transactions',entityId:'t1',title:'#100 · تأسيس',subtitle:'شركة ألف · جاري',destination:'/app/transactions/t1'},
];

test('12.2 parses all contextual operations inside a bounded request',()=>{
  for(const operation of ['search','summarize','draft','explain']){
    const request=parseContextRequest({workspaceId:W,requestId:R,operation,query:'  شركة   ألف  '});
    assert.equal(request.query,'شركة ألف');
    assert.equal(request.limitPerDomain,4);
    assert.equal(request.compareWith,null);
  }
  const compare=parseContextRequest({workspaceId:W,requestId:R,operation:'compare',query:'شركة ألف',compareWith:'شركة باء',limitPerDomain:2});
  assert.equal(compare.compareWith,'شركة باء');
});

test('12.2 rejects unknown fields, missing context and invalid compare shape',()=>{
  assert.throws(()=>parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'شركة',prompt:'secret'}),/REQUEST_FIELD_FORBIDDEN/);
  assert.throws(()=>parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'x'}),/QUERY_INVALID/);
  assert.throws(()=>parseContextRequest({workspaceId:W,requestId:R,operation:'compare',query:'شركة'}),/COMPARE_QUERY_REQUIRED/);
  assert.throws(()=>parseContextRequest({workspaceId:W,requestId:R,operation:'summarize',query:'شركة',compareWith:'ثانوي'}),/COMPARE_QUERY_FORBIDDEN/);
  assert.throws(()=>parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'شركة',limitPerDomain:5}),/LIMIT_INVALID/);
});

test('12.2 accepts only canonical permission-scoped global-search references',()=>{
  const parsed=parseSearchReferences(refs);
  assert.equal(parsed.length,2);
  assert.throws(()=>parseSearchReferences([{...refs[0],schema:'shadow.search.v1'}]),/CONTEXT_SOURCE_INVALID/);
  assert.throws(()=>parseSearchReferences([{...refs[0],destination:'https://example.com'}]),/CONTEXT_SOURCE_INVALID/);
  assert.throws(()=>parseSearchReferences([{...refs[0],domain:'finance'}]),/CONTEXT_SOURCE_INVALID/);
});

test('12.2 search result exposes authoritative citations and non-authoritative assistance',()=>{
  const request=parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'شركة ألف'});
  const result=buildContextResult(request,parseSearchReferences(refs),[],true);
  assert.equal(CONTEXT_SCHEMA,'enjaz.copilot.context.v1');
  assert.equal(result.citations.length,2);
  const first=result.citations.at(0);
  assert.ok(first);
  assert.equal(first.citationId,'S1');
  assert.equal(first.authoritative,true);
  assert.equal(result.grounding.providerUsed,false);
  assert.equal(result.grounding.nonAuthoritativeAssistance,true);
  assert.equal(result.grounding.readSemantics,'fresh_on_replay');
  assert.equal(result.grounding.replayed,true);
});

test('12.2 missing data fails closed instead of fabricating facts',()=>{
  for(const operation of ['search','summarize','draft','explain']){
    const request=parseContextRequest({workspaceId:W,requestId:R,operation,query:'لا نتيجة'});
    const result=buildContextResult(request,[]);
    assert.equal(result.grounding.authoritativeContextFound,false);
    assert.equal(result.citations.length,0);
    assert.match(result.answer,/لم أجد معلومات موثوقة/);
  }
});

test('12.2 compare preserves two citation namespaces and explicit counts',()=>{
  const request=parseContextRequest({workspaceId:W,requestId:R,operation:'compare',query:'شركة ألف',compareWith:'معاملة'});
  const primary=parseSearchReferences([refs[0]]);
  const secondary=parseSearchReferences([refs[1]]);
  const result=buildContextResult(request,primary,secondary);
  assert.deepEqual(result.citations.map(x=>x.citationId),['A1','B1']);
  assert.equal(result.comparison?.primaryCount,1);
  assert.equal(result.comparison?.secondaryCount,1);
  assert.equal(result.grounding.sourceCount,2);
});

test('12.2 payload hash binds free text without persisting it',async()=>{
  const a=parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'شركة ألف'});
  const b=parseContextRequest({workspaceId:W,requestId:R,operation:'search',query:'شركة باء'});
  assert.notEqual(await contextPayloadHash(a),await contextPayloadHash(b));
  assert.match(await contextPayloadHash(a),/^[0-9a-f]{64}$/);
});
