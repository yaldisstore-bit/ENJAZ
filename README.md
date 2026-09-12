# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 9.6 — Process Mining & Predictive Operations — M18 ✅ CLOSED + EXACT-MAIN / REAL-BROWSER / PUBLISHED-LIVE CERTIFIED**  
آخر مرحلة مغلقة: **Phase 9.6 — Process Mining & Predictive Operations — M18 ✅ CLOSED**  
المرحلة التالية: **Phase 9.7 — Intelligence Zero-Escape Gate — AUTHORIZED NEXT**.

ENJAZ مشروع مستقل مبني من الصفر بواجهة حديثة وبنية Supabase/Postgres + RLS، ومن دون إعادة إحياء legacy UI/runtime DNA.

## دستور الجودة الأعلى

الميثاق الحاكم الأعلى للمشروع هو [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md).

**Product → UI/UX → Engineering → Certification**

لا تُغلق أي مرحلة ولا يُفتح successor إلا عندما تصبح المسارات الأربعة `PASS`. الواجهة يجب أن تبقى premium وموحدة وArabic/RTL/mobile-first، والكود typed/modular/maintainable، ومصدر الحقيقة وصلاحياته حقيقيان، والإغلاق يحتاج Real Cloud + Real Browser + deployed-live evidence. سقف الأداء حارس جودة وليس مبررًا لحذف ميزة أو إضعاف UX.

## التطبيق الحقيقي

- Live runtime: `https://yaldisstore-bit.github.io/ENJAZ/live/`
- الجذر `/ENJAZ/` سطح QA/Preview تاريخي؛ العقد الإنتاجي الحي يُتحقق منه عبر `/live/`.
- مركز الذكاء canonical: `/app/insights`.
- Business Intelligence يبقى العرض الافتراضي.
- Process Intelligence المنشور مباشرة: `/ENJAZ/live/app/insights?view=process`.

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
- **Phase 9.6 — Process Mining & Predictive Operations — M18: ✅ CLOSED + exact-main + Real Browser + Pages + Live External certified.**
- **Phase 9.7 — Intelligence Zero-Escape Gate: AUTHORIZED NEXT.**

## Phase 9.6 — دليل الإغلاق

- Phase 9.5 formal-closure base: `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.
- certified Phase 9.6 implementation/deployment main: `d92059530275ff70e02a05c4f4c1ef930cb1750a`.
- M18 registry status: **ACTIVE**؛ anchors الرسمية: `9, 15`؛ global closure: **FORBIDDEN** حتى Phase 15.
- authority: **READ_ONLY_DERIVED FROM SOURCE-OWNED HISTORY**.
- path sources: `workflow_transition_events`, `transaction_activity`, `field_assignments`, `field_visits`, `field_visit_evidence`.
- `field_sync_receipts`: **ACTOR_SCOPED_INTEGRITY_ONLY_NOT_PATH_INPUT**.
- shadow process store / browser-owned persistence / fabricated timestamps / fabricated strict order / cross-workspace composition: **FORBIDDEN**.
- equal-time evidence: **EXPLICIT_PARTIAL_ORDER**.
- next-activity method: `empirical_next_activity_frequency`.
- delay method: `empirical_wait_threshold_frequency`.
- prediction authority: **DIRECTIONAL_NON_AUTHORITATIVE** مع method/confidence/sample/evidence disclosure.
- Real Cloud: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**؛ migration `20260912105428`.
- foundation / source-service / runtime parity / UI destruction: **20/20 + 12/12 + 3/3 + 12/12 PASS**.
- functional regression: **218/218 PASS**.
- exact-main implementation baseline: **27/27 SUCCESS**؛ failures/queued/in-progress: **0/0/0**.
- Phase 9.6 Gate `34705494680`: **SUCCESS**.
- Phase 9.6 Real Browser `34705494809`: **SUCCESS** على **1280 / 430 / 390 / 360 / 320**.
- cumulative Real Browser `34705494731`: **SUCCESS**.
- Pages Preview `34705526787`: **SUCCESS**.
- Live External `34705561853`: **SUCCESS**.
- deployed `/ENJAZ/live/app/insights?view=process`: **6/6 PASS**.
- final root build: initial JS **571029 / 670000**، total JS **759487 / 760000**، CSS **179984 / 180000**.
- final Pages `/live/` build: initial JS **571051 / 670000**، total JS **759509 / 760000**، CSS **179984 / 180000**.
- Product / UI/UX / Engineering / Certification: **PASS / PASS / PASS / PASS**.
- unresolved / critical / high / functional blockers: **0 / 0 / 0 / 0**.
- Phase 9.7: **AUTHORIZED NEXT** بعد formal-closure merge + exact-main recertification.

## Phase 9.5 — دليل الإغلاق المحفوظ

- implementation PR #139: **MERGED** → `ee62353621701c788b3c96ae8172a59b6f95022d`.
- canonical deep-link / Pages fallback hotfix PR #140: **MERGED** → `ce1a4566f48ebcacfde8a8c5b7dd680b6b23a672`.
- Live External certification-semantics PR #141: **MERGED** → runtime-certified main `8d9f1bd4403656f7b8d061b843178708b3899044`.
- runtime-certified exact-main push workflows: **25/25 SUCCESS**؛ failures/queued/in-progress: **0/0/0**.
- Pages Preview `34686334396`: **SUCCESS**؛ Live External `34686380088`: **SUCCESS**.
- deployed `/ENJAZ/live/app/insights` direct-load + reload matrix: **7/7 PASS**.
- Real Cloud source composition: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**.
- formal closure PR #142 merged to `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.

