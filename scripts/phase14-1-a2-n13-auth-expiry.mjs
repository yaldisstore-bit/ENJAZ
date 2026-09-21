// N13 hosted Auth expiry boundary + safe resumption.
// This uses a real session from the isolated lab. It advances only the local
// client clock beyond the session's signed expiry after revoking that session's
// refresh capability, then proves the SDK drops auth before a fresh login.
function payloadOf(token) {
  const parts=String(token??'').split('.');
  if(parts.length!==3) throw Error('N13_TOKEN_SHAPE_INVALID');
  return JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
}

export async function checkAuthExpiryResumption({
  owner,admin,makeClient,workspaceId,companyId,transactionId,readCount,verify,
}) {
  const ws=workspaceId;
  const probe=makeClient();
  const login=await probe.auth.signInWithPassword({email:owner.email,password:owner.password});
  const session=login.data?.session;
  if(login.error||!session) throw Error('N13_DEDICATED_SESSION_LOGIN_FAILED');

  const payload=payloadOf(session.access_token);
  const exp=Number(payload.exp),iat=Number(payload.iat);
  verify(Number.isInteger(exp)&&Number.isInteger(iat)&&exp>iat&&
    payload.sub===owner.id&&typeof payload.session_id==='string',
    'N13_REAL_HOSTED_SESSION_HAS_SIGNED_EXP_AND_SESSION_ID');

  const revoked=await admin.auth.admin.signOut(session.access_token,'local');
  verify(!revoked.error,'N13_DEDICATED_SESSION_REFRESH_REVOKED');

  const realNow=Date.now;
  const companiesBefore=await readCount('companies',ws);
  let refreshResult,localAfter,denied;
  try {
    Date.now=()=>((exp+60)*1000);
    refreshResult=await probe.auth.setSession({
      access_token:session.access_token,
      refresh_token:session.refresh_token,
    });
    localAfter=await probe.auth.getSession();
    denied=await probe.from('companies').insert({
      workspace_id:ws,legal_name:'DENIED N13 expired session company',capital:1,
    }).select('id');
  } finally {
    Date.now=realNow;
  }

  verify(Boolean(refreshResult?.error)&&!localAfter?.data?.session&&
    (Boolean(denied?.error)||denied?.data?.length===0)&&
    await readCount('companies',ws)===companiesBefore,
    'N13_EXPIRED_REVOKED_SESSION_FAILS_CLOSED_NO_MUTATION');

  const resumed=makeClient();
  const relogin=await resumed.auth.signInWithPassword({email:owner.email,password:owner.password});
  verify(!relogin.error&&relogin.data?.session?.user?.id===owner.id,
    'N13_FRESH_REAUTHENTICATION_SUCCEEDS');

  const [company,transaction]=await Promise.all([
    resumed.from('companies').select('id,workspace_id').eq('id',companyId).single(),
    resumed.from('transactions').select('id,workspace_id,company_id').eq('id',transactionId).single(),
  ]);
  verify(!company.error&&!transaction.error&&company.data?.id===companyId&&
    company.data?.workspace_id===ws&&transaction.data?.id===transactionId&&
    transaction.data?.workspace_id===ws&&transaction.data?.company_id===companyId,
    'N13_SAFE_RESUMPTION_RELOADS_SAME_DURABLE_SOURCE_GRAPH');

  verify(true,'N13_AUTH_EXPIRY_FAIL_CLOSED_SAFE_RESUMPTION_PASS');
}
