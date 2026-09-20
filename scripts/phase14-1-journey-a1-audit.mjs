import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const J14_IDS = Object.freeze([
  'J01_COMPANY','J02_TRANSACTION','J03_PROCEDURE','J04_FIELD','J05_FOLLOWUP',
  'J06_PAYMENT','J07_DOCUMENT','J08_CLIENT','J09_ARCHIVE','J10_GOVERNANCE','J11_ENGAGEMENT',
]);
export const N14_IDS = Object.freeze([
  'N01_CROSS_WORKSPACE','N02_SAME_WORKSPACE_ROLE','N03_IDENTITY_DRIFT','N04_STAGE_CONFLICT',
  'N05_OFFLINE_RETRY','N06_MONEY_REPLAY','N07_DOCUMENT_PROVENANCE','N08_CLIENT_PERMISSION',
  'N09_ARCHIVE_VISIBILITY','N10_UNMAPPED_LEGACY','N11_GOVERNANCE_EFFECTIVE_DATE',
  'N12_RETAINER_CONFLICT','N13_AUTH_EXPIRY','N14_ZERO_RESIDUE',
]);
export const REQUIRED_GUARDS = Object.freeze([
  'production destructive probes','new generic write authority',
  'automatic legacy repairs or inferred target IDs','closure from static source or mocks alone',
  'cross-domain shadow persistence','frozen client bundle budget increase',
]);
const ALLOWED_SOURCE_PATH=/^src\/features\/[a-z-]+\/[A-Za-z0-9]+\.ts$/;
const expectedPredecessor='0df2dd9d8c8ec232c7dd49a516da7a436224871a';

export function auditJourneyMatrix(matrix, readSource) {
  const problems=[];
  const check=(name,ok)=>{if(!ok) problems.push(name);};
  check('schema',matrix?.schema==='enjaz.phase14-1.cross-domain.a1-source-matrix.v1'&&matrix.phase==='14.1'&&matrix.slice==='A1_SOURCE_CONTRACT');
  check('no_new_authority',matrix?.authority==='EXISTING_SCOPED_DOMAIN_GATEWAYS_ONLY'&&matrix?.maxClientBudgetIncreaseBytes===0);
  check('journey_coverage',Array.isArray(matrix?.journey)&&matrix.journey.length===J14_IDS.length&&J14_IDS.every(id=>matrix.journey.some(x=>x.id===id)));
  check('journey_unique',new Set(matrix?.journey?.map(x=>x.id)??[]).size===J14_IDS.length);
  for (const step of matrix?.journey??[]) {
    if(!J14_IDS.includes(step.id)){problems.push('unexpected_step:'+step.id);continue;}
    check('source_location:'+step.id,typeof step.source==='string'&&ALLOWED_SOURCE_PATH.test(step.source)&&!step.source.includes('..'));
    check('source_symbol:'+step.id,typeof step.marker==='string'&&step.marker.length>=18&&/^(?:export |async )/.test(step.marker));
    check('source_domain:'+step.id,step.source?.startsWith('src/features/'+step.domain+'/'));
    check('evidence:'+step.id,Array.isArray(step.evidence)&&step.evidence.length>=2&&step.evidence.every(v=>typeof v==='string'&&v.length>=16));
    if (typeof step.source==='string'&&ALLOWED_SOURCE_PATH.test(step.source)&&typeof step.marker==='string') {
      try {check('real_source_marker:'+step.id,readSource(step.source).includes(step.marker));}
      catch {problems.push('missing_source:'+step.id);}
    }
  }
  check('negative_coverage',Array.isArray(matrix?.adversarialCases)&&matrix.adversarialCases.length===N14_IDS.length&&
    N14_IDS.every(id=>matrix.adversarialCases.some(x=>x.id===id)));
  check('negative_unique',new Set(matrix?.adversarialCases?.map(x=>x.id)??[]).size===N14_IDS.length);
  for(const item of matrix?.adversarialCases??[]){
    check('negative_contract:'+item.id,N14_IDS.includes(item.id)&&typeof item.expect==='string'&&item.expect.length>=28&&typeof item.scope==='string'&&item.scope.length>0);
  }
  check('guard_coverage',Array.isArray(matrix?.forbidden)&&matrix.forbidden.length===REQUIRED_GUARDS.length&&REQUIRED_GUARDS.every(g=>matrix.forbidden.includes(g)));
  check('certification_coverage',Array.isArray(matrix?.requiredCertification)&&matrix.requiredCertification.length===6&&
    matrix.requiredCertification.some(x=>x.includes('Real Cloud'))&&
    matrix.requiredCertification.some(x=>x.includes('Chromium'))&&
    matrix.requiredCertification.some(x=>x.includes('exact-main'))&&
    matrix.requiredCertification.some(x=>x.includes('formal closure')));
  return Object.freeze(problems);
}

