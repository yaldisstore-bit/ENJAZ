# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 9.3 — Corporate Governance & Ownership Engine — M2 ✅ CLOSED + POST-MERGE RECERTIFIED**  
آخر مرحلة مغلقة: **Phase 9.3 — Corporate Governance & Ownership Engine — M2**  
المرحلة التالية المصرح بها: **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation**.

ENJAZ مشروع مستقل مبني من الصفر بواجهة حديثة وبنية Supabase/Postgres + RLS، ومن دون إعادة إحياء legacy UI/runtime DNA.

## دستور الجودة الأعلى

الميثاق الحاكم الأعلى للمشروع هو [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md). معيار إنجاز ليس نجاح جانب واحد من المشروع؛ كل مرحلة يجب أن تمر بأربعة مسارات إلزامية معًا:

**Product → UI/UX → Engineering → Certification**

لا تُغلق أي مرحلة ولا يُفتح successor إلا عندما تصبح المسارات الأربعة `PASS`. واجهة جميلة لا تعوّض كودًا ضعيفًا، والكود القوي لا يعوّض تجربة مستخدم رخيصة، ونجاح قاعدة البيانات لا يعوّض نقص المنتج أو غياب الاختبار الحقيقي.

الواجهة يجب أن تبقى premium وموحدة وArabic/RTL/mobile-first، والمواصفات يجب أن تكون كاملة ومترابطة end-to-end، والكود يجب أن يبقى typed/modular/maintainable مع مصدر حقيقة واحد وصلاحيات حقيقية، والإغلاق يحتاج Real Cloud + Real Browser + deployed-live evidence. سقف الأداء/JavaScript حارس جودة وليس مبررًا لحذف ميزة معتمدة أو إضعاف UX؛ استعادة الهامش تبدأ من architecture/code-splitting/deduplication/refactor قبل أي تنازل في المنتج.

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
- Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence: ✅ CLOSED + post-merge recertified.
- **Phase 9.3 — Corporate Governance & Ownership Engine — M2: ✅ CLOSED + POST-MERGE RECERTIFIED.**
- **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation: AUTHORIZED NEXT.**
- **Phase 9.5 وما بعدها: LOCKED** حتى إغلاق 9.4 وفق Zero-Escape.

## Phase 9.3 — دليل الإغلاق

- implementation PR #134: **MERGED**.
- canonical runtime SHA: `1c38e388285b1c566d202258d78aadb1b85b9342`.
- exact-main Phase 9.3 gate `34571138932`: **SUCCESS**.
- exact-main Real Browser `34571138982`: **SUCCESS**، بما فيه Governance على 1280/430/390/360/320.
- Pages build/deployment `34571138262`: **SUCCESS**.
- Pages Preview `34571185394`: **SUCCESS**.
- Live External `34571241122`: **SUCCESS** على `/ENJAZ/live/`.
- Real Cloud governance verification: **PASS_ZERO_RESIDUE** مع 0 phase-owned security-advisor warnings و0 unindexed foreign keys.
- Product / UI/UX / Engineering / Certification: **PASS / PASS / PASS / PASS**.
- unresolved / critical / high / functional blockers: **0 / 0 / 0 / 0**.
- `phase9_4Allowed=true`; Phase 9.4 هي الخليفة الوحيدة المصرح بها.

### ميزانية الإنتاج بعد 9.3

السقف الصلب بقي **670000 bytes** ولم يُرفع. تم حل مشكلة هامش 2 bytes السابقة معماريًا عبر lazy domain portals بدل حذف الميزات:

- root initial JavaScript: **563507 / 670000 PASS**.
- Pages `/live/` initial JavaScript: **563529 / 670000 PASS**.
- Pages total JavaScript: **705804 / 760000 PASS**.
- largest lazy chunk: **69454 / 140000 PASS**.
- feature cuts / budget waiver: **NONE**.

## Phase 9.4 — العقد المصرح به

Phase 9.4 يؤسس **M8 — Regulatory / Knowledge Base Engine**: قوانين، أنظمة، تعليمات، تعاميم ومعرفة إجرائية منظمة مع مصدر واضح ونسخة وتواريخ نشر/نفاذ/استبدال. النص الرسمي والحقائق التنظيمية يجب أن يبقيا منفصلين عن الشرح أو التلخيص أو المحتوى المولد بالذكاء الاصطناعي؛ لا يجوز لأي AI output أن يصبح مصدرًا قانونيًا authoritative بذاته.

