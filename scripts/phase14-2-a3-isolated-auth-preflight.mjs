import {mkdir,writeFile} from 'node:fs/promises';

const OUT='artifacts/phase14-2-a3/preflight.json';
const fail=(message,evidence)=>{
  evidence.passed=false;
  evidence.error=message;
  return mkdir('artifacts/phase14-2-a3',{recursive:true})
    .then(()=>writeFile(OUT,JSON.stringify(evidence,null,2)))
    .then(()=>{throw new Error(message)});
};
const env=name=>process.env[name]?.trim()||'';
const productionRef=env('PRODUCTION_PROJECT_REF');
const branchRef=env('ENJAZ_A3_BRANCH_REF');
const url=env('SUPABASE_URL').replace(/\/$/,'');
const publishable=env('SUPABASE_PUBLISHABLE_KEY');
const secret=env('SUPABASE_SECRET_KEY');
const databaseUrl=env('SUPABASE_DB_URL');
const evidence={
  schema:'enjaz.phase14-2.a3.preflight.v1',
  checkedAt:new Date().toISOString(),
  productionRef,
  branchRef,
  url,
  passed:false,
  checks:[]
};
const check=(ok,name)=>{
  evidence.checks.push({name,passed:Boolean(ok)});
  if(!ok) return fail('A3 preflight failed: '+name,evidence);
};

await check(env('ENJAZ_REAL_CLOUD_CONFIRM')==='YES','explicit_real_cloud_confirmation');
await check(env('ENJAZ_A3_ISOLATED_BRANCH_CONFIRM')==='YES','explicit_isolated_branch_confirmation');
await check(/^[a-z0-9]{20}$/.test(productionRef),'production_ref_format');
await check(/^[a-z0-9]{20}$/.test(branchRef),'branch_ref_format');
await check(branchRef!==productionRef,'production_target_denied');
await check(url===`https://${branchRef}.supabase.co`,'url_matches_isolated_branch');
await check(Boolean(publishable),'publishable_key_present');
await check(Boolean(secret),'secret_key_present');
await check(secret!==publishable,'secret_and_publishable_distinct');
await check(!secret.startsWith('sb_publishable_'),'secret_is_not_publishable_key');
await check(Boolean(databaseUrl),'database_url_present');
let databaseTargetMatches=false;
try {
  const parsed=new URL(databaseUrl);
  const username=decodeURIComponent(parsed.username);
  databaseTargetMatches=(parsed.protocol==='postgres:'||parsed.protocol==='postgresql:')
    && parsed.searchParams.get('sslmode')!=='disable'
    && (parsed.hostname===`db.${branchRef}.supabase.co`
      || username===`postgres.${branchRef}`
      || username.endsWith(`.${branchRef}`));
} catch {}
await check(databaseTargetMatches,'database_url_matches_isolated_branch');

evidence.passed=true;
await mkdir('artifacts/phase14-2-a3',{recursive:true});
await writeFile(OUT,JSON.stringify(evidence,null,2));
console.log('PASS 14.2 A3 isolated Supabase preflight');
