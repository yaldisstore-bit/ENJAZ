# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 5 — Transactions Core ✅ CLOSED**  
آخر مرحلة مغلقة: **Phase 5.5 — Transaction Destruction Gate ✅**  
التالي المسموح: **Phase 6.1 — Companies**.

إنجاز مشروع مستقل مبني من الصفر بهوية وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية المعتمدة دون نقل واجهات أو runtime أو legacy UI DNA من الأجيال السابقة.

## المصدر القانوني للخطة

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — الخطة الحاكمة من Phase 0 حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.
- [`docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json`](docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json) — حالة Phase 5.5 الآلية.
- [`docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md`](docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md) — أدلة الإغلاق قبل الدمج.
- [`docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md`](docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md) — إعادة اعتماد `main` بعد الدمج وقرار فتح Phase 6.1.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو بدء مرحلة لاحقة قبل نجاح بوابة المرحلة الحالية وتسجيل قرار الانتقال في المستودع.

## حالة المراحل

- **Phase 0 — Specification Freeze** ✅
- **Phase 1 — Engineering Foundation** ✅
- **Phase 2 — ENJAZ Design System 1.0** ✅ frozen
  - **Phase 2.8 — Visual Destruction & Quality Gate** ✅
- **Phase 3 — Application Shell & Navigation** ✅
  - **Phase 3.1 — App Shell** ✅
  - **Phase 3.2 — Navigation Architecture** ✅
  - **Phase 3.3 — Global Interaction Surfaces** ✅
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
- **Next: Phase 6.1 — Companies**

## أدلة Phase 4 وPhase 5

- [`docs/PHASE4_2_DAILY_WORK_CLOSURE.md`](docs/PHASE4_2_DAILY_WORK_CLOSURE.md)
- [`docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md`](docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md)
- [`docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md`](docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md)
- [`docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md`](docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md)
- [`docs/PHASE5_2_TRANSACTION_CREATE_EDIT_CLOSURE.md`](docs/PHASE5_2_TRANSACTION_CREATE_EDIT_CLOSURE.md)
- [`docs/PHASE5_3_TRANSACTION_DETAILS_360_CLOSURE.md`](docs/PHASE5_3_TRANSACTION_DETAILS_360_CLOSURE.md)
- [`docs/PHASE5_4_ARCHIVE_RESTORE_LIFECYCLE_CLOSURE.md`](docs/PHASE5_4_ARCHIVE_RESTORE_LIFECYCLE_CLOSURE.md)
- [`docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md`](docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md)
- [`docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md`](docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md)

## Phase 5.5 — النتيجة الرسمية

Phase 5.5 لم تكن بوابة شكلية. أثناء التدمير تم اكتشاف وإصلاح عيوب فعلية في مسار المعاملات، أهمها:

- منع same-tick double submit بحارس mutation متزامن.
- تثبيت UUID لعملية الإنشاء حتى يصبح retry idempotent.
- منع تكرار/فقد route وnote وactivity عند unknown write outcome باستخدام IDs حتمية مشتقة من العملية والتحقق قبل الكتابة.
- استعادة محاولة الإنشاء غير المحسومة بعد refresh داخل `sessionStorage` لنفس المستخدم/التبويب.
- قفل الـdraft عند `DATA_OUTCOME_UNKNOWN` حتى يعاد إرسال نفس العملية بدل تغيير payload غير مؤكدة.
- إبقاء نموذج الحفظ والـdraft ظاهرين عند فشل الحفظ بدل استبدالهما بحالة load error.
- تحويل حارس payload-drift من فحص عبارة نصية هشة إلى اختبار semantic للتعارض الحقيقي.

النتيجة قبل الدمج: **19/19 workflows SUCCESS، unresolved destructive defects = 0** على Closure Candidate.

PR #79 دُمجت في `main` بالـcommit:

`218a7bb85ff6098d9a3642063c6c406a57917e86`

ثم أُعيد اعتماد الـcommit المدموج نفسه، لا رأس الـPR فقط، وكانت النتيجة **8/8 post-merge workflows SUCCESS، 0 failures**، وتشمل Quality، Governance، Canonical Promotion، WCAG، Real Browser حتى Production Bridge، Pages، وLive External Chromium/WCAG على التطبيق المنشور.

لذلك **Phase 5 مغلقة رسميًا وPhase 6.1 هي المرحلة التالية المسموحة**.

## حدود البنية والأمان التي تستمر إلى المراحل التالية

- `main` هو المصدر القانوني بعد الدمج.
- canonical runtime يبقى `ui-r2` ما لم تغيّره مرحلة موثقة صراحةً.
- Legacy-Zero إلزامي؛ لا عودة إلى `src/ui-v2` أو `src/ui-rebirth` أو DNA الأجيال القديمة.
- Feature parity المجمدة تبقى محمية؛ لا يجوز إسقاط قدرة قائمة بصمت أثناء بناء المجالات الجديدة.
- Supabase/Postgres + RLS وData Layer الموثوقة هي حدود البيانات؛ لا عميل أو secret موازي داخل feature UI.
- كل bug حقيقي يُكتشف يضاف له regression guard.
- لا تُقبل smoke tests وحدها كدليل انتقال مرحلة.
- Mobile/RTL/Android keyboard/back/safe-area وaccessibility جزء من عقد الجودة، لا تحسينات اختيارية.

## المختبرات ومساحات الإثبات

- `/foundation/identity` — 2.1
- `/foundation/tokens` — 2.2
- `/foundation/typography` — 2.3
- `/foundation/components` — 2.4
- `/foundation/motion` — 2.5
- `/foundation/mobile` — 2.6
- `/foundation/patterns` — 2.7
- `/foundation/destruction` — 2.8
- `/foundation/shell` — 3.1
- `/foundation/navigation` — 3.2
- `/foundation/interactions` — 3.3
- `/foundation/shell-destruction` — 3.4
- `/foundation/home` — 4.1
- canonical R2 fixture/runtime gates — Phase 4 + Phase 5 cumulative proof

## ملاحظة التطوير

التطوير المرحلي يتم على فرع مخصص ثم PR إلى `main` مع البوابات التراكمية. **Phase 5.1–5.5 مغلقة ✅. Phase 6.1 — Companies هي الخطوة التالية المسموحة، ولم تبدأها وثيقة إعادة الاعتماد نفسها.**
