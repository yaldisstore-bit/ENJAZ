import fs from 'node:fs';

const mustReplace = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Phase 7.5 closure patch missing marker: ${label}`);
  return source.replace(before, after);
};
const write = (path, body) => fs.writeFileSync(path, body.endsWith('\n') ? body : `${body}\n`, 'utf8');

const state = {
  schemaVersion: 1,
  phase: '7.5',
  name: 'Finance Destruction & Reconciliation Gate',
  status: 'CLOSED',
  baseCommit: '75128eabda1c4a8d1b3b53504596a3d227d69874',
  productionJavaScriptBudget: 670000,
  scope: [
    'hugeValues','subCentUnsafeInputs','reversals','repeatedSubmit','networkUncertainty','staleState','partialHistory','sourceCapacityPressure','authoritativeReconciliation','realCloudFinanceCriticalPath','realBrowserFinanceCriticalPath','deployedLiveFinanceCriticalPath',
  ],
  implementationHead: 'c479af8341b9699baf639deabbd61d356ea01c4e',
  pullRequest: 105,
  preClosure: {
    workflowCount: 30, successCount: 30, failureCount: 0, inProgressCount: 0, queuedCount: 0, cancelledCount: 0,
    realChromium: 'PASS', dedicatedGateRunId: 34103255390, realBrowserRunId: 34103255198,
    productionJavaScriptBytes: 588688, productionJavaScriptBudget: 670000,
  },
  realCloudVerification: {
    status: 'COMPLETE', projectRef: 'juzxriirhkuzviwnhkbd', hardeningMigration: 'phase_7_5_payment_reversal_uniqueness', probeMigration: 'phase_7_5_live_finance_destruction_probe',
    authenticatedRoleSwitch: 'PASS', exactHugeValue: '9999999999999999.99', idempotentPaymentReplay: 'PASS', idempotencyConflict: 'PASS', idempotentReversalReplay: 'PASS', authoritativeReconciliation: 'PASS', duplicateReversalDatabaseGuard: 'PASS',
    postProbeCompanyCount: 0, postProbeTransactionCount: 0, postProbeHelperCount: 0, duplicateReversalGroupCount: 0,
    evidence: 'docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md',
  },
  mergeCommit: '761073812fc0e43f481ac20532ea6c10979d805d',
  postMergeRecertification: {
    required: true, status: 'COMPLETE', mainCommit: '761073812fc0e43f481ac20532ea6c10979d805d',
    workflowCount: 11, successCount: 11, failureCount: 0, inProgressCount: 0, queuedCount: 0, cancelledCount: 0,
    phaseGateRunId: 34103686407,
    pagesPreviewRunId: 34103737386, pagesPreview: 'SUCCESS', pagesBuild: 'SUCCESS', pagesDeploy: 'SUCCESS',
    realBrowserRunId: 34103686363, realBrowser: 'SUCCESS',
    liveExternalRunId: 34103828264, liveExternal: 'SUCCESS', publishedApplicationAttack: 'SUCCESS',
  },
  exitGatePassed: true,
  unresolvedDefectCount: 0,
  criticalDefectCount: 0,
  highDefectCount: 0,
  functionalBlockerCount: 0,
  phase8Allowed: true,
  nextPhase: '8.1',
  closureEvidence: 'docs/PHASE7_5_CLOSURE.md',
  postMergeEvidence: 'docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md',
};
write('docs/PHASE7_5_STATE.json', JSON.stringify(state, null, 2));

write('docs/PHASE7_5_CLOSURE.md', `# ENJAZ Phase 7.5 — Finance Destruction & Reconciliation Gate Closure

**Status: CLOSED — Zero-Escape exit gate passed.**

Phase 7.5 closes the Phase-7 finance destruction/reconciliation scope after destructive model tests, Real Chromium, authenticated Real Cloud, canonical merge, deployed-live verification and post-merge recertification all passed without weakening the finance authority or the production budget.

## Certified implementation

