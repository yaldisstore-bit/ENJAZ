# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 6.4 — Companies & People Destruction Gate ✅ CLOSED**  
آخر مرحلة مغلقة: **Phase 6.4 — Companies & People Destruction Gate ✅**  
التالي المسموح: **Phase 7.1 — Financial Ledger & Summary**.

إنجاز مشروع مستقل مبني من الصفر بهوية وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية المعتمدة دون نقل واجهات أو runtime أو legacy UI DNA من الأجيال السابقة.

## المصدر القانوني للخطة

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة من Phase 0 حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.
- [`docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json`](docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json)
- [`docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md`](docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md)
- [`docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md`](docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE6_1_COMPANIES_STATE.json`](docs/PHASE6_1_COMPANIES_STATE.json)
- [`docs/PHASE6_1_COMPANIES_CLOSURE.md`](docs/PHASE6_1_COMPANIES_CLOSURE.md)
- [`docs/PHASE6_1_POSTMERGE_RECERTIFICATION.md`](docs/PHASE6_1_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json`](docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json)
- [`docs/PHASE6_2_LAWYERS_CONTACTS_CLOSURE.md`](docs/PHASE6_2_LAWYERS_CONTACTS_CLOSURE.md)
- [`docs/PHASE6_2_POSTMERGE_RECERTIFICATION.md`](docs/PHASE6_2_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json`](docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json)
- [`docs/PHASE6_3_COMPANY_LAWYER_360_CLOSURE.md`](docs/PHASE6_3_COMPANY_LAWYER_360_CLOSURE.md)
- [`docs/PHASE6_3_POSTMERGE_RECERTIFICATION.md`](docs/PHASE6_3_POSTMERGE_RECERTIFICATION.md)
- [`docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json`](docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json)
- [`docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_CLOSURE.md`](docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_CLOSURE.md)
- [`docs/PHASE6_4_POSTMERGE_RECERTIFICATION.md`](docs/PHASE6_4_POSTMERGE_RECERTIFICATION.md)

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو بدء مرحلة لاحقة قبل نجاح بوابة المرحلة الحالية وتسجيل قرار الانتقال في المستودع.

## حالة المراحل

- **Phase 0 — Specification Freeze** ✅
- **Phase 1 — Engineering Foundation** ✅
- **Phase 2 — ENJAZ Design System 1.0** ✅ frozen
  - **Phase 2.8 — Visual Destruction & Quality Gate** ✅
- **Phase 3 — Application Shell & Navigation** ✅
  - **Phase 3.4 — Shell Destruction Gate** ✅
- **Phase 4 — Home, Daily Work & Executive Overview** ✅
  - **Phase 4.1 — Home / Dashboard** ✅ complete
  - **Phase 4.2 — Daily Work / Universal Inbox** ✅ complete
  - **Phase 4.3 — Executive Briefing** ✅ complete
  - **Phase 4.4 — Home Destruction Gate** ✅ complete
- **Phase 5 — Transactions Core** ✅
  - **Phase 5.1 — Transaction List & Search** ✅ complete
  - **Phase 5.2 — Transaction Create/Edit** ✅ complete
  - **Phase 5.3 — Transaction Details / 360°** ✅ complete
  - **Phase 5.4 — Archive/Restore/Lifecycle** ✅ complete
  - **Phase 5.5 — Transaction Destruction Gate** ✅ complete
- **Phase 6 — Companies & People** ✅
  - **Phase 6.1 — Companies** ✅ complete
  - **Phase 6.2 — Lawyers / Contacts** ✅ complete
  - **Phase 6.3 — Company / Lawyer 360°** ✅ complete
  - **Phase 6.4 — Companies & People Destruction Gate** ✅ complete
- **Next: Phase 7.1 — Financial Ledger & Summary**

## الإغلاق الكانوني للمراحل الأخيرة

### Phase 5.5

Phase 5.5 أُغلقت بعد **19/19 workflows SUCCESS** ثم إعادة اعتماد `main` بنتيجة **8/8 post-merge workflows SUCCESS، 0 failures**. الأدلة التفصيلية محفوظة في ملفات الحالة والإغلاق وإعادة الاعتماد أعلاه.

### Phase 6.1 — Companies

قبل الدمج اجتازت Phase 6.1 **20/20 workflows SUCCESS** مع Chromium وQuality وGovernance وWCAG وReal Browser حتى Production Bridge. أُعيد اعتماد `main@6d70069995164500b3c05b027145bcdfed96e877` بنتيجة **8/8 post-merge workflows SUCCESS، 0 failures**، بما فيها النسخة المنشورة.

### Phase 6.2 — Lawyers / Contacts

قبل الدمج اجتازت Phase 6.2 **21/21 workflows SUCCESS**، واختبارات model/service، وfull regression، وReal Chromium، وstrict production JS budget `669889/670000`. أُعيد اعتماد `main@e35555237d6a631e55a0c248bea0f22d0cbd0c37` بنتيجة **8/8 post-merge workflows SUCCESS، 0 failures**، بما فيها النسخة المنشورة.

### Phase 6.3 — Company / Lawyer 360°

أُغلقت Phase 6.3 بعد بناء سطح 360° موحد ومقروء فقط للشركة والمحامي/جهة الاتصال من مصادر الحقيقة المعتمدة في Phase 6.1 وPhase 6.2.

قبل الدمج اجتاز رأس التنفيذ `c3d8d886424c52113b8bf78bdace95528f429c5f`:

- **22/22 workflows SUCCESS**
- Phase 6.3 composition audit + 3/3 entity360 tests — PASS
- full functional regression 144/144 — PASS
- strict production JS budget `669997/670000` — PASS دون رفع الحد
- Real Chromium Phase 6.3 — **7/7 PASS**
- cumulative Phase 6.1/6.2, Quality, Governance, WCAG, Legacy-Zero, Destruction Wave 1/2، وReal Browser حتى Production Bridge — PASS

بعد دمج PR #85 كشفت إعادة الاعتماد مشكلة في verifier الخاص بـPages: قياس production bridge على `/ENJAZ/` أضاف ستة بايتات لمسار base وأظهر `670003/670000` بدل الحجم الكانوني `669997/670000`. لم يتغير التطبيق ولم يُرفع السقف؛ PR #86 صححت verifier فقط واجتازت **23/23 workflows SUCCESS**.

الهدف الكانوني النهائي المعاد اعتماده:

`46165bfc9f3237b7ff77e7ca11baed3272910831`

النتيجة: **9/9 post-merge workflows SUCCESS، 0 failures**. نجح Real Browser حتى Production Bridge ونجح Live External النهائي `34039447623` بما فيه `Attack the actual published application`. تشغيل Live External الأقدم `34039399127` أُلغي تلقائياً بعد استبداله بنشر Pages الأحدث، ثم نجح التشغيل النهائي البديل بالكامل.

### Phase 6.4 — Companies & People Destruction Gate

أُغلقت Phase 6.4 بعد تدمير نطاق الشركات والأشخاص والعلاقات و360° فعليًا. كُشف defect حقيقي `P6-4-RELATION-INVALID-DATE` كان يسمح للتاريخ التالف بأن يُفهم كعلاقة حالية، وتم إصلاحه بحارس fail-closed واختبار regression دائم.

قبل الدمج اجتاز رأس الإغلاق:

- **23/23 workflows SUCCESS، 0 failures**
- Phase 6.4 model/service destruction — **28/28 PASS**
- full functional regression — **153/153 PASS**
- database audit — **45 tables / 118 RLS policies / 42 indexes** + **5/5 corruption selftests**
- dedicated Real Chromium destruction — **8/8 PASS** على 1280/430/390/360/320
- strict production JS budget — `669966/670000` PASS دون رفع الحد

دُمج PR #88 في `main` بالـcommit:

`bd5d66a4e5e7e9e1a47dfa12a2d710dd0ce4537a`

ثم أُعيد اعتماد الـcanonical `main` بنتيجة **8/8 post-merge workflows SUCCESS، 0 failures، 0 in-progress**، بما فيها Quality وGovernance وCanonical Promotion وWCAG وPages Preview وReal Browser حتى Production Bridge وLive External ضد النسخة المنشورة.

لذلك **Phase 6.4 مغلقة رسميًا، وPhase 6 بالكامل مغلقة ✅، وPhase 7.1 — Financial Ledger & Summary هي المرحلة التالية والوحيدة المسموحة**.

## حدود البنية والأمان التي تستمر إلى المراحل التالية

- `main` هو المصدر القانوني بعد الدمج.
- canonical runtime يبقى `ui-r2` ما لم تغيّره مرحلة موثقة صراحةً.
- Legacy-Zero إلزامي؛ لا عودة إلى DNA الأجيال القديمة.
- Feature parity المجمدة تبقى محمية؛ لا يجوز إسقاط قدرة قائمة بصمت أثناء بناء المجالات الجديدة.
- Supabase/Postgres + RLS وData Layer الموثوقة هي حدود البيانات.
- كل bug حقيقي يُكتشف يضاف له regression guard.
- لا تُقبل smoke tests وحدها كدليل انتقال مرحلة.
- Mobile/RTL/Android keyboard/back/safe-area وaccessibility جزء من عقد الجودة.

## ملاحظة التطوير

التطوير المرحلي يتم على فرع مخصص ثم PR إلى `main` مع البوابات التراكمية. **Phase 5.1–5.5 وPhase 6.1–6.4 مغلقة ✅. Phase 7.1 — Financial Ledger & Summary هي الخطوة التالية المسموحة، ولا تُعتبر منفذة حتى يبدأ فرعها وعقدها الخاصان.**