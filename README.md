# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 ✅ CLOSED + POST-MERGE / PUBLISHED-LIVE RECERTIFIED**  
آخر مرحلة مغلقة: **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 ✅ CLOSED**  
المرحلة التالية المصرح بها: **Phase 9.5 — Business Intelligence & Forecasting Center — M13 — AUTHORIZED NEXT**.

ENJAZ مشروع مستقل مبني من الصفر بواجهة حديثة وبنية Supabase/Postgres + RLS، ومن دون إعادة إحياء legacy UI/runtime DNA.

## دستور الجودة الأعلى

الميثاق الحاكم الأعلى للمشروع هو [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md).

**Product → UI/UX → Engineering → Certification**

لا تُغلق أي مرحلة ولا يُفتح successor إلا عندما تصبح المسارات الأربعة `PASS`. الواجهة يجب أن تبقى premium وموحدة وArabic/RTL/mobile-first، والكود typed/modular/maintainable، ومصدر الحقيقة وصلاحياته حقيقيان، والإغلاق يحتاج Real Cloud + Real Browser + deployed-live evidence. سقف الأداء حارس جودة وليس مبررًا لحذف ميزة أو إضعاف UX.

## التطبيق الحقيقي

- Live runtime: `https://yaldisstore-bit.github.io/ENJAZ/live/`
- الجذر `/ENJAZ/` سطح QA/Preview تاريخي؛ العقد الإنتاجي الحي يُتحقق منه عبر `/live/`.

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
- **Phase 9.5 — Business Intelligence & Forecasting Center — M13: AUTHORIZED NEXT.**
- **Phase 9.6+ تبقى LOCKED** حتى إغلاق 9.5 وفق Zero-Escape.

## Phase 9.4 — دليل الإغلاق

- implementation PR #137: **MERGED**.
- certified implementation merge: `b72dbff8bb1dfb1afbce82ececd265bf2d5544ed`.
- exact-main push workflows: **23/23 SUCCESS**؛ failures **0**.
- exact-main Phase 9.4 gate `34677681118`: **SUCCESS**.
- exact-main cumulative Real Browser `34677681129`: **SUCCESS**.
- browser matrix: **1280 / 430 / 390 / 360 / 320 PASS**.
- functional regression: **217/217 PASS**.
- database audit: **PASS**؛ self-test **25/25 PASS**.
- Real Cloud persistence: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**.
- phase-owned security-advisor warnings: **0**.
- phase-owned unindexed foreign keys: **0**.
- Pages Preview `34677705458`: **SUCCESS**.
- Live External `34677729775`: **SUCCESS** على `/ENJAZ/live/`، بما فيها `/live/app/knowledge`.
- Product / UI/UX / Engineering / Certification: **PASS / PASS / PASS / PASS**.
- unresolved / critical / high / functional blockers: **0 / 0 / 0 / 0**.

### ميزانية الإنتاج بعد 9.4

السقف الصلب بقي **670000 bytes** ولم يُرفع ولم تُحذف أي ميزة للحصول على PASS.

Root production:

- initial JavaScript: **569443 / 670000 PASS**.
- total JavaScript: **724028 / 760000 PASS**.
- largest lazy chunk: **69454 / 140000 PASS**.
- CSS: **179984 / 180000 PASS**.

Pages `/live/`:

- initial JavaScript: **569465 / 670000 PASS**.
- total JavaScript: **724050 / 760000 PASS**.
- largest lazy chunk: **69454 / 140000 PASS**.
- CSS: **179984 / 180000 PASS**.

## قانون الحقيقة التنظيمية — Phase 9.4

- official source provenance: **REQUIRED**.
- التاريخ الرسمي append/version/effective-dated ولا يسمح overwrite هدّام.
- official-global ingestion: **SERVICE_ROLE_ONLY**.
- workspace-curated mutation: **OWNER_RPC_ONLY**.
- direct browser sensitive DML: **FORBIDDEN**.
- official global وworkspace-curated truth يبقيان منفصلين.
- AI summaries وeditorial interpretation دائمًا `authoritative=false`.
- citation لا يُنشأ بلا source/version/provenance حقيقية.
- Arabic search normalization مشتقة ولا تغيّر الحقيقة الرسمية.