- Exact tested implementation head: \`c479af8341b9699baf639deabbd61d356ea01c4e\`.
- Pull request: **#105**.
- Pull-request workflows: **30/30 SUCCESS**, with 0 failure / 0 queued / 0 in-progress / 0 cancelled.
- Dedicated pre-merge Phase 7.5 gate: \`34103255390\` — SUCCESS.
- Pre-merge Real Browser Acceptance: \`34103255198\` — SUCCESS.
- Dedicated destructive finance model/cumulative tests: **45/45 PASS** on canonical main recertification.
- Full functional regression: **198/198 PASS** on canonical main recertification.
- Real Chromium Phase 7.5 destruction: **9/9 PASS** at 1280/430/390/360/320; cumulative Phase 7.2 Chromium: **11/11 PASS**.

## Real Cloud evidence

The real ENJAZ Supabase project \`juzxriirhkuzviwnhkbd\` passed the authenticated destructive round trip documented in \`docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md\`:

- real user/workspace derivation and \`SET LOCAL ROLE authenticated\`;
- exact \`numeric(18,2)\` boundary payment \`9999999999999999.99\`;
- immutable receipt read-back with no amount drift;
- same-key payment replay returned \`wasDuplicate=true\`;
- changed-payload replay with the same key was rejected as an idempotency conflict;
- reversal + same-key reversal replay remained single-event and idempotent;
- authoritative reconciliation returned \`integrityWarnings=0\`;
- database uniqueness rejected a second direct reversal for the same payment;
- post-probe company/transaction/helper counts all returned 0, with 0 duplicate reversal groups.

No duplicate reversal history was silently deleted or auto-repaired.

## Production budget

Canonical Phase 7.5 production JavaScript: **588688 / 670000 bytes**. The hard budget was not raised.

## Canonical merge and post-merge proof

- Canonical implementation merge: \`761073812fc0e43f481ac20532ea6c10979d805d\`.
- Exact merged SHA: **11/11 canonical main push workflows SUCCESS**, 0 failure / 0 queued / 0 in-progress / 0 cancelled.
- Phase 7.5 gate run \`34103686407\` — SUCCESS.
- Real Browser Acceptance run \`34103686363\` — SUCCESS, including Zero-Lost, both destruction waves and production bridge.
- ENJAZ Pages Preview/build/deploy run \`34103737386\` — SUCCESS.
- Live External run \`34103828264\` — SUCCESS.
- **Attack the actual published application** — SUCCESS.

## Exit decision

- unresolved destructive defects: **0**
- Critical defects: **0**
- High defects: **0**
- functional blockers: **0**
- Phase 7 exit: **SATISFIED**

**Phase 7.5 is CLOSED + POST-MERGE RECERTIFIED.**

The sole next authorized implementation stage is **Phase 8.1 — Workflow Engine & Government Procedure OS — M1**. This does not mark the whole M1 system closed; M1 must earn its own later Zero-Escape evidence. The completed Phase-7 anchors also do not falsely close M13 or M16 overall.
`);

write('docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md', `# ENJAZ Phase 7.5 — Post-Merge Recertification

**Status: COMPLETE**

## Canonical target

- Implementation merge commit: \`761073812fc0e43f481ac20532ea6c10979d805d\`
- Canonical branch: \`main\`
- Certified implementation head: \`c479af8341b9699baf639deabbd61d356ea01c4e\`
- Implementation PR: **#105**

## Canonical workflow census

The exact merged implementation SHA completed **11/11 main push workflows SUCCESS** with:

- failure: **0**
- queued: **0**
- in-progress: **0**
- cancelled: **0**

The broader exact-SHA set, including the verified Pages workflow and Live External workflow-run chain, settled with no failed, queued, in-progress or cancelled run.

## Required evidence

- Phase 7.5 dedicated gate: \`34103686407\` — SUCCESS.
- Real Browser Acceptance: \`34103686363\` — SUCCESS.
- ENJAZ Pages Preview/build/deploy: \`34103737386\` — SUCCESS.
- Live External: \`34103828264\` — SUCCESS.
- **Attack the actual published application** — SUCCESS.
- Real Cloud authenticated destruction: **PASS**, bound by \`docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md\`.
- Production JavaScript: **588688 / 670000**.
- Dedicated destructive model/cumulative tests: **45/45 PASS**.
- Full functional regression: **198/198 PASS**.
- Real Chromium Phase 7.5: **9/9 PASS**; cumulative finance Chromium: **11/11 PASS**.

## Transition

Post-merge recertification is **COMPLETE**. Phase 7 exit is satisfied. **Phase 8.1 — Workflow Engine & Government Procedure OS — M1** is the sole next authorized implementation stage.
`);

