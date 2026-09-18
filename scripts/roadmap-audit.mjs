import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const exists=(p)=>fs.existsSync(new URL(p,root));
const json=(p)=>JSON.parse(read(p));
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme=read('README.md');
const major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const marker=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const checkOrder=(items,label)=>{let last=-1;for(const item of items){const pos=roadmap.indexOf(item);if(pos<0)errors.push(`${label}: missing ${item}`);else if(pos<=last)errors.push(`${label}: out of order ${item}`);last=Math.max(last,pos)}};
const closed=(path,label)=>{if(!exists(path)){errors.push(`${label} state missing: ${path}`);return null}const s=json(path);if(s.status!=='CLOSED'||s.exitGatePassed!==true)errors.push(`${label} must remain CLOSED with exitGatePassed=true`);for(const f of ['unresolvedDefectCount','criticalDefectCount','highDefectCount','functionalBlockerCount'])if(f in s&&s[f]!==0)errors.push(`${label} ${f} must remain zero`);return s};

checkOrder(['# Phase 0 — Product Freeze & Migration Contract','# Phase 1 — Engineering Foundation','# Phase 2 — ENJAZ Design System 1.0','# Phase 3 — Application Shell & Navigation','# Phase 4 — Home, Daily Work & Executive Overview','# Phase 5 — Transactions Core','# Phase 6 — Companies & People','# Phase 7 — Finance','# Phase 8 — Workflow, Automation & Operations','# Phase 9 — Risk, Governance & Intelligence','# Phase 10 — Documents, Vault, OCR & Reports','# Phase 11 — Notifications, Follow-ups, Client & Communications','# Phase 12 — ENJAZ AI & Knowledge Agent','# Phase 13 — Legacy Import & Reconciliation','# Phase 14 — Full-system Integration, API & Real E2E','# Phase 15 — Performance, Security, Reliability & Enterprise Controls','# Phase 16 — Final Visual & UX Destruction','# Phase 17 — Release Candidate & Production Validation','# Phase 18 — Final Delivery & Handoff'],'delivery phases');
checkOrder(['## 8.1 — Workflow Engine & Government Procedure OS — M1','## 8.2 — Automation Engine','## 8.3 — Operations Center + Field Operations — M5','## 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17','## 8.5 — Multi-Branch / Departments / Teams — M15 foundation','## 8.6 — Global Command Center','## 8.7 — Operations Zero-Escape Destruction Gate'],'Phase 8 sequence');
checkOrder(['## 9.1 — Smart Risk Engine','## 9.2 — Smart Saved Views & Cross-domain Search Intelligence','## 9.3 — Corporate Governance & Ownership Engine — M2','## 9.4 — Regulatory / Knowledge Base Engine — M8 foundation','## 9.5 — Business Intelligence & Forecasting Center — M13','## 9.6 — Process Mining & Predictive Operations — M18','## 9.7 — Intelligence Zero-Escape Gate'],'Phase 9 sequence');
for(const m of ['ENJAZ 1.0 — Delivered','Zero-Escape closure law for M1–M18','Current position — canonical reconciled state','Major-system anchor matrix','Gate Escape','## 9.6 — Process Mining & Predictive Operations — M18','Derive actual process paths from authoritative histories.','Detect bottlenecks, rework and delay patterns; prediction must expose confidence and evidence.'])marker(roadmap,m,'roadmap');

