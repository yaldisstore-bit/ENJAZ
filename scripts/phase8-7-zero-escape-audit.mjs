import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const state=JSON.parse(read('docs/PHASE8_7_STATE.json'));
const kickoff=read('docs/PHASE8_7_KICKOFF.md');
const tests=read('tests/phase8-7-operations-zero-escape.test.ts');
const offline=read('src/features/field-operations/fieldOperationsOfflineQueue.ts');
const intakeRateRepair=read('database/migrations/phase_8_7_intake_rate_limit_serialization.sql');
const fail=(m)=>{throw new Error(`Phase 8.7 Zero-Escape audit: ${m}`)};
const must=(text,marker,label)=>{if(!text.includes(marker))fail(`${label} missing ${marker}`)};

execFileSync(process.execPath,['scripts/phase8-6-closure-audit.mjs'],{stdio:'inherit'});

if(state.phase!=='8.7'||state.name!=='Operations Zero-Escape Destruction Gate')fail('identity drift');
if(state.status!=='IN_PROGRESS')fail('Phase 8.7 must remain IN_PROGRESS before full closure evidence');
if(state.baseCommit!=='cb6449428e0ed9490af2758beac12692631b8f8b')fail('base commit drift');
if(state.implementationBranch!=='phase8-7-operations-zero-escape')fail('implementation branch drift');
if(state.predecessor?.phase!=='8.6'||state.predecessor?.requiredStatus!=='CLOSED'||state.predecessor?.requiredAuthorization!=='phase8_7Allowed=true')fail('predecessor contract drift');
if(state.mode!=='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY')fail('mode drift');
if(state.newFeatureAuthorityAllowed!==false||state.newDatabaseTablesAllowed!==false||state.newWriteRpcAuthorityAllowed!==false)fail('Phase 8.7 cannot create new authority');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)fail('JavaScript budget drift');
if(state.phase9_1Allowed!==false||state.nextPhase!=='9.1'||state.successorStatus!=='LOCKED')fail('Phase 9.1 must remain locked');
if(state.exitGatePassed!==false||state.postMergeRecertification!=='PENDING')fail('premature Phase 8.7 closure');

const expectedSystems=['M1','M5','M6','M17','M15_PHASE8_PORTION'];
if(JSON.stringify(state.systemsUnderGate)!==JSON.stringify(expectedSystems))fail('systems-under-gate drift');
const expectedDimensions=['repeated_triggers','stale_transitions','conflicting_actors','large_histories','field_offline_recovery','intake_abuse','branch_team_permission_boundaries','automation_failure_isolation'];
if(JSON.stringify(state.destructionDimensions)!==JSON.stringify(expectedDimensions))fail('destruction dimensions drift');

for(const marker of [
  '**Status: IN PROGRESS**',
  'not a feature-delivery phase',
  'repeated triggers',
  'stale transitions',
  'conflicting actors',
  'large histories',
  'field offline recovery',
  'intake abuse',
  'branch/team permission boundaries',
  'automation failure isolation',
  'M1 — Government Procedure Operating System',
  'M5 — Field Operations / Runner Mode',
  'M6 — Service Catalog, CRM & Commercial Intake',
  'M17 — Smart Intake Forms & Secure Submission Links',
  'M15 — Phase-8 organizational portion',
  'Phase 9.1 — Smart Risk Engine remains LOCKED'
])must(kickoff,marker,'kickoff');

for(const marker of [
  'M5 corruption guard',
  'unknown offline operation kind is never replayed or silently deleted',
  'M1 repeated transition',
  'M1 stale transition',
  'M1 large history',
  'automation failure isolation',
  'M17 abuse boundary',
  'M6 replayed conversion',
  'M15 source-less inherited workforce permission',
  'M15 stale ownership transfer'
])must(tests,marker,'destruction wave 1');

for(const marker of [
  "x.kind==='check_in'",
  "x.kind==='check_out'",
  "x.kind==='evidence'",
  "x.kind==='handoff'",
  "x.kind==='reassign'",
  'return knownKind&&'
])must(offline,marker,'M5 offline corruption repair');

for(const marker of [
  'create or replace function private.enforce_public_intake_rate_v1',
  'from public.intake_links l where l.id=p_link_id for update',
  "v_hour>=120",
  "v_recent>=4",
  "ENJAZ_INTAKE_RATE_LIMITED",
  'insert into public.intake_public_events(link_id,event_type)',
  'revoke all on function private.enforce_public_intake_rate_v1(uuid,text) from public,anon'
])must(intakeRateRepair,marker,'M17 concurrent abuse repair');

console.log('ENJAZ PHASE 8.7 ZERO-ESCAPE AUDIT PASS — Phase 8.6 closure preserved; Phase 9.1 locked; M1/M5/M6/M17/M15 destruction scope frozen; wave-1 regression, M5 unknown-kind fail-closed repair and M17 serialized rate decision repair present; 670000-byte budget unchanged.');