let audit75 = fs.readFileSync('scripts/phase7-5-finance-destruction-audit.mjs', 'utf8');
audit75 = mustReplace(audit75,
  "const realCloudEvidencePath = 'docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md';",
  "const realCloudEvidencePath = 'docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md';\nconst closurePath = 'docs/PHASE7_5_CLOSURE.md';\nconst postMergePath = 'docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md';",
  'phase75 evidence paths');
audit75 = mustReplace(audit75,
  "const realCloudEvidence = exists(realCloudEvidencePath) ? read(realCloudEvidencePath) : '';",
  "const realCloudEvidence = exists(realCloudEvidencePath) ? read(realCloudEvidencePath) : '';\nconst closure = exists(closurePath) ? read(closurePath) : '';\nconst postMerge = exists(postMergePath) ? read(postMergePath) : '';",
  'phase75 evidence reads');
audit75 = mustReplace(audit75,
  "check('phase_active_fail_closed', state.status === 'ACTIVE' && state.exitGatePassed === false && state.phase8Allowed === false && state.nextPhase === null);",
  "check('phase_closed_zero_escape', state.status === 'CLOSED' && state.exitGatePassed === true && state.unresolvedDefectCount === 0 && state.criticalDefectCount === 0 && state.highDefectCount === 0 && state.functionalBlockerCount === 0);",
  'phase75 closed state');
audit75 = mustReplace(audit75,
  "check('phase8_still_locked', has(kickoff, 'Phase 8 remains **LOCKED**') && has(roadmap, 'Phase 8 remains locked'));",
  "check('phase8_transition_is_81_only', state.phase8Allowed === true && state.nextPhase === '8.1' && has(roadmap, 'Phase 8.1 — Workflow Engine & Government Procedure OS — M1'));",
  'phase8 transition');
const closureChecks = `\ncheck('closure_implementation_identity', state.implementationHead === 'c479af8341b9699baf639deabbd61d356ea01c4e' && state.pullRequest === 105);\ncheck('closure_premerge_30_of_30', state.preClosure?.workflowCount === 30 && state.preClosure?.successCount === 30 && state.preClosure?.failureCount === 0 && state.preClosure?.inProgressCount === 0 && state.preClosure?.queuedCount === 0 && state.preClosure?.cancelledCount === 0);\ncheck('closure_premerge_browser_budget', state.preClosure?.realChromium === 'PASS' && state.preClosure?.dedicatedGateRunId === 34103255390 && state.preClosure?.realBrowserRunId === 34103255198 && state.preClosure?.productionJavaScriptBytes === 588688 && state.preClosure?.productionJavaScriptBudget === 670000);\ncheck('closure_merge_identity', state.mergeCommit === '761073812fc0e43f481ac20532ea6c10979d805d');\ncheck('closure_postmerge_complete', state.postMergeRecertification?.status === 'COMPLETE' && state.postMergeRecertification?.mainCommit === '761073812fc0e43f481ac20532ea6c10979d805d' && state.postMergeRecertification?.workflowCount === 11 && state.postMergeRecertification?.successCount === 11 && state.postMergeRecertification?.failureCount === 0 && state.postMergeRecertification?.inProgressCount === 0 && state.postMergeRecertification?.queuedCount === 0 && state.postMergeRecertification?.cancelledCount === 0);\ncheck('closure_deployed_evidence', state.postMergeRecertification?.phaseGateRunId === 34103686407 && state.postMergeRecertification?.pagesPreviewRunId === 34103737386 && state.postMergeRecertification?.pagesPreview === 'SUCCESS' && state.postMergeRecertification?.pagesBuild === 'SUCCESS' && state.postMergeRecertification?.pagesDeploy === 'SUCCESS' && state.postMergeRecertification?.realBrowserRunId === 34103686363 && state.postMergeRecertification?.realBrowser === 'SUCCESS' && state.postMergeRecertification?.liveExternalRunId === 34103828264 && state.postMergeRecertification?.liveExternal === 'SUCCESS' && state.postMergeRecertification?.publishedApplicationAttack === 'SUCCESS');\ncheck('closure_evidence_pointers', state.closureEvidence === closurePath && state.postMergeEvidence === postMergePath && Boolean(closure) && Boolean(postMerge));\nfor (const marker of ['Status: CLOSED', '30/30 SUCCESS', '588688 / 670000', '761073812fc0e43f481ac20532ea6c10979d805d', '34103828264', 'Attack the actual published application', 'Phase 8.1 — Workflow Engine & Government Procedure OS — M1']) check(\`closure_doc_\${marker}\`, has(closure, marker));\nfor (const marker of ['Status: COMPLETE', '11/11 main push workflows SUCCESS', '34103686407', '34103737386', '34103686363', '34103828264', 'Phase 8.1 — Workflow Engine & Government Procedure OS — M1']) check(\`postmerge_doc_\${marker}\`, has(postMerge, marker));\n`;
audit75 = mustReplace(audit75, "\nif (failures.length) {", `${closureChecks}\nif (failures.length) {`, 'phase75 closure checks insertion');
audit75 = mustReplace(audit75,
  "console.log(`ENJAZ PHASE 7.5 FINANCE DESTRUCTION AUDIT PASS (${checks} checks) — ACTIVE; Real Cloud PASS; Phase 8 locked.`);",
  "console.log(`ENJAZ PHASE 7.5 FINANCE DESTRUCTION AUDIT PASS (${checks} checks) — CLOSED + POST-MERGE RECERTIFIED; Real Cloud PASS; next=Phase 8.1 only.`);",
  'phase75 audit success message');
