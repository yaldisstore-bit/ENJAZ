# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 9.3 — Corporate Governance & Ownership Engine — M2 🚧 IN PROGRESS**  
آخر مرحلة مغلقة: **Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence ✅ CLOSED + POST-MERGE RECERTIFIED**  
المرحلة الحالية المصرح بها: **Phase 9.3 — Corporate Governance & Ownership Engine — M2**.

ENJAZ مشروع مستقل مبني من الصفر بواجهة حديثة وبنية Supabase/Postgres + RLS، ومن دون إعادة إحياء legacy UI/runtime DNA.

## التطبيق الحقيقي

- Live runtime: `https://yaldisstore-bit.github.io/ENJAZ/live/`
- الجذر `/ENJAZ/` سطح QA/Preview تاريخي؛ البيانات الحية والعقد الإنتاجي يُتحقق منهما عبر `/live/`.

## الحالة الكانونية

- Phases 0–7: ✅ CLOSED / recertified حيث يلزم.
- Phase 8.1 — Workflow Engine & Government Procedure OS — M1: ✅ CLOSED + post-merge recertified.
- Phase 8.2 — Automation Engine: ✅ CLOSED + post-merge recertified.
- Phase 8.3 — Operations Center + Field Operations — M5: ✅ CLOSED + post-merge recertified.
- Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17: ✅ CLOSED + post-merge recertified.
- Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation: ✅ CLOSED + post-merge recertified.
- Phase 8.6 — Global Command Center: ✅ CLOSED + post-merge recertified.
- Phase 8.7 — Operations Zero-Escape Destruction Gate: ✅ CLOSED + post-merge recertified.
- Phase 8 — Workflow, Automation & Operations: ✅ CLOSED + post-merge recertified.
- Phase 9.1 — Smart Risk Engine: ✅ CLOSED + post-merge recertified.
- **Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence: ✅ CLOSED + POST-MERGE RECERTIFIED.**
- **Phase 9.3 — Corporate Governance & Ownership Engine — M2: 🚧 IN PROGRESS.**
- **Phase 9.4 وما بعدها: LOCKED** حتى إغلاق 9.3 وفق Zero-Escape.

## Phase 9.2 — دليل الإغلاق

- formal closure PR #133: **MERGED**.
- canonical closure SHA: `1d98a57566a5bc55ceda773f02de17dacddaecb0`.
- exact-main Real Browser `34510486188`: **SUCCESS**، بما فيه Phase 9.2 Search + Saved Views على 1280/430/390/360/320.
- Live External `34510610734`: **SUCCESS**، بما فيه الهجوم على التطبيق الحقيقي المنشور `/live/`.
- exact-main final state: **0 failure / 0 queued / 0 in-progress**.
- production JavaScript: **669987 / 670000 PASS**.
- Pages `/live/` JavaScript: **669998 / 670000 PASS**.
- hard JavaScript ceiling remains **670000 bytes**; no budget increase was authorized.
- Real Cloud saved-view/search verification: **PASS_ZERO_RESIDUE**.
- `phase9_3Allowed=true`; successor 9.3 is formally authorized.

## Phase 9.3 — M2 active contract

Phase 9.3 builds a full corporate governance register above the existing company core: shareholders/partners, exact ownership percentages, effective-dated capital and ownership history, beneficial owners, directors/managers, representation authority, powers/authorizations, resolutions, ownership transfers, director changes, corporate-event timeline, historical-control queries and governance-risk signals.

The foundation is deliberately fail-closed: ownership uses exact canonical decimal strings + integer micro-percent arithmetic rather than floating-point summation; ownership must reconcile to 100% where applicable; conflicting effective periods and cross-workspace references are forbidden; historical snapshots derive from authoritative history instead of overwritten current fields; M2 does not create shadow company/party truth stores.

### Runtime budget-headroom lock

The certified Pages build currently uses **669998 / 670000 bytes**, leaving only **2 bytes**. Therefore new Phase 9.3 runtime imports remain locked until deliberate JavaScript headroom is recovered and proven by both root and `/ENJAZ/live/` budget gates. The hard ceiling is not raised, and approved product capability may not be removed merely to make the bundle smaller.

## Major Product Systems — M1–M18

These are governing product systems, not optional ideas. Phase closure does not automatically close a whole M-system. The independent `ZERO_ESCAPE_V1` policy remains authoritative.

1. **M1 — Government Procedure Operating System** — `CLOSURE_CANDIDATE`.
2. **M2 — Corporate Governance & Ownership Engine** — `IN_PROGRESS` through Phase 9.3.
3. **M3 — Client Portal**.
4. **M4 — Omnichannel Communications Hub**.
5. **M5 — ENJAZ Field Operations / Runner Mode** — `CLOSURE_CANDIDATE`.
6. **M6 — Service Catalog, CRM & Commercial Intake** — `CLOSURE_CANDIDATE`.
7. **M7 — Document Factory & Official Form Engine**.
8. **M8 — Regulatory / Knowledge Base Engine**.
9. **M9 — Agentic ENJAZ Copilot**.
10. **M10 — Scheduling, Appointments & Deadline Engine**.
11. **M11 — Integration Platform / API / Webhooks**.
12. **M12 — Compliance, Audit & Evidence Center**.
13. **M13 — Business Intelligence & Forecasting Center**.
14. **M14 — Backup, Restore & Workspace Portability**.
15. **M15 — Multi-Branch, Departments & Team Operating Model** — `ACTIVE`; remaining enterprise anchor is Phase 15.
16. **M16 — Engagements, Contracts & Retainers**.
17. **M17 — Smart Intake Forms & Secure Submission Links** — `ACTIVE`; remaining communications anchor is Phase 11.
18. **M18 — Process Mining & Predictive Operations**.

M1/M5/M6 remain `CLOSURE_CANDIDATE`; M15/M17 remain `ACTIVE`; M2 is `IN_PROGRESS`. No global M-system is upgraded to `CLOSED` merely because a phase branch is green.

## مصادر الخطة والحوكمة

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة حتى `ENJAZ 1.0 — Delivered`.
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json) — سجل M1–M18 machine-readable.
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md) — Zero-Escape rule للأنظمة الكبيرة.
- [`docs/PHASE9_1_STATE.json`](docs/PHASE9_1_STATE.json)
- [`docs/PHASE9_1_CLOSURE.md`](docs/PHASE9_1_CLOSURE.md)
- [`docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_2_KICKOFF.md`](docs/PHASE9_2_KICKOFF.md)
- [`docs/PHASE9_2_STATE.json`](docs/PHASE9_2_STATE.json)
- [`docs/PHASE9_2_CLOSURE.md`](docs/PHASE9_2_CLOSURE.md)
- [`docs/PHASE9_2_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_2_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_3_KICKOFF.md`](docs/PHASE9_3_KICKOFF.md)
- [`docs/PHASE9_3_STATE.json`](docs/PHASE9_3_STATE.json)

## قوانين الانتقال

- لا يبدأ successor قبل إغلاق predecessor وإعادة تصديقه على `main` والنشر.
- كل bug حقيقي يحصل على regression guard دائم.
- Gate Escape يعيد فتح مسار التصديق المتأثر بدل تجاهله.
- Supabase/Postgres/RLS يبقى مصدر الحقيقة للسلطة الدائمة.
- لا يُسمح لأي طبقة intelligence أو governance باختلاق business facts من بيانات ناقصة.
- سقف JavaScript الإنتاجي يبقى **670000 bytes** ما لم يُغيّر بعقد حوكمة صريح مستقل؛ Phase 9.3 لم ترفعه.
