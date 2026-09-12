import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { createRegulatoryKnowledgeGateway } from '../src/features/regulatory/regulatoryKnowledgeCommands.ts';

const WORKSPACE='00000000-0000-4000-8000-000000000001';
const SOURCE='00000000-0000-4000-8000-000000000101';
const VERSION='00000000-0000-4000-8000-000000000201';
const HASH='a'.repeat(64);

function fakeClient(handler:(name:string,args:Readonly<Record<string,unknown>>|undefined)=>unknown){
  return {rpc:async(name:string,args?:Readonly<Record<string,unknown>>)=>({data:handler(name,args),error:null})} as unknown as EnjazSupabaseClient;
}

function searchEnvelope(authoritative:unknown=true){return {
  schema:'enjaz.regulatory-knowledge.search.v1',workspaceId:WORKSPACE,asOf:'2026-09-11',query:'قانون',items:[{
    schema:'enjaz.regulatory-knowledge.search.v1',sourceId:SOURCE,scope:'official_global',workspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الجهة الرسمية',referenceCode:'L-1',asOf:'2026-09-11',versionId:VERSION,revision:1,titleAr:'قانون اختبار',publicationDate:'2026-01-01',effectiveFrom:'2026-01-02',effectiveTo:null,sourceLocator:'الجريدة الرسمية',publisher:'الناشر الرسمي',sourceUrl:'https://example.gov.iq/law',retrievedOn:'2026-09-11',sourceHash:HASH,authoritative,excerpt:'نص رسمي'
  }]
}}

test('9.4 runtime 01 — search is RPC-only, bounded and workspace-scoped',async()=>{
  const calls:Array<{name:string;args:Readonly<Record<string,unknown>>|undefined}>=[];
  const gateway=createRegulatoryKnowledgeGateway(fakeClient((name,args)=>{calls.push({name,args});return searchEnvelope()}));
  const rows=await gateway.search({workspaceId:WORKSPACE,query:' قانون ',kind:'law',scope:'official_global',limit:25});
  assert.equal(calls.length,1);assert.equal(calls[0]?.name,'search_regulatory_knowledge_v1');
  assert.equal(calls[0]?.args?.p_workspace_id,WORKSPACE);assert.equal(calls[0]?.args?.p_query,'قانون');assert.equal(calls[0]?.args?.p_limit,25);
  assert.equal(rows[0]?.authoritative,true);assert.equal(rows[0]?.scope,'official_global');
});

test('9.4 runtime 02 — invalid identity and oversized queries fail before network',async()=>{
  let calls=0;const gateway=createRegulatoryKnowledgeGateway(fakeClient(()=>{calls+=1;return searchEnvelope()}));
  await assert.rejects(gateway.search({workspaceId:'not-a-workspace'}));
  await assert.rejects(gateway.search({workspaceId:WORKSPACE,query:'x'.repeat(161)}));
  await assert.rejects(gateway.search({workspaceId:WORKSPACE,limit:51}));
  await assert.rejects(gateway.getEntry({workspaceId:WORKSPACE,sourceId:'bad'}));
  assert.equal(calls,0);
});

test('9.4 runtime 03 — search result can never downgrade authoritative truth',async()=>{
  const gateway=createRegulatoryKnowledgeGateway(fakeClient(()=>searchEnvelope(false)));
  await assert.rejects(gateway.search({workspaceId:WORKSPACE,query:'قانون'}),/REGULATORY_SEARCH_AUTHORITY_INVALID/);
});

