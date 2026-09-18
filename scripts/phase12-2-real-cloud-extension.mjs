import {mkdir,writeFile} from 'node:fs/promises';

const DIR='artifacts/phase12-2-real-cloud';
const OUT=`${DIR}/evidence.json`;

export async function verifyPhase122Context({admin,owner,outsider,workspaceId,outsiderWorkspaceId,edgeUrl,publishableKey}){
  const evidence={
    schema:'enjaz.phase12-2-real-cloud-e2e.v1',
    startedAt:new Date().toISOString(),
    completedAt:null,
    passed:false,
    checks:[],
    cleanup:[],
    cleanupPassed:false,
  };
  const companies=[];
  let fatal=null;
  const ok=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.2 ${name}${detail?` — ${detail}`:''}`)};
  const assert=(value,name,detail=null)=>{if(!value)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);ok(name,detail)};
  const edge=async(token,body)=>{
    const response=await fetch(edgeUrl,{method:'POST',headers:{'content-type':'application/json',apikey:publishableKey,authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    const raw=await response.text();let data=null;try{data=JSON.parse(raw)}catch{data={raw}};
    return{status:response.status,data};
  };
  const createCompany=async(ws,name)=>{
    const id=crypto.randomUUID();
    const {error}=await admin.from('companies').insert({id,workspace_id:ws,legal_name:name,display_name:name,status:'active'});
    if(error)throw error;
    companies.push(id);
    return id;
  };
  const count=async(table)=>{
    const {count,error}=await admin.from(table).select('id',{head:true,count:'exact'}).eq('workspace_id',workspaceId);
    if(error)throw error;
    return count??0;
  };
  const watched=['transactions','payments','documents','renewals','communications','calendar_events','intake_submissions'];

  try{
    const stamp=Date.now().toString(36).toUpperCase();
    const alpha=`P122ALPHA${stamp}`,beta=`P122BETA${stamp}`,foreign=`P122FOREIGN${stamp}`;
    const alphaId=await createCompany(workspaceId,alpha);
    const betaId=await createCompany(workspaceId,beta);
    const foreignId=await createCompany(outsiderWorkspaceId,foreign);
    assert(alphaId!==betaId&&betaId!==foreignId,'fixture_identity_isolation');

    const before=Object.fromEntries(await Promise.all(watched.map(async table=>[table,await count(table)])));

    const browserBoundary=await owner.client.rpc('copilot_begin_request_v2',{
      p_workspace_id:workspaceId,p_actor_user_id:owner.id,p_request_id:crypto.randomUUID(),
      p_operation:'search',p_payload_hash:'a'.repeat(64),p_limit:20
    });
    assert(Boolean(browserBoundary.error),'browser_service_rpc_denied');

    const direct=await owner.client.rpc('global_search_v1',{p_workspace_id:workspaceId,p_query:alpha,p_limit_per_domain:4});
    if(direct.error)throw direct.error;
    assert(Array.isArray(direct.data)&&direct.data.some(x=>x?.domain==='companies'&&x?.entityId===alphaId),'authenticated_source_finds_fixture');

    const hidden=await owner.client.rpc('global_search_v1',{p_workspace_id:workspaceId,p_query:foreign,p_limit_per_domain:4});
    if(hidden.error)throw hidden.error;
    assert(Array.isArray(hidden.data)&&hidden.data.length===0,'source_cross_workspace_omission');

    const raw=await edge(owner.token,{workspaceId,requestId:crypto.randomUUID(),operation:'search',query:alpha,prompt:'forbidden'});
    assert(raw.status===400&&raw.data?.error?.code==='REQUEST_FIELD_FORBIDDEN','unknown_prompt_field_rejected');

    const requestId=crypto.randomUUID();
    const search=await edge(owner.token,{workspaceId,requestId,operation:'search',query:alpha});
    assert(search.status===200&&search.data?.schema==='enjaz.copilot.context.v1'&&search.data?.ok===true,'search_structured_success');
    assert(search.data?.result?.grounding?.authoritativeContextFound===true,'search_authoritative_context_found');
    assert(search.data?.result?.grounding?.providerUsed===false&&search.data?.result?.grounding?.nonAuthoritativeAssistance===true,'search_no_provider_non_authoritative');
    assert(search.data?.result?.citations?.some(c=>c?.domain==='companies'&&c?.entityId===alphaId&&c?.destination===`/app/companies?entity=${alphaId}`),'search_exact_citation');

    const replay=await edge(owner.token,{workspaceId,requestId,operation:'search',query:alpha});
    assert(replay.status===200&&replay.data?.traceId===search.data?.traceId&&replay.data?.result?.grounding?.replayed===true,'exact_replay_same_trace');
    assert(replay.data?.result?.grounding?.readSemantics==='fresh_on_replay','fresh_on_replay');

    const conflict=await edge(owner.token,{workspaceId,requestId,operation:'search',query:beta});
    assert(conflict.status===409&&conflict.data?.error?.code==='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT','changed_replay_conflict');

    for(const operation of ['summarize','draft','explain']){
      const response=await edge(owner.token,{workspaceId,requestId:crypto.randomUUID(),operation,query:alpha});
      assert(response.status===200&&response.data?.ok===true,`${operation}_success`);
      assert(response.data?.result?.citations?.some(c=>c?.entityId===alphaId),`${operation}_grounded_citation`);
    }

    const compare=await edge(owner.token,{workspaceId,requestId:crypto.randomUUID(),operation:'compare',query:alpha,compareWith:beta,limitPerDomain:2});
    assert(compare.status===200&&compare.data?.ok===true,'compare_success');
    assert(compare.data?.result?.citations?.some(c=>c?.citationId==='A1'&&c?.entityId===alphaId),'compare_primary_citation');
    assert(compare.data?.result?.citations?.some(c=>c?.citationId==='B1'&&c?.entityId===betaId),'compare_secondary_citation');

    const missing=await edge(owner.token,{workspaceId,requestId:crypto.randomUUID(),operation:'explain',query:`P122MISSING${stamp}`});
    assert(missing.status===200&&missing.data?.result?.grounding?.authoritativeContextFound===false,'missing_context_explicit');
    assert(Array.isArray(missing.data?.result?.citations)&&missing.data.result.citations.length===0,'missing_context_zero_citations');
    assert(String(missing.data?.result?.answer??'').includes('لن أختلق'),'missing_context_no_fabrication');

    const denied=await edge(outsider.token,{workspaceId,requestId:crypto.randomUUID(),operation:'search',query:alpha});
    assert(denied.status===403&&denied.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_edge_denied');

    const own=await edge(outsider.token,{workspaceId:outsiderWorkspaceId,requestId:crypto.randomUUID(),operation:'search',query:foreign});
    assert(own.status===200&&own.data?.result?.citations?.some(c=>c?.entityId===foreignId),'other_workspace_own_context_allowed');

    const after=Object.fromEntries(await Promise.all(watched.map(async table=>[table,await count(table)])));
    for(const table of watched)assert(after[table]===before[table],`no_business_write_${table}`,String(before[table]));
    ok('no_copilot_business_mutation');
  }catch(error){
    fatal=error;
  }finally{
    let cleanupPassed=true;
    for(const id of companies){
      try{
        const {error}=await admin.from('companies').delete().eq('id',id);
        if(error)throw error;
        evidence.cleanup.push({kind:'company',passed:true});
      }catch(error){
        cleanupPassed=false;
        evidence.cleanup.push({kind:'company',passed:false,error:error instanceof Error?error.message:String(error)});
      }
    }
    try{
      if(companies.length){
        const {data,error}=await admin.from('companies').select('id').in('id',companies);
        if(error)throw error;
        if((data??[]).length)throw new Error('company residue');
      }
      evidence.cleanup.push({kind:'zero_fixture_residue',passed:true});
    }catch(error){
      cleanupPassed=false;
      evidence.cleanup.push({kind:'zero_fixture_residue',passed:false,error:error instanceof Error?error.message:String(error)});
    }
    evidence.cleanupPassed=cleanupPassed;
    evidence.completedAt=new Date().toISOString();
    evidence.passed=!fatal&&cleanupPassed;
    if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);
    await mkdir(DIR,{recursive:true});
    await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
  }
  if(fatal)throw fatal;
  if(!evidence.cleanupPassed)throw new Error('PHASE122_FIXTURE_CLEANUP_FAILED');
  return {passed:true,checks:evidence.checks.length,cleanupPassed:true};
}
