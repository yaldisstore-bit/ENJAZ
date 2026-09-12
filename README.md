# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 9.6 — Process Mining & Predictive Operations — M18 🟡 IN PROGRESS — FOUNDATION**  
آخر مرحلة مغلقة: **Phase 9.5 — Business Intelligence & Forecasting Center — M13 ✅ CLOSED + POST-MERGE / PUBLISHED-LIVE RECERTIFIED**  
المرحلة التالية بعد 9.6: **Phase 9.7 — Intelligence Zero-Escape Gate — LOCKED**.

ENJAZ مشروع مستقل مبني من الصفر بواجهة حديثة وبنية Supabase/Postgres + RLS، ومن دون إعادة إحياء legacy UI/runtime DNA.

## دستور الجودة الأعلى

الميثاق الحاكم الأعلى للمشروع هو [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md).

**Product → UI/UX → Engineering → Certification**

لا تُغلق أي مرحلة ولا يُفتح successor إلا عندما تصبح المسارات الأربعة `PASS`. الواجهة يجب أن تبقى premium وموحدة وArabic/RTL/mobile-first، والكود typed/modular/maintainable، ومصدر الحقيقة وصلاحياته حقيقيان، والإغلاق يحتاج Real Cloud + Real Browser + deployed-live evidence. سقف الأداء حارس جودة وليس مبررًا لحذف ميزة أو إضعاف UX.

## التطبيق الحقيقي

- Live runtime: `https://yaldisstore-bit.github.io/ENJAZ/live/`
- الجذر `/ENJAZ/` سطح QA/Preview تاريخي؛ العقد الإنتاجي الحي يُتحقق منه عبر `/live/`.
- مركز ذكاء الأعمال canonical: `/app/insights`، والمسار المنشور المباشر: `/ENJAZ/live/app/insights`.
- Phase 9.6 لم تُنشئ route إنتاجي جديدًا بعد؛ foundation authority/service contracts تسبق أي UI/runtime surface.

## الحالة الكانونية

- Phases 0–7: ✅ CLOSED / recertified حيث يلزم.
- Phase 8.1 — Workflow Engine & Government Procedure OS — M1: ✅ CLOSED + post-merge recertified.
- Phase 8.2 — Automation Engine: ✅ CLOSED + post-merge recertified.
- Phase 8.3 — Operations Center + Field Operations — M5: ✅ CLOSED + post-merge recertified.
- Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17: ✅ CLOSED + post-merge recertified.
- Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation: ✅ CLOSED + post-merge recertified.
- Phase 8.6 — Global Command Center: ✅ CLOSED + post-merge recertified.
- Phase 8.7 — Operations Zero-Escape Destruction Gate: ✅ CLOSED + post-merge recertified.
- Phase 9.1 — Smart Risk Engine: ✅ CLOSED + post-merge recertified.
- Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence: ✅ CLOSED + post-merge recertified.
- Phase 9.3 — Corporate Governance & Ownership Engine — M2: ✅ CLOSED + post-merge recertified.
- **Phase 9.4 — Regulatory / Knowledge Base Engine — M8: ✅ CLOSED + exact-main + Real Browser + Pages + Live External certified.**
- **Phase 9.5 — Business Intelligence & Forecasting Center — M13: ✅ CLOSED + exact-main + Real Browser + Pages + Live External certified.**
- **Phase 9.6 — Process Mining & Predictive Operations — M18: 🟡 IN PROGRESS — FOUNDATION.**
- **Phase 9.7+ تبقى LOCKED** حتى إغلاق 9.6 وفق Zero-Escape.

## Phase 9.6 — الحالة الحالية