req(major.schemaVersion===2&&major.status==='GOVERNING_AMENDMENT','major-system registry must remain governing amendment schema v2');
req(major.majorSystemCount===18&&major.systems?.length===18,'major-system registry must contain exactly M1-M18');
req(major.closureGateProfile==='ZERO_ESCAPE_V1'&&major.closureAuthority==='deployed-merged-sha','major-system closure authority drifted');
req(major.closedPhasesReopened===false&&major.phaseOrderChanged===false,'major-system amendment must not silently reopen/reorder historical phases');
const names=new Map([['M1','Government Procedure Operating System'],['M2','Corporate Governance & Ownership Engine'],['M3','Client Portal'],['M4','Omnichannel Communications Hub'],['M5','ENJAZ Field Operations / Runner Mode'],['M6','Service Catalog, CRM & Commercial Intake'],['M7','Document Factory & Official Form Engine'],['M8','Regulatory / Knowledge Base Engine'],['M9','Agentic ENJAZ Copilot'],['M10','Scheduling, Appointments & Deadline Engine'],['M11','Integration Platform / API / Webhooks'],['M12','Compliance, Audit & Evidence Center'],['M13','Business Intelligence & Forecasting Center'],['M14','Backup, Restore & Workspace Portability'],['M15','Multi-Branch, Departments & Team Operating Model'],['M16','Engagements, Contracts & Retainers'],['M17','Smart Intake Forms & Secure Submission Links'],['M18','Process Mining & Predictive Operations']]);
for(const [id,name] of names){const s=major.systems.find(x=>x.id===id);req(s?.name===name,`major-system registry drifted: ${id}`);marker(roadmap,`${id} | ${name}`,'roadmap anchor matrix');marker(readme,`**${id} — ${name}**`,'README major systems')}
for(const id of ['M1','M5','M6']){const s=major.systems.find(x=>x.id===id);req(s?.status==='CLOSURE_CANDIDATE',`${id} must remain CLOSURE_CANDIDATE`);req(typeof s?.closureEvidence==='string'&&s.closureEvidence.startsWith('docs/'),`${id} closure candidate must retain evidence`)}
const m2=major.systems.find(x=>x.id==='M2');
if(m2?.status==='CLOSURE_CANDIDATE'){
  req(typeof m2.closureEvidence==='string'&&m2.closureEvidence.startsWith('docs/'),'M2 closure candidate must retain evidence');
}else if(m2?.status==='CLOSED'){
  req(m2.anchors?.join(',')==='9','M2 CLOSED anchor must remain Phase 9 only');
  req(m2.closureEvidence==='docs/M2_ZERO_ESCAPE_CLOSURE.json'&&exists(m2.closureEvidence),'M2 CLOSED must point to machine-readable Zero-Escape evidence');
  if(exists(m2.closureEvidence)){
    const e=json(m2.closureEvidence);
    req(e.gateProfile==='ZERO_ESCAPE_V1'&&e.systemId==='M2'&&e.status==='CLOSED','M2 Zero-Escape evidence identity drifted');
    req(e.candidateHead==='84331768024d1aef2eed83444a9c5aff8789e875'&&e.mergeCommit==='e8992650afb7bd3bd5c47770d0b2d752cdd0488e','M2 closure SHA lineage drifted');
    for(const gate of ['preMergeDeterministic','realCloudAuthenticated','freshWorkspaceBootstrap','durableWriteRoundTrip','permissionMatrix','realBrowserMobile','failureConflictRecovery','auditReconciliation','deployedLiveCriticalPath','postMergeRecertification'])req(['PASS','COMPLETE'].includes(e[gate]),`M2 ${gate} must remain PASS`);
    req(e.unresolvedCriticalCount===0&&e.unresolvedHighCount===0&&e.unresolvedFunctionalBlockerCount===0,'M2 CLOSED blocker ledger must remain zero');
    req(Array.isArray(e.workflowEvidence)&&e.workflowEvidence.length>0&&Array.isArray(e.liveEvidence)&&e.liveEvidence.length>0,'M2 CLOSED evidence arrays must remain populated');
  }
}else req(false,'M2 must remain CLOSURE_CANDIDATE or validly CLOSED under ZERO_ESCAPE_V1');
for(const id of ['M13','M15','M17','M18'])req(major.systems.find(x=>x.id===id)?.status==='ACTIVE',`${id} must remain ACTIVE while governing anchors are open`);
const p125=exists('docs/PHASE12_5_STATE.json')?json('docs/PHASE12_5_STATE.json'):null;
const phase125Closed=p125?.status==='CLOSED'&&p125?.closureDecision==='PASS'&&p125?.exitGatePassed===true;
const m8=major.systems.find(x=>x.id==='M8'),m13=major.systems.find(x=>x.id==='M13'),m18=major.systems.find(x=>x.id==='M18');
if(phase125Closed) req(m8?.status==='CLOSED'&&m8?.anchors?.join(',')==='9,12'&&m8?.closureEvidence==='docs/M8_ZERO_ESCAPE_CLOSURE.json'&&exists(m8.closureEvidence),'M8 Phase 12.5 closure drifted'); else req(m8?.status==='ACTIVE'&&m8?.anchors?.join(',')==='9,12'&&m8?.closureEvidence===null,'M8 anchors/global closure drifted');
req(m13?.anchors?.join(',')==='9,15'&&m13?.closureEvidence===null,'M13 anchors/global closure drifted');
req(m18?.anchors?.join(',')==='9,15'&&m18?.closureEvidence===null,'M18 anchors/global closure drifted');
for(const id of ['M11','M12','M14'])req(major.systems.find(x=>x.id===id)?.status==='PLANNED',`${id} must remain PLANNED`);
const m3=major.systems.find(x=>x.id==='M3');
if(exists('docs/PHASE11_3_STATE.json')){
  const p112=closed('docs/PHASE11_2_STATE.json','Phase 11.2');
  const p113=json('docs/PHASE11_3_STATE.json');
  req(m3?.status==='ACTIVE'&&m3?.anchors?.join(',')==='11'&&m3?.closureEvidence===null,'M3 must be ACTIVE with Phase 11 anchor and no premature closure evidence once Phase 11.3 opens');
  req(p112?.phase11_3Allowed===true&&p112?.nextPhase==='11.3'&&p112?.successorStatus==='AUTHORIZED_NEXT','M3 activation requires formal Phase 11.2 authorization');
  req(p113.phase==='11.3'&&p113.systemId==='M3'&&p113.systemStatus==='ACTIVE'&&['IN_PROGRESS','CLOSED'].includes(p113.status),'M3 ACTIVE requires a valid Phase 11.3 lifecycle state');
  if(p113.status==='IN_PROGRESS')req(p113.exitGatePassed===false&&p113.phase11_4Allowed===false&&p113.nextPhase==='11.4'&&p113.successorStatus==='LOCKED','Open Phase 11.3 must keep 11.4 locked');
  else req(p113.exitGatePassed===true&&p113.phase11_4Allowed===true&&p113.nextPhase==='11.4'&&p113.successorStatus==='AUTHORIZED_NEXT','Closed Phase 11.3 may authorize only 11.4 after M3 closure requirements pass');
}else req(m3?.status==='PLANNED','M3 must remain PLANNED before Phase 11.3 lifecycle state exists');
const m4=major.systems.find(x=>x.id==='M4');
if(exists('docs/PHASE11_4_STATE.json')){
  const p113=closed('docs/PHASE11_3_STATE.json','Phase 11.3');
  const p114=json('docs/PHASE11_4_STATE.json');
  req(m4?.status==='ACTIVE'&&m4?.anchors?.join(',')==='11'&&m4?.closureEvidence===null,'M4 must be ACTIVE with Phase 11 anchor and no premature closure evidence once Phase 11.4 opens');
  req(p113?.phase11_4Allowed===true&&p113?.nextPhase==='11.4'&&p113?.successorStatus==='AUTHORIZED_NEXT','M4 activation requires formal Phase 11.3 authorization');
  req(p114.phase==='11.4'&&p114.systemId==='M4'&&p114.systemStatus==='ACTIVE'&&['IN_PROGRESS','CLOSED'].includes(p114.status),'M4 ACTIVE requires a valid Phase 11.4 lifecycle state');
  if(p114.status==='IN_PROGRESS')req(p114.exitGatePassed===false&&p114.phase11_5Allowed===false&&p114.nextPhase==='11.5'&&p114.successorStatus==='LOCKED','Open Phase 11.4 must keep 11.5 locked');
  else req(p114.exitGatePassed===true&&p114.phase11_5Allowed===true&&p114.nextPhase==='11.5'&&['AUTHORIZED','AUTHORIZED_NEXT'].includes(p114.successorStatus),'Closed Phase 11.4 may authorize only 11.5 after M4 exit requirements pass');
}else req(m4?.status==='PLANNED','M4 must remain PLANNED before Phase 11.4 lifecycle state exists');
const m10=major.systems.find(x=>x.id==='M10');
if(exists('docs/PHASE11_5_STATE.json')){
  const p114=closed('docs/PHASE11_4_STATE.json','Phase 11.4');
  const p115=json('docs/PHASE11_5_STATE.json');
  req(m10?.status==='ACTIVE'&&m10?.anchors?.join(',')==='11'&&m10?.closureEvidence===null,'M10 must be ACTIVE with Phase 11 anchor and no premature closure evidence once Phase 11.5 opens');
  req(p114?.phase11_5Allowed===true&&p114?.nextPhase==='11.5'&&['AUTHORIZED','AUTHORIZED_NEXT'].includes(p114?.successorStatus),'M10 activation requires formal Phase 11.4 authorization');
  req(p115.phase==='11.5'&&p115.systemId==='M10'&&p115.systemStatus==='ACTIVE'&&['IN_PROGRESS','CLOSED'].includes(p115.status),'M10 ACTIVE requires a valid Phase 11.5 lifecycle state');
  if(p115.status==='IN_PROGRESS')req(p115.exitGatePassed===false&&p115.phase11_6Allowed===false&&p115.nextPhase==='11.6'&&p115.successorStatus==='LOCKED','Open Phase 11.5 must keep 11.6 locked');
  else req(p115.exitGatePassed===true&&p115.phase11_6Allowed===true&&p115.nextPhase==='11.6'&&['AUTHORIZED','AUTHORIZED_NEXT'].includes(p115.successorStatus),'Closed Phase 11.5 may authorize only 11.6 after M10 exit requirements pass');
}else req(m10?.status==='PLANNED','M10 must remain PLANNED before Phase 11.5 lifecycle state exists');
const m9=major.systems.find(x=>x.id==='M9');
if(exists('docs/PHASE12_3_STATE.json')){
  const p122=closed('docs/PHASE12_2_STATE.json','Phase 12.2');
  const p123=json('docs/PHASE12_3_STATE.json');
  if(phase125Closed) req(m9?.status==='CLOSED'&&m9?.anchors?.join(',')==='12'&&m9?.closureEvidence==='docs/M9_ZERO_ESCAPE_CLOSURE.json'&&exists(m9.closureEvidence),'M9 Phase 12.5 closure drifted'); else req(m9?.status==='ACTIVE'&&m9?.anchors?.join(',')==='12'&&m9?.closureEvidence===null,'M9 must remain ACTIVE until Phase 12.5 closure');
  req(p122?.phase12_3Allowed===true&&p122?.successorPhase==='12.3'&&p122?.successorStatus==='AUTHORIZED_NEXT','M9 activation requires formal Phase 12.2 authorization');
  req(p123.phase==='12.3'&&p123.majorSystem==='M9'&&p123.majorSystemStatus==='ACTIVE'&&['IN_PROGRESS','CLOSED'].includes(p123.status),'M9 ACTIVE requires a valid Phase 12.3 lifecycle state');
  if(p123.status==='IN_PROGRESS')req(p123.exitGatePassed===false&&p123.phase12_4Allowed===false&&p123.successorPhase==='12.4'&&p123.successorStatus==='LOCKED','Open Phase 12.3 must keep 12.4 locked');
  else req(p123.exitGatePassed===true&&p123.phase12_4Allowed===true&&p123.successorPhase==='12.4'&&p123.successorStatus==='AUTHORIZED_NEXT','Closed Phase 12.3 may authorize only 12.4 after M9 exit requirements pass');
}else req(m9?.status==='PLANNED','M9 must remain PLANNED before Phase 12.3 lifecycle state exists');
const m16=major.systems.find(x=>x.id==='M16');
if(exists('docs/PHASE10_5_STATE.json')){
  const p104=closed('docs/PHASE10_4_STATE.json','Phase 10.4');
  const p105=json('docs/PHASE10_5_STATE.json');
  req(m16?.status==='ACTIVE'&&m16?.anchors?.join(',')==='7,10,11'&&m16?.closureEvidence===null,'M16 must be ACTIVE with anchors 7,10,11 and no global closure evidence during Phase 10.5');
  req(p104?.phase10_5Allowed===true&&p104?.nextPhase==='10.5'&&p104?.successorStatus==='AUTHORIZED','M16 activation requires formal Phase 10.4 authorization');
  req(p105.phase==='10.5'&&p105.majorSystem==='M16'&&p105.majorSystemStatus==='ACTIVE'&&p105.globalM16ClosureAllowed===false&&['IN_PROGRESS','CLOSED'].includes(p105.status),'M16 ACTIVE requires a valid Phase 10.5 lifecycle state and global closure must remain forbidden');
  if(p105.status==='IN_PROGRESS')req(p105.exitGatePassed===false&&p105.phase10_6Allowed===false&&p105.nextPhase==='10.6'&&p105.successorStatus==='LOCKED','Open Phase 10.5 must keep 10.6 locked');
  else req(p105.exitGatePassed===true&&p105.phase10_6Allowed===true&&p105.nextPhase==='10.6'&&p105.successorStatus==='AUTHORIZED','Closed Phase 10.5 may authorize only 10.6 while M16 remains globally ACTIVE');
}else req(m16?.status==='PLANNED','M16 must remain PLANNED before Phase 10.5 lifecycle state exists');
const m7=major.systems.find(x=>x.id==='M7');
if(exists('docs/PHASE10_3_STATE.json')){
  const p102=closed('docs/PHASE10_2_STATE.json','Phase 10.2');
  const p103=json('docs/PHASE10_3_STATE.json');
  req(m7?.status==='ACTIVE'&&m7?.anchors?.join(',')==='10'&&m7?.closureEvidence===null,'M7 must be ACTIVE only while Phase 10.3 owns its Phase 10 anchor');
  req(p102?.phase10_3Allowed===true&&p102?.nextPhase==='10.3'&&p102?.successorStatus==='AUTHORIZED','M7 activation requires formal Phase 10.2 authorization');
  req(p103.phase==='10.3'&&p103.majorSystem==='M7'&&p103.majorSystemStatus==='ACTIVE'&&['IN_PROGRESS','CLOSED'].includes(p103.status),'M7 ACTIVE requires a valid Phase 10.3 lifecycle state');
  if(p103.status==='IN_PROGRESS')req(p103.exitGatePassed===false&&p103.phase10_4Allowed===false&&p103.nextPhase==='10.4'&&p103.successorStatus==='LOCKED','Open Phase 10.3 must keep 10.4 locked');
  else req(p103.exitGatePassed===true&&p103.phase10_4Allowed===true&&p103.nextPhase==='10.4'&&p103.successorStatus==='AUTHORIZED','Closed Phase 10.3 must authorize only 10.4');
}else req(m7?.status==='PLANNED','M7 must remain PLANNED before Phase 10.3 lifecycle state exists');