write('scripts/phase7-5-finance-destruction-audit.mjs', audit75);

let readme = fs.readFileSync('README.md', 'utf8');
readme = mustReplace(readme,
`الحالة الرسمية: **Phase 7.4 — Financial Reports ✅ CLOSED + POST-MERGE RECERTIFIED**  
آخر مرحلة مغلقة: **Phase 7.4 — Financial Reports ✅**  
التالي المسموح: **Phase 7.5 — Finance Destruction & Reconciliation Gate**.`,
`الحالة الرسمية: **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + POST-MERGE RECERTIFIED**  
آخر مرحلة مغلقة: **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅**  
التالي المسموح: **Phase 8.1 — Workflow Engine & Government Procedure OS — M1**.`,
'readme official status');
readme = mustReplace(readme,
`- [\`docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md\`](docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md)`,
`- [\`docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md\`](docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md)\n- [\`docs/PHASE7_5_STATE.json\`](docs/PHASE7_5_STATE.json)\n- [\`docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md\`](docs/PHASE7_5_REAL_CLOUD_EVIDENCE.md)\n- [\`docs/PHASE7_5_CLOSURE.md\`](docs/PHASE7_5_CLOSURE.md)\n- [\`docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md\`](docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md)`,
'readme evidence links');
readme = mustReplace(readme,
`- **Phase 7.4 — Financial Reports** ✅ complete + post-merge recertified\n- **Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**`,
`- **Phase 7.4 — Financial Reports** ✅ complete + post-merge recertified\n- **Phase 7.5 — Finance Destruction & Reconciliation Gate** ✅ complete + post-merge recertified\n- **Phase 7 — Finance** ✅ complete + post-merge recertified\n- **Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**`,
'readme canonical list');
readme = mustReplace(readme,
`- \`phase7_5Allowed=true\`; Phase 7.5 is the sole next authorized implementation stage.`,
`- Historical transition evidence authorized Phase 7.5 after 7.4 closure.\n\n### Phase 7.5 canonical evidence\n\n- Exact tested implementation head: \`c479af8341b9699baf639deabbd61d356ea01c4e\`; PR #105 passed **30/30 pull-request workflows SUCCESS**.\n- Real Cloud authenticated finance destruction passed on ENJAZ Supabase, including exact \`9999999999999999.99\`, safe payment/reversal replay, idempotency conflict, reconciliation and probe cleanup.\n- The database now enforces one reversal per payment with forensic fail-closed migration behavior; no duplicate history was silently deleted.\n- Dedicated destructive finance tests passed **45/45** and full functional regression passed **198/198** on canonical recertification.\n- Real Chromium Phase 7.5 passed **9/9** at **1280/430/390/360/320**; cumulative Phase 7.2 Chromium passed **11/11**.\n- Production JavaScript remained **588688/670000** without raising the hard budget.\n- Canonical implementation merge: \`761073812fc0e43f481ac20532ea6c10979d805d\`; exact merged SHA passed **11/11 canonical main push workflows SUCCESS** with zero failure/queued/in-progress/cancelled.\n- Phase 7.5 gate \`34103686407\`, Pages Preview/deploy \`34103737386\`, Real Browser \`34103686363\`, and Live External \`34103828264\` all succeeded.\n- Live External included **Attack the actual published application** — SUCCESS.\n- **Phase 7 exit is satisfied. Phase 8.1 — Workflow Engine & Government Procedure OS — M1 is the sole next authorized implementation stage.**`,
'readme phase75 evidence');
readme = mustReplace(readme,
`**Phase 7.4 is closed and canonically post-merge recertified. Phase 7.5 — Finance Destruction & Reconciliation Gate is the only next authorized implementation stage.**`,
`**Phase 7.5 is closed and canonically post-merge recertified. Phase 7 is complete. Phase 8.1 — Workflow Engine & Government Procedure OS — M1 is the only next authorized implementation stage.**`,
'readme current pointer');
readme = mustReplace(readme,
`Phase 8 remains locked until Phase 7.5 completes its own closure and recertification requirements. The completed M13 finance anchor does not declare the whole M13 system complete, and the completed M16 finance/commercial/reporting anchors do not declare the whole M16 system complete.`,
`Phase 8.1 is now authorized because Phase 7 completed Zero-Escape closure. Later Phase-8 stages remain locked behind their predecessors. The completed M13 finance anchor does not declare the whole M13 system complete, the completed M16 finance/commercial/reporting anchors do not declare the whole M16 system complete, and starting M1 in 8.1 does not declare M1 closed.`,
'readme transition prose');
write('README.md', readme);