test('9.4 runtime 04 — entry keeps official truth and derived knowledge explicitly separate',async()=>{
  const gateway=createRegulatoryKnowledgeGateway(fakeClient((name)=>{
    assert.equal(name,'get_regulatory_knowledge_entry_v1');
    return {schema:'enjaz.regulatory-knowledge.entry.v1',sourceId:SOURCE,workspaceId:WORKSPACE,asOf:'2026-09-11',configured:true,official:{scope:'official_global',sourceWorkspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الجهة الرسمية',referenceCode:'L-1',versionId:VERSION,revision:1,titleAr:'قانون اختبار',publicationDate:'2026-01-01',effectiveFrom:'2026-01-02',effectiveTo:null,supersedesVersionId:null,sourceLocator:'الجريدة الرسمية',publisher:'الناشر الرسمي',sourceUrl:'https://example.gov.iq/law',retrievedOn:'2026-09-11',sourceHash:HASH,officialText:'النص الرسمي الكامل',authoritative:true},derivedArtifacts:[{artifactId:'00000000-0000-4000-8000-000000000301',kind:'ai_summary',sourceId:SOURCE,sourceVersionId:VERSION,body:'ملخص مساعد فقط',authoritative:false,createdAt:'2026-09-11T12:00:00Z'}]};
  }));
  const entry=await gateway.getEntry({workspaceId:WORKSPACE,sourceId:SOURCE});
  assert.equal(entry.official?.authoritative,true);assert.equal(entry.derivedArtifacts[0]?.authoritative,false);assert.equal(entry.derivedArtifacts[0]?.sourceVersionId,VERSION);
});

test('9.4 runtime 05 — UI cannot bypass gateway with direct regulatory table access',()=>{
  const center=readFileSync('src/ui-r2/regulatory/RegulatoryKnowledgeCenter.tsx','utf8');
  const portal=readFileSync('src/ui-r2/regulatory/LiveRegulatoryKnowledgePortal.tsx','utf8');
  assert.doesNotMatch(center,/\.from\s*\(/);assert.doesNotMatch(center,/regulatory_sources|regulatory_source_versions|regulatory_derived_artifacts/);
  assert.match(center,/gateway\.search\(/);assert.match(center,/gateway\.getEntry\(/);assert.match(center,/data-regulatory-browser-dml="rpc-only"/);
  assert.doesNotMatch(portal,/\.from\s*\(/);
});

test('9.4 runtime 06 — knowledge is live/lazy while the certified 9.1 risk bridge remains explicit',()=>{
  const navigation=readFileSync('src/ui-r2/architecture/navigation-contract.ts','utf8');
  const lazy=readFileSync('src/ui-r2/runtime/LazyLiveProductionPortals.tsx','utf8');
  const financePortal=readFileSync('src/ui-r2/finance/LiveFinanceProductionPortal.tsx','utf8');
  const knowledgePortal=readFileSync('src/ui-r2/regulatory/LiveRegulatoryKnowledgePortal.tsx','utf8');
  const liveRoot=readFileSync('src/ui-r2/runtime/UiR2LiveRoot.tsx','utf8');
  assert.match(navigation,/\['knowledge', 'مركز المعرفة التنظيمية', 7, 'knowledge', 0, 2\]/);
  assert.match(navigation,/\['intelligence', 'الذكاء والمعرفة', \['knowledge', 'copilot'\]\]/);
  assert.match(lazy,/value === 'knowledge'/);assert.match(lazy,/destination === 'knowledge' \? <KnowledgePortal/);
  assert.match(lazy,/value === 'risk'/);assert.match(lazy,/destination === 'finance' \|\| destination === 'risk' \? <FinancePortal \/>/);
  assert.match(financePortal,/useLiveRecordsPortal\('risk'/);assert.match(financePortal,/loadSmartRisk\(/);
  assert.match(liveRoot,/data-live-deferred="true"/);assert.match(liveRoot,/else content=<DeferredDestination id=\{destinationId\}/);
  assert.match(knowledgePortal,/const PLACEHOLDER='\[data-live-deferred=\\"true\\"\]'/);assert.match(knowledgePortal,/placeholder\.hidden=active/);assert.match(knowledgePortal,/shell\.dataset\.destination==='knowledge'/);
});

test('9.4 runtime 07 — SQL runtime API is bounded, actor-authorized and SECURITY INVOKER at public edge',()=>{
  const sql=readFileSync('database/migrations/phase_9_4_regulatory_runtime_read_api.sql','utf8');
  assert.match(sql,/private\.require_organization_actor_v1\(p_workspace_id\)/);
  assert.match(sql,/v_limit not between 1 and 50/);
  assert.match(sql,/create or replace function public\.search_regulatory_knowledge_v1[\s\S]*?security invoker/i);
  assert.match(sql,/create or replace function public\.get_regulatory_knowledge_entry_v1[\s\S]*?security invoker/i);
  assert.match(sql,/'authoritative',true/);assert.match(sql,/'authoritative',false/);
  assert.match(sql,/a\.workspace_id=p_workspace_id/);assert.match(sql,/a\.source_version_id=v_version\.id/);
});
