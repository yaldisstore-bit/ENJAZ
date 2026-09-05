# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 5.1 — Transaction List & Search ✅**  
آخر مرحلة مغلقة: **Phase 5.1 — Transaction List & Search ✅**.  
التالي المسموح: **Phase 5.2 — Transaction Create/Edit**، ولم تبدأ بعد.

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.
- [`docs/PHASE4_2_DAILY_WORK_CLOSURE.md`](docs/PHASE4_2_DAILY_WORK_CLOSURE.md) — أدلة إغلاق Daily Work / Universal Inbox.
- [`docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md`](docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md) — أدلة إغلاق Executive Briefing.
- [`docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md`](docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md) — أدلة إغلاق Home Destruction Gate وإغلاق Phase 4 كاملة.
- [`docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md`](docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md) — أدلة إغلاق Transaction List & Search.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. Phase 5.2 لا تبدأ قبل نجاح بوابات إغلاق Phase 5.1 ودمجها في `main`.

## حالة المراحل

- **Phase 0 — Specification Freeze** ✅
- **Phase 1 — Engineering Foundation** ✅
- **Phase 2 — ENJAZ Design System 1.0** ✅
  - **Phase 2.8 — Visual Destruction & Quality Gate ✅**
- **ENJAZ Design System 1.0** ✅ frozen
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
- **Phase 5 — Transactions Core** 🚧
  - **Phase 5.1 — Transaction List & Search** ✅ complete
  - **Phase 5.2 — Transaction Create/Edit** ⏳ not started

## Phase 4.1 — المكتمل رسميًا

4.1 استبدلت الـHome المؤقتة بشاشة تشغيلية حقيقية فوق الـApp Shell وDesign System 1.0 المجمد:

- استعادة Workspace للمستخدم من `workspace_memberships` عبر Data Layer المركزية وRLS، لا باشتقاق معرف وهمي.
- معاملات نشطة فقط؛ المؤرشف والمحذوف والمكتمل لا يدخل في عدادات العمل النشط.
- الأولويات مشتقة من العوائق الحرجة/المرتفعة، المتابعات المتأخرة، المعاملات العاجلة والمتلكئة.
- احترام `snoozed_until` وعدم إظهار المتابعة المؤجلة كأولوية متأخرة.
- Financial snapshot محدود بوضوح إلى أتعاب العمل النشط والمدفوعات `posted` المرتبطة به؛ Phase 7 يبقى المرجع المحاسبي الكامل.
- كشف نطاق الدقة الرقمية وعدم الادعاء بدقة مالية زائفة عند تجاوز مجال JavaScript الآمن.
- Loading / Empty / Error / Retry states فعلية، ولا تُعرض أرقام جزئية عند فشل تحميل جزء من المصادر.

## Phase 4.2 — المكتمل رسميًا

4.2 حولت وجهة «اليوم» إلى **Daily Work / Universal Inbox** حقيقية داخل ENJAZ UI/UX 2.0 المجمد:

- Queue موحدة تجمع المتابعات، العوائق، المواعيد القريبة، التجديدات، وإجراءات الـWorkflow المعلقة.
- استبعاد أي عمل تابع لمعاملة مكتملة أو مؤرشفة أو محذوفة.
- احترام تأجيل المتابعات وعدم إعادتها إلى الـInbox قبل `snoozed_until`.
- ترتيب تشغيلي حسب الأثر والوقت، مع Ownership من أحدث `transaction_routes.assigned_to_text`.
- إكمال المتابعة/الموعد/التجديد/Workflow عبر الـRepositories الموثوقة نفسها.
- منع Universal Inbox من حلّ Blocker بصمت؛ العائق يفتح سياق العمل بدل تجاوز قواعد المعاملة.
- Live runtime يستخدم Auth + Data Layer + Supabase، بينما CI/GitHub Pages يستخدم fixture معزولة بلا أسرار أو بيانات إنتاج.
- Loading / Empty / Error / Retry وحالات الإجراء موجودة فعليًا.
- اختبار حقيقي على 1280 / 430 / 390 / 360 / 320px مع Touch 44px وoverflow وconsole/page errors.

## Phase 4.3 — المكتمل رسميًا

4.3 أضافت **Executive Briefing** فوق المصادر التشغيلية الموثوقة دون إنشاء منطق أعمال موازٍ:

- تعيد استخدام حقائق وأولويات Home من 4.1 وضغط العمل من 4.2.
- تضيف نبضة مالية محدودة لدفعات `posted` خلال آخر 7 أيام مقارنة بالـ7 السابقة عبر Data Layer نفسها.
- تعرض حالة تنفيذية وقرارات محدودة بالأعلى أثرًا.
- تحمي الدقة المالية ولا تعرض قيمة غير آمنة كرقم دقيق.
- Live runtime يستخدم Auth/Data Layer؛ Public Preview تستخدم fixture معزولة.
- Chromium Reality Gate اختبرت 1280 / 430 / 390 / 360 / 320px مع النصوص المختلطة والقيم الضخمة.