let roadmap = fs.readFileSync('docs/ENJAZ_MASTER_ROADMAP.md', 'utf8');
roadmap = mustReplace(roadmap, '# Phase 7 — Finance\n', '# Phase 7 — Finance ✅\n', 'roadmap phase7 header');
roadmap = mustReplace(roadmap,
`## 7.5 — Finance Destruction & Reconciliation Gate\n- Huge values, sub-cent/unsafe inputs, reversals, repeated submit, network uncertainty, stale state, partial history and source-capacity pressure.\n- Authoritative reconciliation proves no lost/duplicated money event.\n- Real Cloud + Real Browser + deployed-live finance critical path required.\n\n**Phase 7 exit:** only after 7.5 is green and all anchored finance/commercial capabilities have Zero-Escape evidence. Phase 8 remains locked until then.`,
`## 7.5 — Finance Destruction & Reconciliation Gate ✅\n- Huge values, sub-cent/unsafe inputs, reversals, repeated submit, network uncertainty, stale state, partial history and source-capacity pressure were destructively exercised.\n- Authoritative reconciliation proves no lost/duplicated money event; the database enforces one reversal per payment and fails closed on pre-existing duplicate history.\n- Real Cloud authenticated destruction passed on ENJAZ Supabase with exact \`9999999999999999.99\`, idempotent payment/reversal replay, changed-payload conflict, reconciliation \`integrityWarnings=0\`, duplicate-reversal rejection and complete probe cleanup.\n- Certified implementation head \`c479af8341b9699baf639deabbd61d356ea01c4e\`: PR #105 passed 30/30 workflows SUCCESS.\n- Production JavaScript remained \`588688/670000\`; the hard budget was not raised.\n- Canonical merge \`761073812fc0e43f481ac20532ea6c10979d805d\`: 11/11 canonical main push workflows SUCCESS with zero failure/queued/in-progress/cancelled.\n- Phase 7.5 gate \`34103686407\`, Pages Preview/deploy \`34103737386\`, Real Browser \`34103686363\`, and Live External \`34103828264\` all succeeded; **Attack the actual published application** passed.\n- **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.\n\n**Phase 7 exit:** satisfied under Zero-Escape. **Phase 8.1 — Workflow Engine & Government Procedure OS — M1** is the sole next authorized implementation stage.`,
'roadmap phase75 section');
roadmap = roadmap.replaceAll('**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**', '**Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**');
roadmap = mustReplace(roadmap,
`- **Phase 7.4 — Financial Reports ✅ CLOSED + post-merge recertified**\n- **M13 finance forecasting/BI anchor ✅ COMPLETE; M13 overall remains open for later assigned slices**`,
`- **Phase 7.4 — Financial Reports ✅ CLOSED + post-merge recertified**\n- **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + post-merge recertified**\n- **Phase 7 — Finance ✅ CLOSED + post-merge recertified**\n- **M13 finance forecasting/BI anchor ✅ COMPLETE; M13 overall remains open for later assigned slices**`,
'roadmap canonical completed list');
roadmap = mustReplace(roadmap,
`Phase 7.5 is the only newly authorized implementation stage. Adding the 18 systems expanded delivery scope but did **not** silently reorder phases or retroactively reopen closed phases. Phase 8 remains locked until Phase 7 completes.`,
`Phase 8.1 is the only newly authorized implementation stage. Adding the 18 systems expanded delivery scope but did **not** silently reorder phases or retroactively reopen closed phases. Later Phase-8 stages remain locked behind their predecessor closures.`,
'roadmap transition paragraph');
roadmap = mustReplace(roadmap,
`This reconciliation makes seven explicit changes:\n\n1. preserves the already-proven Phase 7.1 canonical post-merge recertification and its historical authorization of 7.2;\n2. preserves Phase 7.2 canonical closure/post-merge recertification and its historical authorization of 7.3;\n3. preserves Phase 7.3 canonical closure/post-merge recertification, including the repaired 147-byte Gate Escape, and its historical authorization of 7.4;\n4. records Phase 7.4 canonical closure/post-merge recertification and advances the only next implementation pointer to 7.5;\n5. incorporates the 18 major product systems M1–M18 into their governing future phases rather than leaving them as detached amendments;\n6. makes Zero-Escape closure mandatory across every major system and future phase exit where that system is anchored;\n7. preserves the prior correction that replaced stale Current Position pointers.\n\nIt does **not** silently reopen Phases 0–6, falsely mark M13 or M16 fully closed from their Phase-7 anchors, mark any other M1–M18 system implemented, or authorize work beyond Phase 7.5.`,
`This reconciliation makes eight explicit changes:\n\n1. preserves the already-proven Phase 7.1 canonical post-merge recertification and its historical authorization of 7.2;\n2. preserves Phase 7.2 canonical closure/post-merge recertification and its historical authorization of 7.3;\n3. preserves Phase 7.3 canonical closure/post-merge recertification, including the repaired 147-byte Gate Escape, and its historical authorization of 7.4;\n4. preserves Phase 7.4 canonical closure/post-merge recertification and its historical authorization of 7.5;\n5. records Phase 7.5 canonical closure/post-merge recertification, satisfies the Phase-7 exit and advances the only next implementation pointer to 8.1;\n6. incorporates the 18 major product systems M1–M18 into their governing future phases rather than leaving them as detached amendments;\n7. makes Zero-Escape closure mandatory across every major system and future phase exit where that system is anchored;\n8. preserves the prior correction that replaced stale Current Position pointers.\n\nIt does **not** silently reopen Phases 0–6, falsely mark M13 or M16 fully closed from their Phase-7 anchors, falsely mark M1 complete from authorizing its 8.1 implementation slice, mark any other M1–M18 system implemented, or authorize work beyond Phase 8.1.`,
'roadmap change control');
write('docs/ENJAZ_MASTER_ROADMAP.md', roadmap);

