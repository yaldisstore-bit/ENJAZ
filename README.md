# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية: **Phase 4.2 — Daily Work / Universal Inbox ✅**  
آخر مرحلة مغلقة: **Phase 4.2 — Daily Work / Universal Inbox ✅**.  
التالي المسموح: **Phase 4.3 — Executive Briefing**، ولم تبدأ بعد.

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.
- [`docs/PHASE4_2_DAILY_WORK_CLOSURE.md`](docs/PHASE4_2_DAILY_WORK_CLOSURE.md) — أدلة إغلاق Daily Work / Universal Inbox.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. Phase 4.3 لا تبدأ قبل إغلاق 4.2 ونجاح Release Gate الخاصة بها ودمج Closure في فرع التكامل الرسمي.

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
- **Phase 4 — Home, Daily Work & Executive Overview** 🚧
  - **Phase 4.1 — Home / Dashboard** ✅ complete
  - **Phase 4.2 — Daily Work / Universal Inbox** ✅ complete
  - **Phase 4.3 — Executive Briefing** ⏳ not started
  - **Phase 4.4 — Home Destruction Gate** ⏳ not started

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

## Quality Gate

إغلاق 4.2 لا يعتمد على Smoke Test. على implementation head `395978afe09a6155193e29e0e29cd09b4f3f7a42` نجحت جميع البوابات التراكمية:

1. UI-1 Gate ✅
2. UI-3 Reality Gate ✅
3. UI-4 App Shell Reality Gate ✅
4. UI-5 Composition Reality Gate ✅
5. UI-6 Core Screens Reality Gate ✅
6. UI-7 Domain Reality Gate ✅
7. UI-8 States / Forms Reality Gate ✅
8. UI-9 Motion / Touch / Mobile Reality Gate ✅
9. UI-10 Full Destruction Freeze Gate ✅
10. Phase 4.2 Daily Work Reality Gate ✅
11. **56/56** functional tests ✅
12. TypeScript `tsc -b` ✅
13. Vite production build ✅
14. Manual screenshot review ✅

أدلة التنفيذ مفصلة في `docs/PHASE4_2_DAILY_WORK_CLOSURE.md`.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. Feature layer في 4.1 و4.2 لا تنشئ عميل Supabase مباشر؛ الوصول التشغيلي يمر عبر Data Layer المركزية، والـfixture العامة معزولة عن بيانات الإنتاج.

## ملاحظة التطوير

`uiux-rebirth-v2` هو فرع التكامل الحالي لواجهة ENJAZ UI/UX 2.0 ومسار المنتج الجاري. **Phase 4.2 مغلقة بعد نجاح Closure Gate؛ Phase 4.3 — Executive Briefing هي الخطوة التالية المسموحة ولم تبدأ.**
