# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الحالية على فرع التطوير: **Phase 4.1 — Home / Dashboard 🚧**  
آخر مرحلة مغلقة رسميًا على `main`: **Phase 3.4 — Shell Destruction Gate ✅**.

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. لا تصبح 4.1 ✅ قبل نجاح PR ثم `main` ثم GitHub Pages على نفس SHA النهائي.

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
- **Phase 4 — Home, Daily Work & Executive Overview** 🚧 CURRENT
  - **Phase 4.1 — Home / Dashboard** 🚧 in progress
  - **Phase 4.2 — Daily Work / Universal Inbox** ⏳ not started
  - **Phase 4.3 — Executive Briefing** ⏳ not started
  - **Phase 4.4 — Home Destruction Gate** ⏳ not started

## Phase 4.1 — ما يتم بناؤه الآن

4.1 تستبدل الـHome المؤقتة بشاشة تشغيلية حقيقية فوق الـApp Shell وDesign System 1.0 المجمد:

- استعادة Workspace للمستخدم من `workspace_memberships` عبر Data Layer المركزية وRLS، لا باشتقاق معرف وهمي.
- معاملات نشطة فقط؛ المؤرشف والمحذوف والمكتمل لا يدخل في عدادات العمل النشط.
- الأولويات مشتقة من العوائق الحرجة/المرتفعة، المتابعات المتأخرة، المعاملات العاجلة والمتلكئة.
- احترام `snoozed_until` وعدم إظهار المتابعة المؤجلة كأولوية متأخرة.
- Financial snapshot محدود بوضوح إلى أتعاب العمل النشط والمدفوعات `posted` المرتبطة به؛ Phase 7 يبقى المرجع المحاسبي الكامل.
- كشف نطاق الدقة الرقمية وعدم الادعاء بدقة مالية زائفة عند تجاوز مجال JavaScript الآمن.
- Loading / Empty / Error / Retry states فعلية، ولا تُعرض أرقام جزئية عند فشل تحميل جزء من المصادر.
- Preview حتمي وآمن على `/foundation/home` من نفس `HomeDashboardView` دون سجلات إنتاج أو أسرار.
- بقية مجالات المنتج تظل Reserved؛ 4.2 لم تبدأ.

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

## Quality Gate

GitHub Actions يعمل على Pull Requests وعلى `main`:

1. `npm ci`
2. السلسلة الكاملة حتى `npm run verify:phase4.1`
3. كل بوابات Phase 3.4 وما قبلها تبقى فعالة عبر forward-compatible normalization وليس بتعطيل الفحوص.
4. Phase 4.1 Home audit + destructive selftest.
5. Roadmap integrity audit.
6. TypeScript الحقيقي `tsc -b`.
7. Vite production build وفحص `dist/index.html`.
8. الاحتفاظ بالـproduction artifact على `main`.
9. GitHub Pages يجب أن ينشر نفس merged-main SHA قبل إغلاق 4.1.

Phase 3.4 السابقة بقيت مثبتة على feature SHA `a2df0390858e93fb4d55cf9412f5f6b452a1ed18`، ثم أُغلق Phase 3 توثيقيًا على final main SHA `87d2f44f7b319006c9dbf84913970508e8093e7e` بعد نجاح Quality Gate #186 وPages #146.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. Feature layer في 4.1 لا تستورد Supabase مباشرة؛ كل الوصول يمر عبر Data Layer المركزية.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. **Phase 4.1 ما زالت قيد التنفيذ على فرع مستقل، وPhase 4.2 لم تبدأ.**