let roadAudit = fs.readFileSync('scripts/roadmap-audit.mjs', 'utf8');
roadAudit = mustReplace(roadAudit,
  "const phase74 = JSON.parse(read('docs/PHASE7_4_STATE.json'));",
  "const phase74 = JSON.parse(read('docs/PHASE7_4_STATE.json'));\nconst phase75 = JSON.parse(read('docs/PHASE7_5_STATE.json'));",
  'roadmap audit phase75 state');
roadAudit = roadAudit.replaceAll('**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**', '**Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**');
roadAudit = mustReplace(roadAudit,
  "  '**Next: Phase 7.4 — Financial Reports**',\n]) forbidMarker(roadmap, stale, 'roadmap');",
  "  '**Next: Phase 7.4 — Financial Reports**',\n  '**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**',\n]) forbidMarker(roadmap, stale, 'roadmap');",
  'roadmap audit stale roadmap 75');
roadAudit = mustReplace(roadAudit,
  "assertClosed('Phase 7.4', phase74);",
  "assertClosed('Phase 7.4', phase74);\nassertClosed('Phase 7.5', phase75);",
  'roadmap audit closed 75');
const phase75RoadChecks = `\nif (phase75.phase !== '7.5') errors.push('Phase 7.5 state identity drifted');\nif (phase75.implementationHead !== 'c479af8341b9699baf639deabbd61d356ea01c4e' || phase75.pullRequest !== 105) errors.push('Phase 7.5 certified implementation/PR evidence drifted');\nif (phase75.preClosure?.workflowCount !== 30 || phase75.preClosure?.successCount !== 30 || phase75.preClosure?.failureCount !== 0 || phase75.preClosure?.inProgressCount !== 0 || phase75.preClosure?.queuedCount !== 0 || phase75.preClosure?.cancelledCount !== 0 || phase75.preClosure?.realChromium !== 'PASS') errors.push('Phase 7.5 must preserve 30/30 pre-closure evidence and Real Chromium PASS');\nif (phase75.preClosure?.dedicatedGateRunId !== 34103255390 || phase75.preClosure?.realBrowserRunId !== 34103255198) errors.push('Phase 7.5 pre-merge gate/browser evidence drifted');\nif (phase75.preClosure?.productionJavaScriptBytes !== 588688 || phase75.preClosure?.productionJavaScriptBudget !== 670000) errors.push('Phase 7.5 production budget evidence drifted');\nif (phase75.realCloudVerification?.status !== 'COMPLETE' || phase75.realCloudVerification?.authenticatedRoleSwitch !== 'PASS' || phase75.realCloudVerification?.exactHugeValue !== '9999999999999999.99' || phase75.realCloudVerification?.authoritativeReconciliation !== 'PASS' || phase75.realCloudVerification?.duplicateReversalDatabaseGuard !== 'PASS' || phase75.realCloudVerification?.duplicateReversalGroupCount !== 0) errors.push('Phase 7.5 Real Cloud evidence drifted');\nif (phase75.mergeCommit !== '761073812fc0e43f481ac20532ea6c10979d805d') errors.push('Phase 7.5 canonical merge commit drifted');\nif (phase75.postMergeRecertification?.status !== 'COMPLETE' || phase75.postMergeRecertification?.mainCommit !== '761073812fc0e43f481ac20532ea6c10979d805d') errors.push('Phase 7.5 post-merge recertification must remain COMPLETE on the exact canonical SHA');\nif (phase75.postMergeRecertification?.workflowCount !== 11 || phase75.postMergeRecertification?.successCount !== 11 || phase75.postMergeRecertification?.failureCount !== 0 || phase75.postMergeRecertification?.inProgressCount !== 0 || phase75.postMergeRecertification?.queuedCount !== 0 || phase75.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 7.5 must preserve 11/11 canonical main push recertification evidence');\nif (phase75.postMergeRecertification?.phaseGateRunId !== 34103686407 || phase75.postMergeRecertification?.pagesPreviewRunId !== 34103737386 || phase75.postMergeRecertification?.pagesBuild !== 'SUCCESS' || phase75.postMergeRecertification?.pagesDeploy !== 'SUCCESS' || phase75.postMergeRecertification?.realBrowserRunId !== 34103686363 || phase75.postMergeRecertification?.realBrowser !== 'SUCCESS' || phase75.postMergeRecertification?.liveExternalRunId !== 34103828264 || phase75.postMergeRecertification?.liveExternal !== 'SUCCESS' || phase75.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 7.5 deployed post-merge evidence drifted');\nif (phase75.phase8Allowed !== true || phase75.nextPhase !== '8.1') errors.push('Phase 8.1 must be the only next stage authorized by Phase 7.5');\nif (phase75.closureEvidence !== 'docs/PHASE7_5_CLOSURE.md' || phase75.postMergeEvidence !== 'docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.5 closure evidence pointers drifted');\n`;
roadAudit = mustReplace(roadAudit,
  "if (phase74.criticalDefectCount !== 0 || phase74.highDefectCount !== 0 || phase74.functionalBlockerCount !== 0) errors.push('Phase 7.4 defect gate must remain zero');",
  "if (phase74.criticalDefectCount !== 0 || phase74.highDefectCount !== 0 || phase74.functionalBlockerCount !== 0) errors.push('Phase 7.4 defect gate must remain zero');\n" + phase75RoadChecks,
  'roadmap audit phase75 evidence');
