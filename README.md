# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 7.1 — Financial Ledger & Summary ✅ CLOSED + POST-MERGE RECERTIFIED**  
آخر مرحلة مغلقة: **Phase 7.1 — Financial Ledger & Summary ✅**  
التالي المسموح: **Phase 7.2 — Payments & Receipts**.

ENJAZ مشروع مستقل مبني من الصفر، بواجهة وهوية حديثة وبنية Supabase/Postgres + RLS، من دون إعادة إحياء legacy UI/runtime DNA.

## التطبيق الحقيقي

- Live runtime: `https://yaldisstore-bit.github.io/ENJAZ/live/`
- الجذر `/ENJAZ/` يبقى سطح QA/Preview تاريخيًا ولا يمثل مصدر الحقيقة للبيانات الحية.

## مصادر الخطة والحوكمة

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة المدمجة حتى `ENJAZ 1.0 — Delivered`.
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json) — الأنظمة الكبيرة M1–M18 وحالتها machine-readable.
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md) — قانون الإغلاق الصارم للأنظمة الكبيرة.
- [`docs/ENJAZ_CAPABILITY_EXPANSION_2026.json`](docs/ENJAZ_CAPABILITY_EXPANSION_2026.json) — التوسعة التفصيلية للقدرات.
- [`docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json`](docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json)
- [`docs/PHASE7_1_FINANCIAL_LEDGER_CLOSURE.md`](docs/PHASE7_1_FINANCIAL_LEDGER_CLOSURE.md)
- [`docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md`](docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md)

## الحالة الكانونية للمراحل

- **Phase 0 — Product Freeze & Migration Contract** ✅ complete
- **Phase 1 — Engineering Foundation** ✅ complete
- **Phase 2 — ENJAZ Design System 1.0** ✅ complete/frozen
- **Phase 3 — Application Shell & Navigation** ✅ complete
- **Phase 4 — Home, Daily Work & Executive Overview** ✅ complete
- **Phase 5 — Transactions Core** ✅ complete
  - **Phase 5.1 — Transaction List & Search** ✅ complete
  - **Phase 5.2 — Transaction Create/Edit** ✅ complete
  - **Phase 5.3 — Transaction Details / 360°** ✅ complete
  - **Phase 5.4 — Archive/Restore/Lifecycle** ✅ complete
  - **Phase 5.5 — Transaction Destruction Gate** ✅ complete
- **Phase 6 — Companies & People** ✅ complete
  - **Phase 6.1 — Companies** ✅ complete
  - **Phase 6.2 — Lawyers / Contacts** ✅ complete
  - **Phase 6.3 — Company / Lawyer 360°** ✅ complete
  - **Phase 6.4 — Companies & People Destruction Gate** ✅ complete
- **Phase 7.1 — Financial Ledger & Summary** ✅ complete + post-merge recertified
- **Next: Phase 7.2 — Payments & Receipts**

### Phase 7.1 canonical evidence

- Certified pre-closure implementation passed **24/24 pull-request workflows SUCCESS**.
- Dedicated finance tests: **11/11 PASS**.
- Full functional regression at closure: **164/164 PASS**.
- Production JavaScript: **628924/670000** without raising the budget.
- Canonical merge: `3d4043c8e5d6784f327ff8ac9879402b7d933422`.
- Exact merged commit passed **9/9 canonical post-merge workflows SUCCESS، 0 failures**.
- Pages deployment and Live External validation succeeded.
- Published verification included **Attack the actual published application**.
- `phase7_2Allowed=true`; Phase 7.2 is authorized but not yet implemented.

## Major Product Systems — M1–M18

The following are now **governing product scope**, not optional ideas. They remain `PLANNED` until implementation and Zero-Escape closure evidence proves otherwise:

1. **M1 — Government Procedure Operating System**
2. **M2 — Corporate Governance & Ownership Engine**
3. **M3 — Client Portal**
4. **M4 — Omnichannel Communications Hub**
5. **M5 — ENJAZ Field Operations / Runner Mode**
6. **M6 — Service Catalog, CRM & Commercial Intake**
7. **M7 — Document Factory & Official Form Engine**
8. **M8 — Regulatory / Knowledge Base Engine**
9. **M9 — Agentic ENJAZ Copilot**
10. **M10 — Scheduling, Appointments & Deadline Engine**
11. **M11 — Integration Platform / API / Webhooks**
12. **M12 — Compliance, Audit & Evidence Center**
13. **M13 — Business Intelligence & Forecasting Center**
14. **M14 — Backup, Restore & Workspace Portability**
15. **M15 — Multi-Branch, Departments & Team Operating Model**
16. **M16 — Engagements, Contracts & Retainers**
17. **M17 — Smart Intake Forms & Secure Submission Links**
18. **M18 — Process Mining & Predictive Operations**

The Master Roadmap embeds these systems into Phases 7–18. Adding them expanded the project scope but did not silently reorder the phase sequence or reopen already certified phases.

## Zero-Escape rule

No M1–M18 system may be marked `CLOSED` because UI looks complete or branch CI is green.

Closure requires, where applicable:

- authoritative schema/data contract;
- real ENJAZ Supabase + authenticated user;
- fresh-user/fresh-workspace bootstrap;
- durable create/write → read → refresh round trip;
- positive and negative permission/RLS matrix;
- real Chromium/mobile journeys at 1280/430/390/360/320;
- keyboard/back/reload/deep-link/long-content stress;
- offline/error/conflict/duplicate-submit/recovery tests;
- audit/reconciliation for sensitive writes;
- zero Critical/High/functional blockers;
- exact merged SHA deployed;
- critical path verified on the deployed application;
- post-merge recertification COMPLETE.

If a real defect escapes after a system is closed, it is classified as a **Gate Escape**: the affected certification is reopened, a regression guard is added, the missing gate is strengthened, and Real Cloud + Real Browser + deployed-live verification is repeated before recertification.

## Persistent architecture/security rules

- `main` is canonical after merge.
- The real production path uses authenticated Auth/DataLayer/Supabase boundaries.
- No mock/demo-only implementation can substitute for a production critical path.
- Supabase/Postgres + RLS is the authoritative data boundary.
- Financial facts remain exact and reconciled to authoritative sources.
- Sensitive writes require domain-service validation and audit evidence where applicable.
- No weakening tests to obtain green CI.
- Every real bug gets a regression test.
- Mobile/RTL/Android keyboard/back/safe-area/accessibility remain release requirements.
- The 18-system Zero-Escape policy may be made stricter, never silently weakened.

## Current development pointer

**Phase 7.1 is closed and canonically recertified. Phase 7.2 — Payments & Receipts is the only next authorized implementation stage.**

The 18 major systems are already part of the governing roadmap, but none is considered implemented merely because its scope document exists.