## قانون ذكاء الأعمال — Phase 9.5

- BI authority: **READ_ONLY_DERIVED**؛ لا shadow BI persistence.
- source provenance: **REQUIRED** لكل KPI/trend/forecast.
- المال الدقيق: **BIGINT_CENTS** من سلطة Finance القائمة؛ لا parallel ledger ولا shadow money store.
- forecast authority: **DIRECTIONAL_NON_AUTHORITATIVE** مع method/confidence/sample/horizon/assumptions disclosure.
- trailing run-rate مسموح فقط للـ`count` و`cents`؛ ratios/durations تفشل fail-closed.
- fabricated history، silent missing-data substitution، cross-workspace aggregation وdirect browser source mutation: **FORBIDDEN**.

## قانون M13 بعد إغلاق 9.5

إغلاق Phase 9.5 يغلق **مرساة Phase 9 فقط** من M13 ولا يغلق النظام الكبير عالميًا. M13 يبقى `ACTIVE` لأن مرساته الثانية هي Phase 15، و`closureEvidence` يبقى `null` حتى اكتمال hardening و`ZERO_ESCAPE_V1` المستقل.

## قانون M18 بعد إغلاق 9.6

إغلاق Phase 9.6 يغلق **مرساة Phase 9 فقط** من M18. M18 يبقى `ACTIVE` لأن مرساته الثانية Phase 15؛ لا يجوز وضع `closureEvidence` عالمي له أو ترقيته إلى `CLOSED` قبل اكتمال مرساة Phase 15 وZero-Escape المستقل.

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
13. **M13 — Business Intelligence & Forecasting Center** — `ACTIVE`; Phase 9 anchor CLOSED، Phase 15 remains open.
14. **M14 — Backup, Restore & Workspace Portability** — `PLANNED`.
15. **M15 — Multi-Branch, Departments & Team Operating Model** — `ACTIVE`.
16. **M16 — Engagements, Contracts & Retainers** — `PLANNED`.
17. **M17 — Smart Intake Forms & Secure Submission Links** — `ACTIVE`.
18. **M18 — Process Mining & Predictive Operations** — `ACTIVE`; Phase 9.6 anchor CLOSED، Phase 15 remains open، `closureEvidence=null`.

لا يتم ترقية أي M-system إلى `CLOSED` لمجرد نجاح مرحلة واحدة؛ يحتاج شهادة Zero-Escape الخاصة به بعد اكتمال جميع anchors.

## مصادر الخطة والحوكمة

- [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md)
- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md)
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json)
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md)
- [`docs/PHASE9_4_CLOSURE.md`](docs/PHASE9_4_CLOSURE.md)
- [`docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_5_CLOSURE.md`](docs/PHASE9_5_CLOSURE.md)
- [`docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_6_KICKOFF.md`](docs/PHASE9_6_KICKOFF.md)
- [`docs/PHASE9_6_STATE.json`](docs/PHASE9_6_STATE.json)
- [`docs/PHASE9_6_CLOSURE.md`](docs/PHASE9_6_CLOSURE.md)
- [`docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md)

## قوانين الانتقال

- لا يبدأ successor قبل إغلاق predecessor وإعادة تصديقه على `main` والنشر.
- لا تُغلق أي مرحلة ما لم تكن Product / UI/UX / Engineering / Certification كلها `PASS`.
- كل bug حقيقي يحصل على regression guard دائم.
- Gate Escape يعيد فتح مسار التصديق المتأثر بدل تجاهله.
- Supabase/Postgres/RLS يبقى مصدر الحقيقة للسلطة الدائمة.
- لا يُسمح لأي intelligence layer باختلاق business/financial/process facts من بيانات ناقصة.
- forecast/prediction لا يصبح source truth، ولا AI/editorial output يصبح authoritative fact بلا عقد سلطة مستقل.
- سقف JavaScript startup يبقى **670000 bytes**، والإجمالي **760000 bytes**، وCSS **180000 bytes** بلا waiver أو feature cut.
- **Phase 9.6 مغلقة؛ Phase 9.7 هي المرحلة التالية المصرح بها فقط بعد exact-main recertification للـformal-closure merge.**