roadAudit = mustReplace(roadAudit,
  "  'الحالة الرسمية: **Phase 7.4 — Financial Reports ✅ CLOSED + POST-MERGE RECERTIFIED**',",
  "  'الحالة الرسمية: **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + POST-MERGE RECERTIFIED**',",
  'roadmap audit README official');
roadAudit = mustReplace(roadAudit,
  "  'التالي المسموح: **Phase 7.5 — Finance Destruction & Reconciliation Gate**',",
  "  'التالي المسموح: **Phase 8.1 — Workflow Engine & Government Procedure OS — M1**',",
  'roadmap audit README next');
roadAudit = mustReplace(roadAudit,
  "  '**Next: Phase 7.4 — Financial Reports**',\n  '**Next: Phase 6.1 — Companies**',",
  "  '**Next: Phase 7.4 — Financial Reports**',\n  '**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**',\n  '**Next: Phase 6.1 — Companies**',",
  'roadmap audit README stale 75');
roadAudit = mustReplace(roadAudit,
  "if (errors.length) {",
  "for (const marker of ['**Phase 7.5 — Finance Destruction & Reconciliation Gate** ✅ complete + post-merge recertified','**Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**','30/30 pull-request workflows SUCCESS','11/11 canonical main push workflows SUCCESS','c479af8341b9699baf639deabbd61d356ea01c4e','761073812fc0e43f481ac20532ea6c10979d805d','34103828264','Phase 7 exit is satisfied']) requireMarker(readme, marker, 'README Phase 7.5');\n\nif (errors.length) {",
  'roadmap audit README 75 markers');