بداية 9.4 يجب أن تبقى fail-closed في provenance/version/effective dates، وتحافظ على history غير هدّامة، وعزل workspace/RLS، والبحث العربي الموثق بالمصدر. Phase 9.5 تبقى مقفلة حتى اكتمال شهادة 9.4 الخاصة بها.

## Major Product Systems — M1–M18

هذه أنظمة منتج حاكمة وليست أفكارًا اختيارية. إغلاق Phase لا يغلق M-system تلقائيًا؛ سياسة `ZERO_ESCAPE_V1` المستقلة تبقى المرجع.

1. **M1 — Government Procedure Operating System** — `CLOSURE_CANDIDATE`.
2. **M2 — Corporate Governance & Ownership Engine** — Phase 9.3 implementation anchor complete; global closure remains subject to `ZERO_ESCAPE_V1`.
3. **M3 — Client Portal**.
4. **M4 — Omnichannel Communications Hub**.
5. **M5 — ENJAZ Field Operations / Runner Mode** — `CLOSURE_CANDIDATE`.
6. **M6 — Service Catalog, CRM & Commercial Intake** — `CLOSURE_CANDIDATE`.
7. **M7 — Document Factory & Official Form Engine**.
8. **M8 — Regulatory / Knowledge Base Engine** — Phase 9.4 foundation is the authorized next anchor; M8 also continues in Phase 12.
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

لا يتم ترقية أي M-system إلى `CLOSED` لمجرد نجاح فرع مرحلة؛ يحتاج شهادة Zero-Escape الخاصة به.

## مصادر الخطة والحوكمة

- [`ENJAZ_NON_NEGOTIABLE_RULES.md`](ENJAZ_NON_NEGOTIABLE_RULES.md) — دستور الجودة الأعلى.
- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة حتى `ENJAZ 1.0 — Delivered`.
- [`docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`](docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json) — سجل M1–M18 machine-readable.
- [`docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`](docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md) — Zero-Escape للأنظمة الكبيرة.
- [`docs/PHASE9_1_STATE.json`](docs/PHASE9_1_STATE.json)
- [`docs/PHASE9_1_CLOSURE.md`](docs/PHASE9_1_CLOSURE.md)
- [`docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_2_STATE.json`](docs/PHASE9_2_STATE.json)
- [`docs/PHASE9_2_CLOSURE.md`](docs/PHASE9_2_CLOSURE.md)
- [`docs/PHASE9_2_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_2_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE9_3_KICKOFF.md`](docs/PHASE9_3_KICKOFF.md)
- [`docs/PHASE9_3_STATE.json`](docs/PHASE9_3_STATE.json)
- [`docs/PHASE9_3_CLOSURE.md`](docs/PHASE9_3_CLOSURE.md)
- [`docs/PHASE9_3_POSTMERGE_RECERTIFICATION.md`](docs/PHASE9_3_POSTMERGE_RECERTIFICATION.md)

## قوانين الانتقال

- لا يبدأ successor قبل إغلاق predecessor وإعادة تصديقه على `main` والنشر.
- لا تُغلق أي مرحلة ما لم تكن Product / UI/UX / Engineering / Certification كلها `PASS`.
- كل bug حقيقي يحصل على regression guard دائم.
- Gate Escape يعيد فتح مسار التصديق المتأثر بدل تجاهله.
- Supabase/Postgres/RLS يبقى مصدر الحقيقة للسلطة الدائمة.
- لا يُسمح لأي طبقة intelligence أو governance أو knowledge باختلاق business/legal facts من بيانات ناقصة.
- سقف JavaScript الإنتاجي يبقى **670000 bytes** ما لم يُغيّر بعقد حوكمة صريح مستقل؛ Phase 9.3 لم ترفعه.
- Phase 9.4 وحدها مصرح بها الآن؛ Phase 9.5+ تبقى مقفلة حتى إغلاقها وفق البوابات نفسها.
