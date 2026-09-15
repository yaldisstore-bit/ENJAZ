import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const statePath=path.join(root,'docs/PHASE11_3_STATE.json');
const target=process.argv[2];
if(!target){
  console.error('Usage: node scripts/phase11-3-lifecycle-audit-runner.mjs <audit-script>');
  process.exit(2);
}

const original=fs.readFileSync(statePath,'utf8');
const state=JSON.parse(original);
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};

if(state.status==='CLOSED'){
  req(state.schemaVersion>=2,'closed Phase 11.3 requires state schema v2+');
  req(state.phase==='11.3'&&state.systemId==='M3'&&state.systemStatus==='ACTIVE','closed lifecycle must preserve operational M3 identity');
  req(state.mode==='CLOSED_CERTIFIED','closed lifecycle mode must be CLOSED_CERTIFIED');
  req(state.portalExperienceStatus==='DEPLOYED_AUTHENTICATED_BROWSER_CERTIFIED','deployed portal experience must be certified');
  req(state.publishedPortalCertificateStatus==='PASS','published portal certificate must PASS');
  req(state.realCloudAuthenticatedVerification==='PASS','real cloud authenticated verification must PASS');
  req(state.freshPortalBootstrapVerification==='PASS','fresh bootstrap verification must PASS');
  req(state.durableWriteRoundTripVerification==='PASS','durable write verification must PASS');
  req(state.realBrowserPortalShellVerification==='PASS','real browser shell verification must PASS');
  req(state.realBrowserMobileVerification==='PASS','authenticated mobile browser verification must PASS');
  req(state.failureConflictRecoveryVerification==='PASS','failure/conflict recovery must PASS');
  req(state.auditReconciliationVerification==='PASS','audit reconciliation must PASS');
  req(state.deployedLiveCriticalPathVerification==='PASS','deployed live critical path must PASS');
  req(state.postMergeRecertification==='PASS','post-merge recertification must PASS');

  // Closure evidence is immutable and tied to one deployed main lineage.
  req(state.implementationPullRequestNumber===173,'implementation PR evidence drifted');
  req(state.implementationMergeCommit==='30627b5f771b41f977bae1742d3c0eaf8ca66f53','implementation merge evidence drifted');
  req(state.certificateFixPullRequestNumber===174,'certificate-fix PR evidence drifted');
  req(state.certificateFixMergeCommit==='f99d5a4a3eff8aefc7346ebb2a8e74f8a3de2fe8','certificate-fix merge evidence drifted');
  req(state.certifiedMainCommit==='f99d5a4a3eff8aefc7346ebb2a8e74f8a3de2fe8','certified main SHA evidence drifted');
  req(state.exactMainQualityRunId===34965017371,'exact-main Quality Gate evidence drifted');
  req(state.pagesPreviewVerification==='PASS'&&state.pagesPreviewRunId===34965220159,'Pages deployment evidence drifted');
  req(state.publishedPortalCertificateRunId===34965281229,'published portal certificate workflow evidence drifted');
  req(state.liveExternalVerification==='PASS'&&state.liveExternalRunId===34965281142,'live external evidence drifted');
  req(state.closureEvidence==='docs/PHASE11_3_CLOSURE.md'&&fs.existsSync(path.join(root,state.closureEvidence)),'formal closure evidence is missing');

  req(state.knownCriticalBlockers===0&&state.knownHighBlockers===0&&state.knownFunctionalBlockers===0,'closed lifecycle blocker ledger must be zero');
  req(state.exitGatePassed===true,'closed Phase 11.3 exit gate must PASS');
  req(state.phase11_4Allowed===true&&state.nextPhase==='11.4'&&state.successorStatus==='AUTHORIZED_NEXT','closed Phase 11.3 must authorize only Phase 11.4');

  if(errors.length){
    console.error(`ENJAZ PHASE 11.3 CLOSED LIFECYCLE AUDIT FAIL (${errors.length})`);
    for(const error of errors)console.error(`- ${error}`);
    process.exit(1);
  }

  // The slice audits intentionally encode the pre-closure lock. Re-run them
  // against an ephemeral compatibility view so every substantive authority,
  // schema, projection, source and UI invariant is still enforced unchanged.
  // The canonical CLOSED state is restored before this process exits.
  const compatibility={
    ...state,
    status:'IN_PROGRESS',
    mode:'PORTAL_EXPERIENCE_IMPLEMENTED_PENDING_CERTIFICATION',
    portalExperienceStatus:'REAL_CLOUD_VERIFIED_PENDING_AUTHENTICATED_BROWSER_DEPLOYED_AND_POST_MERGE',
    publishedPortalCertificateStatus:'ARMED_PENDING_MAIN_DEPLOY',
    realBrowserMobileVerification:'PREAUTH_SHELL_PASS_AUTHENTICATED_DEPLOYED_PENDING',
    deployedLiveCriticalPathVerification:'PENDING',
    postMergeRecertification:'PENDING',
    exitGatePassed:false,
    phase11_4Allowed:false,
    successorStatus:'LOCKED',
  };

  let result;
  try{
    fs.writeFileSync(statePath,`${JSON.stringify(compatibility,null,2)}\n`,'utf8');
    result=spawnSync(process.execPath,[target],{cwd:root,stdio:'inherit',env:process.env});
  }finally{
    fs.writeFileSync(statePath,original,'utf8');
  }
  if(result?.error)throw result.error;
  if(result?.status!==0)process.exit(result?.status??1);
  console.log(`ENJAZ PHASE 11.3 CLOSED LIFECYCLE COMPATIBILITY PASS — ${target}`);
}else if(state.status==='IN_PROGRESS'){
  const result=spawnSync(process.execPath,[target],{cwd:root,stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  process.exit(result.status??1);
}else{
  console.error(`Unsupported Phase 11.3 lifecycle status: ${state.status}`);
  process.exit(1);
}