roadAudit = mustReplace(roadAudit,
  "console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 7.4 CLOSED + 10/10 canonical main push recertified; M13 finance and M16 finance/reporting anchors preserved without falsely closing those overall systems; next=Phase 7.5 only.');",
  "console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 7.5 CLOSED + 11/11 canonical main push recertified; Phase 7 exit complete; M13/M16 overall remain correctly open; next=Phase 8.1 only.');",
  'roadmap audit success message');
write('scripts/roadmap-audit.mjs', roadAudit);

// Self-check the transition before allowing the generated commit.
const finalReadme = fs.readFileSync('README.md', 'utf8');
const finalRoadmap = fs.readFileSync('docs/ENJAZ_MASTER_ROADMAP.md', 'utf8');
for (const marker of [
  'Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + POST-MERGE RECERTIFIED',
  'Phase 8.1 — Workflow Engine & Government Procedure OS — M1',
  '30/30 pull-request workflows SUCCESS',
  '11/11 canonical main push workflows SUCCESS',
  '34103828264',
]) {
  if (!finalReadme.includes(marker)) throw new Error(`README Phase 7.5 self-check missing ${marker}`);
}
for (const marker of [
  '## 7.5 — Finance Destruction & Reconciliation Gate ✅',
  'Phase 7 exit:** satisfied under Zero-Escape',
  '**Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**',
]) {
  if (!finalRoadmap.includes(marker)) throw new Error(`Roadmap Phase 7.5 self-check missing ${marker}`);
}

// The bootstrap patcher/workflow are deliberately one-shot and must never reach main.
fs.rmSync('scripts/phase7-5-formal-closure-patch.mjs', { force: true });
fs.rmSync('.github/workflows/phase7-5-formal-closure-patch.yml', { force: true });
console.log('Phase 7.5 formal closure governance patch prepared; one-shot bootstrap files removed.');
