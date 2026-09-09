import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=(path)=>fs.readFileSync(path,'utf8');
const state=JSON.parse(read('docs/PHASE8_6_STATE.json'));
const predecessor=JSON.parse(read('docs/PHASE8_5_STATE.json'));
const kickoff=read('docs/PHASE8_6_KICKOFF.md');
const service=read('src/features/command/commandCenter.ts');
const ui=read('src/ui-r2/command/LiveCommandCenterExperience.tsx');
const css=read('src/ui-r2/command/command-center.css');
const root=read('src/ui-r2/runtime/UiR2LiveRoot.tsx');
const production=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const tests=read('tests/commandCenter.test.ts');
const browser=read('tests-external/phase8-6-command-center.spec.cjs');
const must=(text,marker,label)=>{if(!text.includes(marker))throw new Error(`${label}: missing ${marker}`)};

if(predecessor.status!=='CLOSED'||predecessor.phase8_6Allowed!==true)throw new Error('Phase 8.5 is not a closed/authorized predecessor');
if(state.phase!=='8.6'||state.name!=='Global Command Center'||state.status!=='IN_PROGRESS')throw new Error('Phase 8.6 identity/status drift');
if(state.baseCommit!=='80fd1eda9c1c67ef43ec801ba4677dc32ab40c93')throw new Error('Phase 8.6 base drift');
if(state.authority.commandOwnedTables!=='NONE'||state.authority.commandOwnedRpc!=='NONE'||state.authority.commandWriteAuthority!=='none'||state.authority.financeWriteAuthority!=='none')throw new Error('Command authority boundary drift');
if(state.authority.executionModel!=='delegate_to_existing_domain_gateways_only'||state.authority.partialExecutiveSnapshotAllowed!==false)throw new Error('Command execution/fail-closed contract drift');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)throw new Error('Phase 8.6 raised the hard production budget');
if(state.phase8_7Allowed!==false||state.successorStatus!=='LOCKED')throw new Error('Phase 8.7 opened before Phase 8.6 closure');

for(const marker of ['Command-owned database tables','Command-owned write RPCs','partial executive snapshot','Phase 8.7 — Operations Zero-Escape Destruction Gate remains LOCKED'])must(kickoff,marker,'kickoff');
for(const marker of ['createCommandCenterOrchestrator','delegated_existing_domain_gateways_only','commandWriteAuthority: \'none\'','financeWriteAuthority: \'none\'','automation.decideApproval','workflow.transition','field.reassign','Promise.all'])must(service,marker,'command service');
for(const forbidden of ['EnjazSupabaseClient','.rpc(','postPayment(','reversePayment(','createCashbox(','createEngagement('])if(service.includes(forbidden))throw new Error(`command service owns forbidden authority: ${forbidden}`);
for(const marker of ['data-command-stage="8.6"','data-command-authority="delegated_existing_domain_gateways_only"','data-command-write-authority="none"','data-finance-write-authority="none"','decideApproval','transitionWorkflow','reassignField','لم يعرض مركز القيادة صورة جزئية'])must(ui,marker,'command UI');
for(const marker of ['LiveCommandCenterExperience','destinationId === \'command\'','<LiveCommandCenterExperience navigate={navigate} />'])must(root,marker,'live runtime');
if(root.includes("destinationId === 'workflow' || destinationId === 'command' || destinationId === 'risk'"))throw new Error('live runtime still routes Command through the R2.0-7 demo');
must(production,"../command/command-center.css",'production CSS');
for(const marker of ['delegated_existing_domain_gateways_only','automation approval is delegated','workflow transition preserves expected-stage','field reassignment preserves version','fails closed'])must(tests,marker,'command tests');
for(const marker of ['Global Command Center','data-command-stage="8.6"','1280','430','390','360','320'])must(browser,marker,'browser acceptance');

const literalColor=/(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/g;
const cssWithoutComments=css.replace(/\/\*[\s\S]*?\*\//g,'');
const illegal=cssWithoutComments.match(literalColor)??[];
if(illegal.length)throw new Error(`command CSS escaped locked palette: ${illegal.join(', ')}`);
for(const marker of ['var(--ez-r2-gradient-depth)','var(--ez-r2-surface-warm)','var(--ez-r2-interactive)','var(--ez-r2-accent)','var(--ez-r2-structure)','var(--ez-r2-touch-min)'])must(css,marker,'command CSS');

const changed=execFileSync('git',['diff','--name-only',`${state.baseCommit}...HEAD`],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const path of changed){
  if(path.startsWith('database/migrations/')||path.startsWith('database/baseline/'))throw new Error(`Phase 8.6 may not create command-owned database authority: ${path}`);
}
console.log(`Phase 8.6 command center audit PASS — ${changed.length} changed paths checked`);