for(const [p,l] of [['docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json','Phase 5.5'],['docs/PHASE6_1_COMPANIES_STATE.json','Phase 6.1'],['docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json','Phase 6.2'],['docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json','Phase 6.3'],['docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json','Phase 6.4'],['docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json','Phase 7.1'],['docs/PHASE7_2_STATE.json','Phase 7.2'],['docs/PHASE7_3_STATE.json','Phase 7.3'],['docs/PHASE7_4_STATE.json','Phase 7.4'],['docs/PHASE7_5_STATE.json','Phase 7.5'],['docs/PHASE8_1_STATE.json','Phase 8.1'],['docs/PHASE8_2_STATE.json','Phase 8.2'],['docs/PHASE8_3_STATE.json','Phase 8.3'],['docs/PHASE8_4_STATE.json','Phase 8.4'],['docs/PHASE8_5_STATE.json','Phase 8.5'],['docs/PHASE8_6_STATE.json','Phase 8.6'],['docs/PHASE8_7_STATE.json','Phase 8.7'],['docs/PHASE9_1_STATE.json','Phase 9.1'],['docs/PHASE9_2_STATE.json','Phase 9.2'],['docs/PHASE9_3_STATE.json','Phase 9.3']])closed(p,l);
const p94=closed('docs/PHASE9_4_STATE.json','Phase 9.4'),p95=closed('docs/PHASE9_5_STATE.json','Phase 9.5');
req(p94?.phase9_5Allowed===true&&p94?.nextPhase==='9.5'&&p94?.successorStatus==='AUTHORIZED','Phase 9.4 successor evidence must remain 9.5');
req(p94?.majorSystem?.id==='M8'&&p94?.majorSystem?.status==='ACTIVE'&&p94?.majorSystem?.globalClosureAllowed===false,'Phase 9.4 must preserve M8 globally open');
req(p94?.postMergeRecertification?.workflowCount===23&&p94?.postMergeRecertification?.successCount===23&&p94?.postMergeRecertification?.failureCount===0,'Phase 9.4 exact-main 23/23 evidence drifted');
req(p94?.publishedLiveCertification?.pagesPreviewRunId===34677705458&&p94?.publishedLiveCertification?.liveExternalRunId===34677729775,'Phase 9.4 published evidence drifted');
req(p95?.phase9_6Allowed===true&&p95?.nextPhase==='9.6'&&p95?.successorStatus==='AUTHORIZED','Phase 9.5 successor evidence must authorize 9.6');
req(p95?.majorSystem?.id==='M13'&&p95?.majorSystem?.status==='ACTIVE'&&p95?.majorSystem?.anchors?.join(',')==='9,15'&&p95?.majorSystem?.globalClosureAllowed===false,'Phase 9.5 must preserve M13 globally open');
req(p95?.postMergeRecertification?.workflowCount===25&&p95?.postMergeRecertification?.successCount===25&&p95?.postMergeRecertification?.failureCount===0,'Phase 9.5 exact-main 25/25 evidence drifted');
req(p95?.publishedLiveCertification?.status==='PASS'&&p95?.publishedLiveCertification?.directLoadReloadTestsPassed===7,'Phase 9.5 published-live 7/7 evidence drifted');
for(const p of ['docs/PHASE9_4_CLOSURE.md','docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md','docs/PHASE9_5_CLOSURE.md','docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md'])req(exists(p),`missing closure evidence: ${p}`);