export function auditPhase14State(s, predecessor, proof) {
  const problems=[];
  const check=(name,ok)=>{if(!ok)problems.push(name);};
  check('phase_identity',s.phase==='14.1'&&s.status==='IN_PROGRESS'&&s.currentSlice==='A2_LINKED_READ_PROOF');
  check('certified_predecessor',predecessor.phase==='13.5'&&predecessor.status==='CLOSED'&&
    predecessor.formalClosurePostMergeRecertification==='PASS'&&
    predecessor.formalClosureMergeCommit===expectedPredecessor&&
    predecessor.formalClosureExactMainWorkflowCount===43&&predecessor.formalClosureExactMainSuccessCount===43&&
    predecessor.formalClosureExactMainFailureCount===0&&predecessor.formalClosureExactMainPendingCount===0);
  check('exact_predecessor_lock',s.predecessorPhase==='13.5'&&s.predecessorStatus==='CLOSED'&&
    s.predecessorClosureMergeCommit===expectedPredecessor&&s.predecessorPostMergeStatus==='PASS'&&
    s.predecessorPostMergeWorkflowCount===43&&s.predecessorPostMergeSuccessCount===43&&
    s.predecessorPostMergeEvidence==='docs/PHASE13_5_POSTMERGE_RECERTIFICATION.md'&&
    proof.includes(expectedPredecessor)&&proof.includes('43/43 COMPLETED SUCCESS'));
  check('a1_only',s.sourceMatrix==='docs/PHASE14_1_JOURNEY_MATRIX.json'&&
    s.a1Status==='SOURCE_CERTIFIED_EXACT_PR_HEAD'&&
    s.a1ExactPrHead==='11a82fdc7ab61c0a9d9245dd67bff90b609dfd90'&&
    s.a1ExactPrHeadWorkflowCount===82&&s.a1ExactPrHeadSuccessCount===81&&
    s.a1ExactPrHeadExpectedSkipCount===1&&
    s.a1MergedMain==='665fcc63a5919e4ad80d0b01b8f54914d15bad0c'&&
    s.a1MergedMainWorkflowCount===36&&s.a1MergedMainSuccessCount===36&&
    s.a2SourceStatus==='IN_PROGRESS_UNCERTIFIED'&&
    s.a2RealCloudStatus==='NOT_STARTED'&&s.a3RealBrowserStatus==='NOT_STARTED');
  check('successor_locked',s.phase14_2Allowed===false&&s.successorStatus==='LOCKED'&&
    s.exitGatePassed===false&&s.closureDecision==='NOT_REQUESTED');
  check('safety_invariants',s.productionDestructiveTestingAllowed===false&&
    s.newGenericWriteRpcAuthorityAllowed===false&&s.shadowPersistenceAllowed===false&&
    s.automaticLegacyRepairAllowed===false&&s.inferredLegacyTargetIdsAllowed===false&&
    s.clientBudgetIncreaseAllowed===false&&s.isolatedCloudZeroResidueRequired===true&&
    s.realBrowserRequired===true&&s.exactMainDeployedLiveRequired===true);
  check('no_premature_clean_bill',s.knownCriticalDefects===null&&s.knownHighDefects===null&&s.knownFunctionalBlockers===null);
  return Object.freeze(problems);
}

if (process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(new URL('file://'+process.argv[1]))) {
  const read=p=>fs.readFileSync(p,'utf8');
  const matrix=JSON.parse(read('docs/PHASE14_1_JOURNEY_MATRIX.json'));
  const s=JSON.parse(read('docs/PHASE14_1_STATE.json'));
  const predecessor=JSON.parse(read('docs/PHASE13_5_STATE.json'));
  const proof=read('docs/PHASE13_5_POSTMERGE_RECERTIFICATION.md');
  const failures=[...auditJourneyMatrix(matrix,read),...auditPhase14State(s,predecessor,proof)];
  if(failures.length) {console.error('ENJAZ 14.1 A1 SOURCE CONTRACT FAIL: '+failures.join(', '));process.exitCode=1;}
  else console.log('ENJAZ 14.1 A1 SOURCE CONTRACT PASS — 11 scoped existing domain entry points / 14 adversarial obligations; no hosted E2E or phase closure claimed.');
}