## Phase 4.4 — المكتمل رسميًا

4.4 هاجمت الـHome الحقيقية وأغلقت بقايا التنفيذ المؤقت:

- ربطت الـHome التشغيلية بمسار live وبـfixture معزولة في CI/Pages.
- أزيل `HomeCoreScreen` الثابت القديم فعليًا.
- أضيفت سيناريوهات deterministic: empty / dense / conflict / slow / offline.
- الأولويات أصبحت transaction-distinct ومحدودة.
- بقيت حماية الدقة المالية واستبعاد المؤرشف/المحذوف/المكتمل واحترام snooze.
- Functional regression عند الإغلاق: **64/64** ✅، وPhase 4.4 dataset destruction: **4/4** ✅.

## Phase 5.1 — المكتمل رسميًا

5.1 استبدلت العرض الثابت للمعاملات بقائمة تشغيلية حقيقية ومتصلة ببنية البيانات القانونية:

- Live runtime يحل Workspace من المستخدم المصادق ويقرأ عبر `EnjazDataLayerFactory` والـRepositories المقيّدة بالـWorkspace؛ Preview/CI معزولة.
- ثلاث حالات واضحة: **الجارية / المتلكئة والمتأخرة / المؤرشفة والمغلقة**.
- المعاملات المحذوفة لا تدخل العدادات أو البحث أو الصفحات.
- بحث عربي مُطبّع يغطي رقم/هوية المعاملة، `legacy_id`، النوع، الجهة، الحالة، الأولوية واسم الشركة.
- فرز حسب آخر حركة، تاريخ الإنشاء، والأتعاب صعودًا/نزولًا.
- Pagination افتراضية 20 صفًا ومحدودة إلى 50؛ ومصدر البيانات يفشل بأمان إذا تجاوز 5,000 سجل بدل عرض نتيجة ناقصة.
- العلاقة المفقودة مع الشركة تظهر صراحةً، والقيم المالية خارج مجال الدقة الآمن لا تُعرض كحقائق دقيقة.
- عقد Saved View ثابت باسم `enjaz.transactions.list.v1` يحتفظ بالعرض/البحث/الفرز/حجم الصفحة ولا يحتفظ برقم الصفحة المؤقت؛ التنفيذ الكامل للـSmart Saved Views يبقى Phase 9.2.
- Loading / Error / Retry / Empty والنصوص الطويلة وRTL والموبايل وReduced Motion محمية.
- اختبار Phase 5.1 المخصص: **15/15** ✅.
- Full functional regression: **79/79** ✅.
- Chromium حقيقي: 1280 / 430 / 390 / 360 / 320px، مع pagination/search/sort/view switching و44px touch وoverflow ✅.
- Pre-closure gate `33944168202` على `5cf81aac4e527fc34ca1a7a03a148f083bb4ce60` ✅، evidence artifact `9962794607`.

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
- `/foundation/home` — 4.1 deterministic Home proof
- UI V2 fixture runtime — 4.2 Daily Work proof
- UI V2 Executive Briefing fixture runtime — 4.3 proof
- UI V2 Home destruction scenarios — 4.4 proof
- UI V2 transaction fixture + dedicated Chromium destruction — 5.1 Transaction List & Search proof

## Quality Gate

Phase 5.1 pre-closure certification على head `5cf81aac4e527fc34ca1a7a03a148f083bb4ce60` أثبت:

1. QA stage contract ✅
2. UI V2 Boundary + Visual DNA ✅
3. UI-4 → UI-10 cumulative freeze ✅
4. Phase 4.2 / 4.3 / 4.4 cumulative gates ✅
5. Phase 5.1 architecture audit ✅
6. Phase 5.1 functional/destructive tests **15/15** ✅
7. Full functional tests **79/79** ✅
8. Secrets + roadmap + database integrity ✅
9. TypeScript `tsc -b` ✅
10. Vite production build ✅
11. Strict production asset budget ✅
12. Chromium responsive + search/sort/pagination destruction ✅
13. Global Browser Acceptance ✅
14. Evidence artifact upload ✅

أدلة التنفيذ مفصلة في `docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md`.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. Feature layers التشغيلية لا تنشئ عميل Supabase مباشرًا خارج البنية المعتمدة؛ الوصول يمر عبر Data Layer المركزية، والـfixtures العامة معزولة عن بيانات الإنتاج.

## ملاحظة التطوير

`main` هو المصدر القانوني والوحيد بعد الدمج. التطوير المرحلي يتم على فرع مخصص ثم PR إلى `main` مع البوابات التراكمية. **Phase 5.1 مغلقة؛ Phase 5.2 — Transaction Create/Edit هي الخطوة التالية المسموحة ولم تبدأ.**