req(exists('docs/PHASE9_6_STATE.json')&&exists('docs/PHASE9_6_KICKOFF.md'),'Phase 9.6 kickoff/state must exist once M18 is ACTIVE');
if(exists('docs/PHASE9_6_STATE.json')){const p96=json('docs/PHASE9_6_STATE.json'),t=p96.projectQualityConstitution?.tracks||{};req(p96.phase==='9.6'&&['IN_PROGRESS','CLOSED'].includes(p96.status),'Phase 9.6 lifecycle invalid');req(p96.baseCommit==='295ad9dd308e391e7d92b1e27de74c859b0a20b1','Phase 9.6 base must remain formal Phase 9.5 closure SHA');req(p96.majorSystem?.id==='M18'&&p96.majorSystem?.status==='ACTIVE'&&p96.majorSystem?.anchors?.join(',')==='9,15'&&p96.majorSystem?.globalClosureAllowed===false,'Phase 9.6 M18 lifecycle drifted');req(p96.javascriptBudgetBytes===670000&&p96.budgetIncreaseAllowed===false,'Phase 9.6 must preserve 670000-byte ceiling');if(p96.status==='IN_PROGRESS'){req(p96.exitGatePassed===false&&p96.phase9_7Allowed===false&&p96.nextPhase===null&&p96.successorStatus==='LOCKED','Open Phase 9.6 must keep 9.7 locked');req(t.product==='IN_PROGRESS'&&['NOT_STARTED','IN_PROGRESS'].includes(t.uiUx)&&t.engineering==='IN_PROGRESS'&&['NOT_STARTED','IN_PROGRESS'].includes(t.certification),'Open Phase 9.6 quality tracks drifted');marker(readme,'الحالة الرسمية: **Phase 9.6 — Process Mining & Predictive Operations — M18 🟡 IN PROGRESS — FOUNDATION**','README');marker(readme,'**Phase 9.6 — Process Mining & Predictive Operations — M18: 🟡 IN PROGRESS — FOUNDATION.**','README')}else{req(p96.exitGatePassed===true&&p96.phase9_7Allowed===true&&p96.nextPhase==='9.7'&&p96.successorStatus==='AUTHORIZED','Closed Phase 9.6 must authorize only 9.7');req(t.product==='PASS'&&t.uiUx==='PASS'&&t.engineering==='PASS'&&t.certification==='PASS','Closed Phase 9.6 requires four PASS tracks')}}