## قانون M8 بعد إغلاق 9.4

إغلاق Phase 9.4 يغلق **مرساة Phase 9 فقط** من M8 ولا يغلق النظام الكبير عالميًا. M8 يبقى `ACTIVE` لأن مرساته الثانية هي Phase 12، ولا يصبح `CLOSED` إلا بعد اكتمال مرساته المتبقية وشهادة `ZERO_ESCAPE_V1` الخاصة به.

## Major Product Systems — M1–M18

1. **M1 — Government Procedure Operating System** — `CLOSURE_CANDIDATE`.
2. **M2 — Corporate Governance & Ownership Engine** — `CLOSURE_CANDIDATE`.
3. **M3 — Client Portal**.
4. **M4 — Omnichannel Communications Hub**.
5. **M5 — ENJAZ Field Operations / Runner Mode** — `CLOSURE_CANDIDATE`.
6. **M6 — Service Catalog, CRM & Commercial Intake** — `CLOSURE_CANDIDATE`.
7. **M7 — Document Factory & Official Form Engine**.
8. **M8 — Regulatory / Knowledge Base Engine** — `ACTIVE`; Phase 9 anchor CLOSED + published-live certified، والمرساة الثانية تبقى Phase 12.
9. **M9 — Agentic ENJAZ Copilot**.
10. **M10 — Scheduling, Appointments & Deadline Engine**.
11. **M11 — Integration Platform / API / Webhooks**.
12. **M12 — Compliance, Audit & Evidence Center**.
13. **M13 — Business Intelligence & Forecasting Center** — Phase 9.5 `AUTHORIZED NEXT`.
14. **M14 — Backup, Restore & Workspace Portability**.
15. **M15 — Multi-Branch, Departments & Team Operating Model** — `ACTIVE`.
16. **M16 — Engagements, Contracts & Retainers**.
17. **M17 — Smart Intake Forms & Secure Submission Links** — `ACTIVE`.
18. **M18 — Process Mining & Predictive Operations**.

لا يتم ترقية أي M-system إلى `CLOSED` لمجرد نجاح فرع مرحلة؛ يحتاج شهادة Zero-Escape الخاصة به.

## مصادر الخطة والحوكمة

- [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md) — دستور الجودة الأعلى.
- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة حتى `ENJAZ 1.0 — Delivered`.
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json) — سجل M1–M18 machine-readable.
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md) — Zero-Escape للأنظمة الكبيرة.
- [`docs/PHASE9_4_KICKOFF.md`](docs/PHASE9_4_KICKOFF.md)
- [`docs/PHASE9_4_STATE.json`](docs/PHASE9_4_STATE.json)
- [`docs/PHASE9_4_REAL_CLOUD_EVIDENCE.md`](docs/PHASE9_4_REAL_CLOUD_EVIDENCE.md)
- [`docs/PHASE9_4_CLOSURE.md`](docs/PHASE9_4_CLOSURE.md)
- [`docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md)

## قوانين الانتقال

- لا يبدأ successor قبل إغلاق predecessor وإعادة تصديقه على `main` والنشر.
- لا تُغلق أي مرحلة ما لم تكن Product / UI/UX / Engineering / Certification كلها `PASS`.
- كل bug حقيقي يحصل على regression guard دائم.
- Gate Escape يعيد فتح مسار التصديق المتأثر بدل تجاهله.
- Supabase/Postgres/RLS يبقى مصدر الحقيقة للسلطة الدائمة.
- لا يُسمح لأي طبقة intelligence أو governance أو knowledge باختلاق business/legal facts من بيانات ناقصة.
- النص الرسمي والـstructured regulatory facts يبقيان منفصلين عن AI/editorial derived content.
- سقف JavaScript الإنتاجي يبقى **670000 bytes** ما لم يُغيّر بعقد حوكمة مستقل؛ Phase 9.4 لم ترفعه.
- **Phase 9.5 هي الخليفة الوحيدة المصرح بها الآن؛ Phase 9.6+ مقفلة حتى إغلاق 9.5.**