- canonical base / Phase 9.5 formal-closure main: `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.
- branch: `phase9-6-process-mining-predictive-operations`.
- M18 registry status: **ACTIVE**؛ anchors الرسمية: `9, 15`؛ global closure: **FORBIDDEN** في 9.6.
- foundation authority: **READ_ONLY_DERIVED FROM SOURCE-OWNED HISTORY**.
- authoritative process sources المثبتة حاليًا: `workflow_transition_events`, `transaction_activity`, `field_assignments`, `field_visits`, `field_visit_evidence`, `field_sync_receipts`.
- shadow process-event store / browser-owned process persistence / fabricated timestamps / fabricated strict order / cross-workspace composition: **FORBIDDEN**.
- equal-time events بدون ترتيب سلطوي صريح تبقى **EXPLICIT_PARTIAL_ORDER**؛ لا تتحول إلى sequence مؤكدة بسبب sorting بصري.
- rework لا يُستنتج إلا من نشاط مرصود متكرر داخل نفس case.
- bottleneck يحتاج governed duration threshold أو cohort evidence؛ raw wait وحده لا يصبح bottleneck تلقائيًا.
- prediction authority: **DIRECTIONAL_NON_AUTHORITATIVE**؛ method/confidence/evidence disclosure إلزامي.
- foundation next-step method: `empirical_next_activity_frequency`، minimum directional sample = **4 cases**، probability = integer basis points، والتعادل = **NO_SINGLE_WINNER**.
- Phase 9.7: **LOCKED**.
- startup JavaScript ceiling: **670000 bytes** بلا waiver أو feature cut.

## Phase 9.5 — دليل الإغلاق المحفوظ

- implementation PR #139: **MERGED** → `ee62353621701c788b3c96ae8172a59b6f95022d`.
- canonical deep-link / Pages fallback hotfix PR #140: **MERGED** → `ce1a4566f48ebcacfde8a8c5b7dd680b6b23a672`.
- Live External certification-semantics PR #141: **MERGED** → runtime-certified main `8d9f1bd4403656f7b8d061b843178708b3899044`.
- runtime-certified exact-main push workflows: **25/25 SUCCESS**؛ failures/queued/in-progress: **0/0/0**.
- exact-main Phase 9.5 gate `34686304068`: **SUCCESS**.
- Phase 9.5 Real Browser `34686304110`: **SUCCESS**.
- cumulative Real Browser `34686304122`: **SUCCESS**.
- browser matrix: **1280 / 430 / 390 / 360 / 320 PASS**.
- Pages Preview `34686334396`: **SUCCESS**.
- Live External `34686380088`: **SUCCESS**.
- deployed `/ENJAZ/live/app/insights` direct-load + reload matrix: **7/7 PASS**.
- Real Cloud source composition: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**.
- Product / UI/UX / Engineering / Certification: **PASS / PASS / PASS / PASS**.
- unresolved / critical / high / functional blockers: **0 / 0 / 0 / 0**.
- startup JavaScript hard ceiling بقي **670000 bytes** دون waiver أو feature cut.
- formal closure PR #142 merged to `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.
- formal-closure exact-main: **25/25 SUCCESS**؛ failures/queued/in-progress: **0/0/0**.
- formal-closure Phase 9.5 gate `34687292217`: **SUCCESS**؛ Real Browser `34687292129`: **SUCCESS**؛ cumulative Real Browser `34687292148`: **SUCCESS**.
- formal-closure Pages Preview `34687328191`: **SUCCESS**؛ Live External `34687368229`: **SUCCESS**.

## قانون ذكاء الأعمال — Phase 9.5

- BI authority: **READ_ONLY_DERIVED**؛ لا shadow BI persistence.
- source provenance: **REQUIRED** لكل KPI/trend/forecast.
- المال الدقيق: **BIGINT_CENTS** من سلطة Finance القائمة؛ لا parallel ledger ولا shadow money store.
- forecast authority: **DIRECTIONAL_NON_AUTHORITATIVE** مع method/confidence/sample/horizon/assumptions disclosure.
- trailing run-rate مسموح فقط للـ`count` و`cents`؛ ratios/durations تفشل fail-closed.
- fabricated history، silent missing-data substitution، cross-workspace aggregation وdirect browser source mutation: **FORBIDDEN**.
- الاتجاهات المرصودة منفصلة عن التنبؤات المستقبلية ولا يجوز تحويل forecast إلى source fact.

## قانون M13 بعد إغلاق 9.5

إغلاق Phase 9.5 يغلق **مرساة Phase 9 فقط** من M13 ولا يغلق النظام الكبير عالميًا. M13 يبقى `ACTIVE` لأن مرساته الثانية هي Phase 15، و`closureEvidence` يبقى `null` حتى اكتمال hardening و`ZERO_ESCAPE_V1` المستقل.

Phase 7.3 Financial Intelligence يبقى finance source/reuse authority معتمدًا، لكنه لا ينشئ ledger موازٍ ولا يغيّر سجل مرساة M13 الرسمي `9, 15`.

## Phase 9.4 — التاريخ المحفوظ

