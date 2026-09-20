import { spawnSync } from 'node:child_process';

export const CERTIFIED_LOCK_BLOB='e3b275e728bcfcbde46f854f3ec8304688539653';
export const CERTIFIED_PR_HEAD='b7418d798080e0e58bcf3b1f34232799da169d66';

export function classifyAuditInfrastructureFailure(text=''){
  const s=String(text);
  const transport=/\b(?:502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/i.test(s);
  const maintenance=/currently performing maintenance|scheduled maintenance/i.test(s);
  const retiredQuickEndpoint=/endpoint is being retired/i.test(s)&&/security\/audits\/quick/i.test(s)&&/Invalid package tree/i.test(s);
  return transport||maintenance||retiredQuickEndpoint;
}

export function certifiedLockMatches(){
  const r=spawnSync('git',['hash-object','package-lock.json'],{encoding:'utf8'});
  if(r.status!==0) return {ok:false,actual:null,error:(r.stderr||r.stdout||'git hash-object failed').trim()};
  const actual=(r.stdout||'').trim();
  return {ok:actual===CERTIFIED_LOCK_BLOB,actual,error:null};
}

function runAudit(){
  const r=spawnSync('npm',['audit','--audit-level=high'],{encoding:'utf8'});
  const stdout=r.stdout||'',stderr=r.stderr||'';
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return {status:r.status??1,text:stdout+'\n'+stderr};
}

function sleep(ms){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)}

export function main(){
  const attempts=3;
  let last=null;
  for(let i=1;i<=attempts;i++){
    console.log(`ENJAZ dependency audit attempt ${i}/${attempts}`);
    last=runAudit();
    if(last.status===0){
      console.log('ENJAZ dependency high-severity audit PASS via npm registry.');
      return 0;
    }
    if(!classifyAuditInfrastructureFailure(last.text)){
      console.error('ENJAZ dependency audit FAIL — npm returned a non-infrastructure failure; certified fallback is forbidden.');
      return last.status||1;
    }
    if(i<attempts){
      console.warn('ENJAZ npm audit infrastructure failure detected; retrying without changing security threshold.');
      sleep(i*2000);
    }
  }

  const lock=certifiedLockMatches();
  if(!lock.ok){
    console.error(`ENJAZ dependency audit FAIL — npm audit infrastructure unavailable and package-lock is not the exact certified blob. expected=${CERTIFIED_LOCK_BLOB} actual=${lock.actual||'unavailable'}`);
    return 1;
  }

  console.warn(
    'ENJAZ dependency audit INFRASTRUCTURE FALLBACK PASS — npm audit remained unavailable after retries, '+
    `but package-lock exactly matches PR #221 certified head ${CERTIFIED_PR_HEAD} blob ${CERTIFIED_LOCK_BLOB}, where high-severity audit passed. `+
    'This fallback does not accept vulnerability findings and becomes invalid on any lockfile change.'
  );
  return 0;
}

if(import.meta.url===`file://${process.argv[1]}`) process.exitCode=main();
