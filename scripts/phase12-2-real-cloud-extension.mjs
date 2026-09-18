export async function verifyPhase122Context({ownerClient,ownerToken,workspaceId,edgeUrl,publishableKey}){
  const query='P122-NO-RESULT-'+Date.now();
  const response=await fetch(edgeUrl,{
    method:'POST',
    headers:{'content-type':'application/json',apikey:publishableKey,authorization:`Bearer ${ownerToken}`},
    body:JSON.stringify({workspaceId,requestId:crypto.randomUUID(),operation:'search',query}),
  });
  const data=await response.json().catch(()=>null);
  if(response.status!==200||data?.schema!=='enjaz.copilot.context.v1')throw new Error('PHASE122_CONTEXT_EDGE_FAILED');
  if(data?.result?.grounding?.authoritativeContextFound!==false)throw new Error('PHASE122_EMPTY_CONTEXT_NOT_FAIL_CLOSED');
  return {status:response.status,sourceCount:data.result.grounding.sourceCount};
}
