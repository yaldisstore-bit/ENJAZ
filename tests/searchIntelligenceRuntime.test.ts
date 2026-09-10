import assert from 'node:assert/strict';
import test from 'node:test';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createEnjazSavedViewDefinition } from '../src/features/searchIntelligence/searchSavedViewContract.ts';
import { createSearchIntelligenceGateway } from '../src/features/searchIntelligence/searchIntelligenceCommands.ts';

const W='11111111-1111-4111-8111-111111111111';
const U='22222222-2222-4222-8222-222222222222';
const V='33333333-3333-4333-8333-333333333333';
const O='44444444-4444-4444-8444-444444444444';
const NOW='2026-09-10T06:00:00.000Z';
const DEF=createEnjazSavedViewDefinition({domain:'transactions',query:'روز',filters:{view:'stalled'},sort:'activity-desc',pageSize:20,sourceSchema:'enjaz.transactions.list.v1'});

function clientWith(handler:(name:string,args:Readonly<Record<string,unknown>>)=>unknown){
  return {rpc(name:string,args:Readonly<Record<string,unknown>>){try{return Promise.resolve({data:handler(name,args),error:null});}catch(error){return Promise.reject(error);}}} as never;
}

test('saved-view gateway lists only canonical server records',async()=>{
  const gateway=createSearchIntelligenceGateway(clientWith((name,args)=>{
    assert.equal(name,'list_saved_views_v1'); assert.equal(args.p_workspace_id,W);
    return [{id:V,workspaceId:W,ownerUserId:U,name:'المتلكئة',domain:'transactions',visibility:'personal',teamId:null,definition:DEF,version:1,createdAt:NOW,updatedAt:NOW}];
  }));
  const rows=await gateway.listSavedViews(W);
  assert.equal(rows.length,1); assert.equal(rows[0]?.definition.schema,'enjaz.saved-view.v1'); assert.equal(rows[0]?.name,'المتلكئة');
});

test('saved-view writes preserve version/idempotency and never persist result rows',async()=>{
  const calls:{name:string,args:Readonly<Record<string,unknown>>}[]=[];
  const gateway=createSearchIntelligenceGateway(clientWith((name,args)=>{calls.push({name,args});return {savedViewId:V,version:1,wasCreated:true,replayed:false};}));
  const result=await gateway.saveSavedView({workspaceId:W,savedViewId:null,expectedVersion:null,operationId:O,name:'  عملي اليوم  ',definition:DEF});
  assert.equal(result.savedViewId,V); assert.equal(calls[0]?.name,'save_saved_view_v1'); assert.equal(calls[0]?.args.p_visibility,'personal');
  const sent=calls[0]?.args.p_definition as Record<string,unknown>;
  assert.equal(sent.schema,'enjaz.saved-view.v1'); assert.equal('results' in sent,false); assert.equal('items' in sent,false); assert.equal('entities' in sent,false);
});

test('team sharing fails client-side without an explicit team target',async()=>{
  const gateway=createSearchIntelligenceGateway(clientWith(()=>{throw new Error('RPC must not run');}));
  await assert.rejects(()=>gateway.saveSavedView({workspaceId:W,savedViewId:null,expectedVersion:null,operationId:O,name:'فريق',visibility:'team',teamId:null,definition:DEF}),(error:unknown)=>error instanceof DataAccessError);
});

test('global search is bounded, permission RPC backed and canonical',async()=>{
  const gateway=createSearchIntelligenceGateway(clientWith((name,args)=>{
    assert.equal(name,'global_search_v1'); assert.equal(args.p_workspace_id,W); assert.equal(args.p_query,'شركة روز'); assert.equal(args.p_limit_per_domain,8);
    return [{schema:'enjaz.global-search-result.v1',domain:'companies',entityId:V,title:'شركة روز',subtitle:'123',destination:`/app/companies?entity=${V}`}];
  }));
  const rows=await gateway.globalSearch(W,'  شركة   روز  ');
  assert.equal(rows.length,1); assert.equal(rows[0]?.domain,'companies'); assert.equal(rows[0]?.destination,`/app/companies?entity=${V}`);
});

test('short global-search query never reaches cloud',async()=>{
  let calls=0; const gateway=createSearchIntelligenceGateway(clientWith(()=>{calls+=1;return [];}));
  assert.deepEqual(await gateway.globalSearch(W,'ا'),[]); assert.equal(calls,0);
});

test('malformed result contracts fail closed rather than leaking partial search data',async()=>{
  const gateway=createSearchIntelligenceGateway(clientWith(()=>[{schema:'enjaz.global-search-result.v1',domain:'companies',entityId:V,title:'شركة',subtitle:null,destination:'https://evil.example/'}]));
  await assert.rejects(()=>gateway.globalSearch(W,'شركة'),(error:unknown)=>error instanceof DataAccessError);
});