- Phase 9.4 Regulatory / Knowledge Base Engine — M8: ✅ CLOSED + post-merge/published-live certified.
- certified implementation merge: `b72dbff8bb1dfb1afbce82ececd265bf2d5544ed`.
- exact-main: **23/23 SUCCESS**؛ Phase 9.4 gate `34677681118` وReal Browser `34677681129` وPages `34677705458` وLive External `34677729775`: **SUCCESS**.
- Real Cloud regulatory persistence: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**.
- M8 يبقى `ACTIVE` لأن Phase 12 ما زالت مرساة حاكمة ثانية.

## Major Product Systems — M1–M18

1. **M1 — Government Procedure Operating System** — `CLOSURE_CANDIDATE`.
2. **M2 — Corporate Governance & Ownership Engine** — `CLOSURE_CANDIDATE`.
3. **M3 — Client Portal** — `PLANNED`.
4. **M4 — Omnichannel Communications Hub** — `PLANNED`.
5. **M5 — ENJAZ Field Operations / Runner Mode** — `CLOSURE_CANDIDATE`.
6. **M6 — Service Catalog, CRM & Commercial Intake** — `CLOSURE_CANDIDATE`.
7. **M7 — Document Factory & Official Form Engine** — `PLANNED`.
8. **M8 — Regulatory / Knowledge Base Engine** — `ACTIVE`; Phase 12 remains open.
9. **M9 — Agentic ENJAZ Copilot** — `PLANNED`.
10. **M10 — Scheduling, Appointments & Deadline Engine** — `PLANNED`.
11. **M11 — Integration Platform / API / Webhooks** — `PLANNED`.
12. **M12 — Compliance, Audit & Evidence Center** — `PLANNED`.
13. **M13 — Business Intelligence & Forecasting Center** — `ACTIVE`; Phase 9 anchor CLOSED + published-live certified، Phase 15 remains open.
14. **M14 — Backup, Restore & Workspace Portability** — `PLANNED`.
15. **M15 — Multi-Branch, Departments & Team Operating Model** — `ACTIVE`.
16. **M16 — Engagements, Contracts & Retainers** — `PLANNED`.
17. **M17 — Smart Intake Forms & Secure Submission Links** — `ACTIVE`.
18. **M18 — Process Mining & Predictive Operations** — `ACTIVE`; Phase 9.6 IN PROGRESS، Phase 15 remains open، `closureEvidence=null`.

لا يتم ترقية أي M-system إلى `CLOSED` لمجرد نجاح فرع مرحلة؛ يحتاج شهادة Zero-Escape الخاصة به.

## مصادر الخطة والحوكمة

- [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md) — دستور الجودة الأعلى.
- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة حتى `ENJAZ 1.0 — Delivered`.
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json) — سجل M1–M18 machine-readable.
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md) — Zero-Escape للأنظمة الكبيرة.
- [`docs/PHASE9_4_CLOSURE.md`](docs/PHASE9_4_CLOSURE.md)
- [`docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_5_KICKOFF.md`](docs/PHASE9_5_KICKOFF.md)
- [`docs/PHASE9_5_STATE.json`](docs/PHASE9_5_STATE.json)
- [`docs/PHASE9_5_CLOSURE.md`](docs/PHASE9_5_CLOSURE.md)
- [`docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_6_KICKOFF.md`](docs/PHASE9_6_KICKOFF.md)
- [`docs/PHASE9_6_STATE.json`](docs/PHASE9_6_STATE.json)

## قوانين الانتقال

- لا يبدأ successor قبل إغلاق predecessor وإعادة تصديقه على `main` والنشر.
- لا تُغلق أي مرحلة ما لم تكن Product / UI/UX / Engineering / Certification كلها `PASS`.
- كل bug حقيقي يحصل على regression guard دائم.
- Gate Escape يعيد فتح مسار التصديق المتأثر بدل تجاهله.
- Supabase/Postgres/RLS يبقى مصدر الحقيقة للسلطة الدائمة.
- لا يُسمح لأي intelligence layer باختلاق business/financial/process facts من بيانات ناقصة.
- forecast/prediction لا يصبح source truth، ولا AI/editorial output يصبح authoritative fact بلا عقد سلطة مستقل.
- سقف JavaScript الإنتاجي يبقى **670000 bytes** ما لم يُغيّر بعقد حوكمة مستقل.
- **Phase 9.6 هي المرحلة المفتوحة الآن؛ Phase 9.7+ مقفلة حتى إغلاق 9.6.**