if(exists('docs/PHASE9_7_STATE.json')){
  const p97=json('docs/PHASE9_7_STATE.json'),t=p97.projectQualityConstitution?.tracks||{};
  req(p97.phase==='9.7'&&['IN_PROGRESS','CLOSED'].includes(p97.status),'Phase 9.7 lifecycle invalid');
  req(p97.baseCommit==='bcb8e697fa7457e216036ae321b8eddac2050b1b','Phase 9.7 base drifted');
  req(p97.javascriptBudgetBytes===670000&&p97.totalJavascriptBudgetBytes===760000&&p97.cssBudgetBytes===180000&&p97.budgetIncreaseAllowed===false,'Phase 9.7 governed budgets drifted');
  if(p97.status==='CLOSED'){
    req(p97.exitGatePassed===true&&p97.phase10_1Allowed===true&&p97.nextPhase==='10.1'&&p97.successorStatus==='AUTHORIZED','Closed Phase 9.7 must authorize only 10.1');
    req(t.product==='PASS'&&t.uiUx==='PASS'&&t.engineering==='PASS'&&t.certification==='PASS','Closed Phase 9.7 requires four PASS tracks');
    req(p97.certification?.exactMainWorkflowCount===31&&p97.certification?.exactMainSuccessCount===31&&p97.certification?.exactMainFailureCount===0&&p97.certification?.exactMainQueuedCount===0&&p97.certification?.exactMainInProgressCount===0,'Phase 9.7 exact-main closure evidence drifted');
    for(const p of ['docs/PHASE9_7_CLOSURE.md','docs/PHASE9_7_POSTMERGE_RECERTIFICATION.md','docs/M2_ZERO_ESCAPE_CLOSURE.json'])req(exists(p),`missing Phase 9.7/M2 closure evidence: ${p}`);
  }else{
    req(p97.exitGatePassed===false&&p97.phase10_1Allowed===false&&p97.nextPhase==='10.1'&&p97.successorStatus==='LOCKED','Open Phase 9.7 must keep 10.1 locked');
  }
}

if(errors.length){console.error(`ENJAZ ROADMAP AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}else console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 9.7 lifecycle is Zero-Escape governed; M2 may close only with machine evidence; M3, M4 and M10 activate only through formal Phase 11 predecessor authority; M9 activates only through formal Phase 12.2 authority and open M9 keeps Phase 12.4 locked; M8/M13/M18 remain ACTIVE for later anchors; M7 and M16 activation are locked to formal predecessor authority, and M16 cannot globally close in Phase 10.5.');
