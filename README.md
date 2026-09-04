# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 4.4 — Home Destruction Gate ✅**  
آخر مرحلة مغلقة: **Phase 4.4 — Home Destruction Gate ✅**.  
التالي المسموح: **Phase 5.1 — Transaction List & Search**، ولم تبدأ بعد.

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.
- [`docs/PHASE4_2_DAILY_WORK_CLOSURE.md`](docs/PHASE4_2_DAILY_WORK_CLOSURE.md) — أدلة إغلاق Daily Work / Universal Inbox.
- [`docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md`](docs/PHASE4_3_EXECUTIVE_BRIEFING_CLOSURE.md) — أدلة إغلاق Executive Briefing.
- [`docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md`](docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md) — أدلة إغلاق Home Destruction Gate وإغلاق Phase 4 كاملة.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. Phase 5.1 لا تبدأ قبل نجاح بوابات PR الخاصة بإغلاق 4.4 ودمجها في `main`.

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
- **Phase 5.1 — Transaction List & Search** ⏳ not started

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
- تم اكتشاف وإصلاح خلل حقيقي على 320px كان يسمح لزر `فتح السياق` بالاقتراب من/الانحجاب خلف Bottom Dock، وبقي له Regression دائم.
- Daily Work مسجلة كـ`data-pattern="daily-work"` وتخضع لـUI-10 Full Product Destruction بالنص العربي الطويل والـmixed tokens والقيم الضخمة.

## Phase 4.3 — المكتمل رسميًا

4.3 أضافت **Executive Briefing** حقيقية فوق المصادر التشغيلية الموثوقة الموجودة أصلًا، دون إنشاء منطق أعمال موازٍ:

- تعيد استخدام حقائق وأولويات Home من 4.1.
- تعيد استخدام ضغط العمل وحالات Universal Inbox من 4.2.
- تضيف نبضة مالية محدودة لدفعات `posted` خلال آخر 7 أيام مقارنة بالـ7 أيام السابقة، من خلال Data Layer نفسها.
- تعرض حالة تنفيذية: مستقر / تحت المراقبة / يحتاج قرارًا.
- تلخص العوائق الحرجة والمفتوحة، المعاملات المتلكئة والعاجلة، والمتابعات المتأخرة.
- تلخص ضغط العمل: اليوم، المتأخر، الاعتمادات، والقادم.
- تحمي الدقة المالية ولا تعرض قيمة غير آمنة كرقم دقيق.
- قائمة القرارات التنفيذية محدودة بالأعلى أثرًا بدل تحويل الشاشة إلى Queue أخرى.
- التنقل التنفيذي يفتح Daily Work أو Finance أو مجال Transactions حسب سياق القرار.
- لا تدعي اكتمال Phase 5 Transactions أو Phase 7 Finance أو Phase 9 Risk قبل أوانها.
- Live runtime يستخدم Auth/Data Layer؛ Public Preview تستخدم fixture معزولة.
- Loading / Error / Retry موجودة، ولا تعرض الشاشة أرقامًا جزئية إذا فشل مصدر موثوق.
- Chromium Reality Gate اختبرت 1280 / 430 / 390 / 360 / 320px، touch 44px، overflow، console errors، والتنقل التنفيذي.
- Stress حقيقي شمل نصًا عربيًا طويلًا، mixed Arabic/Latin token، وقيمة مالية ضخمة.

## Phase 4.4 — المكتمل رسميًا

4.4 لم تضف شاشة تجميلية جديدة؛ بل هاجمت الـHome الحقيقية وأغلقت بقايا التنفيذ المؤقت:

- ربطت الـHome التشغيلية بمسار `ConnectedHomeScreen` في التشغيل الحي وبـfixture معزولة في CI/Pages.
- أزيل `HomeCoreScreen` الثابت القديم فعليًا من `CoreScreens.tsx` بدل تركه ككود ميت ومصدر التباس.
- أضيفت سيناريوهات deterministic: empty / dense / conflict / slow / offline، إضافة إلى القيم المالية الضخمة والنصوص العربية/اللاتينية الطويلة.
- الأولويات أصبحت transaction-distinct ومحدودة؛ لا يستطيع سجل واحد عالي الضوضاء احتكار قائمة الأولويات.
- بقيت حماية الدقة المالية، واستبعاد المؤرشف/المحذوف/المكتمل، واحترام snooze للمتابعات.
- حالات Loading / Empty / Error / Retry واختبار الانقطاع والبطء أصبحت جزءًا من Gate دائمة.
- بوابة 4.4 أصبحت جزءًا من `ENJAZ Quality Gate` و`ENJAZ Real Browser Acceptance` و`verify:extreme` وQA stage contract.
- تم تحديث UI-6 cumulative audit ليتحقق من الـHome القانونية الحالية بدل إجبار المشروع على الاحتفاظ بـHome ثابتة ميتة.
- Pre-closure run `33917241943` على commit `622a110422fa6c584e054ffdd8d803dc1f31aac4` اجتاز جميع الخطوات، بما فيها Chromium الحقيقي ورفع evidence artifact.
- Functional regression: **64/64** ✅، وPhase 4.4 dataset destruction: **4/4** ✅.

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
- UI V2 fixture runtime — 4.2 deterministic Daily Work interaction/reality proof
- UI V2 Executive Briefing fixture runtime — 4.3 deterministic executive interaction/reality proof
- UI V2 Home destruction scenarios — 4.4 empty/dense/conflict/slow/offline + responsive Chromium proof

## Quality Gate

Phase 4.4 pre-closure certification على head `622a110422fa6c584e054ffdd8d803dc1f31aac4` أثبت:

1. QA stage contract ✅
2. UI V2 Boundary + Visual DNA ✅
3. UI-4 → UI-10 cumulative freeze ✅
4. Phase 4.2 cumulative audit ✅
5. Phase 4.3 cumulative audit ✅
6. Phase 4.4 architecture audit ✅
7. Phase 4.4 destruction tests **4/4** ✅
8. Full functional tests **64/64** ✅
9. Secrets audit ✅
10. Roadmap integrity ✅
11. TypeScript `tsc -b` ✅
12. Vite production build ✅
13. Strict production asset budget ✅
14. Chromium Reality Gate: empty / dense × 5 viewports / conflict / slow / offline / interaction ✅
15. Evidence artifact upload ✅

أدلة التنفيذ مفصلة في `docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md`. هذه الحالة ستعاد مصادقتها على PR إلى `main` قبل الدمج.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. Feature layers في 4.1 و4.2 و4.3 و4.4 لا تنشئ عميل Supabase مباشر؛ الوصول التشغيلي يمر عبر Data Layer المركزية، والـfixtures العامة معزولة عن بيانات الإنتاج.

## ملاحظة التطوير

`main` هو المصدر القانوني والوحيد بعد الدمج. التطوير المرحلي يتم على فرع مخصص ثم PR إلى `main` مع البوابات التراكمية، وليس عبر إبقاء فرع UI قديم كمصدر تشغيل. **Phase 4 مغلقة بالكامل بعد 4.4؛ Phase 5.1 — Transaction List & Search هي الخطوة التالية المسموحة ولم تبدأ.**