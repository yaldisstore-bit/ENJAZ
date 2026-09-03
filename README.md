# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية الحالية: **Phase 2.8 — Visual Destruction & Quality Gate ✅**  
المرحلة التالية: **Phase 3 — Application Shell & Navigation**

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

أصبحت خطة المشروع الكاملة مثبتة داخل المستودع كمرجع حاكم:

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي من التأسيس حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — يوضح ما تم التحقق منه تاريخيًا وحدود استعادة الخطة القديمة وكيف تم منع تكرار فقدان تسلسل المراحل.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. أي تغيير في الخطة يجب أن يكون صريحًا وموثقًا داخل المستودع.

## حالة المراحل

- **Phase 0 — Specification Freeze** ✅
- **Phase 1.1 — Project Foundation** ✅
- **Phase 1.2 — Database Architecture** ✅
- **Phase 1.3 — Auth & Security** ✅
- **Phase 1.4 — Data Layer** ✅
- **Phase 1.5 — Foundation Destruction** ✅
- **Phase 2.1 — Visual Identity Foundation** ✅
- **Phase 2.2 — Design Tokens** ✅
- **Phase 2.3 — Typography & RTL System** ✅
- **Phase 2.4 — Core Component System** ✅
- **Phase 2.5 — Motion & Interaction System** ✅
- **Phase 2.6 — Mobile / Android Hardening** ✅
- **Phase 2.7 — Premium Pattern Library** ✅
- **Phase 2.8 — Visual Destruction & Quality Gate** ✅
- **ENJAZ Design System 1.0** ✅ frozen after the Phase 2 gate
- **Phase 3 — Application Shell & Navigation** ⏭

## ما تم تثبيته حتى نهاية Phase 2

- React + TypeScript + Vite.
- Supabase Auth / PostgreSQL / RLS foundation.
- Workspace-scoped typed Data Layer.
- Arabic-first RTL architecture.
- Multi-layer typed Design Token System.
- Typography & bidi contracts للنصوص العربية والمحتوى المختلط.
- Core reusable components: Button / IconButton / Card / Badge / fields / Checkbox / Switch / Tabs / Dialog / Bottom Sheet / Progress / Skeleton / Empty State.
- Motion contract مركزي، Presence حقيقي، Press feedback، capability-scoped hover، ودعم `prefers-reduced-motion`.
- Android keyboard-aware viewport، `100dvh` enhancement، Safe Areas، overscroll containment، و44px coarse-pointer touch floor.
- **Premium Pattern Library 2.7** بعائلات المجال: Transaction, Company, Contact/Lawyer, Finance, Risk, Timeline, Follow-up, Workflow, Automation, Command Center, Search, Contextual Actions, System States وSkeleton.
- **Visual Destruction Gate 2.8** بحالات 200+ حرف، 20 إشعاراً، 24 حدث Timeline، عرض 320px، keyboard-open، أرقام مالية ضخمة، RTL/LTR مختلط، Offline/Error/Conflict/Recovery، Focus، Zoom وReduced Motion.
- حارس شامل يمنع في CSS المنتج: raw colors، `!important`، numeric z-index، الخطوط الخام الأصغر من حد القراءة، و`transition: all`.
- Phase 3 كانت مقفلة آليًا داخل عقد 2.8 حتى نجاح بوابة التدمير.

## المختبرات داخل التطبيق

- `/foundation/identity` — مختبر الهوية البصرية 2.1
- `/foundation/tokens` — مختبر Design Tokens 2.2
- `/foundation/typography` — مختبر Typography & RTL 2.3
- `/foundation/components` — مختبر Core Components 2.4
- `/foundation/motion` — مختبر Motion & Interaction 2.5
- `/foundation/mobile` — مختبر Mobile / Android Hardening 2.6
- `/foundation/patterns` — مختبر Premium Pattern Library 2.7
- `/foundation/destruction` — مختبر Visual Destruction & Quality Gate 2.8

## Quality Gate

المستودع مرتبط بـ GitHub Actions، والبوابة الدائمة تعمل على `main` وعلى Pull Requests:

1. `npm ci`
2. التحقق الكامل حتى `verify:phase2.8`
3. Roadmap integrity audit
4. TypeScript الحقيقي `tsc -b`
5. Vite production build
6. التحقق من إنتاج `dist/index.html`

Phase 2.8 اجتازت البوابة الكاملة على Pull Request ثم على `main` بعد الدمج، وتشمل النتائج المثبتة:

- **106/106 behavior/contract tests**
- **90/90 Phase 2.8 visual-destruction invariants**
- **16/16 deliberate Phase 2.8 visual/mobile/RTL/accessibility/gate regressions rejected**
- **115/115 Phase 2.7 pattern invariants**
- **14/14 deliberate Phase 2.7 pattern regressions rejected**
- **50/50 Mobile / Android invariants**
- **7/7 deliberate mobile regressions rejected**
- **154/154 Motion / Interaction / Presence / Reduced-Motion invariants**
- **16/16 deliberate motion regressions rejected**
- **41/41 component/accessibility/RTL/gate invariants**
- **17/17 deliberate component regressions rejected**
- **264 total tokens / 220 public typed tokens / 77 component contracts**
- Database audit: **45 tables / 118 policies / 42 indexes** ✅
- TypeScript `tsc -b` ✅
- Vite 8.2.2 production build ✅ — **179 modules transformed**
- `dist/index.html` assertion ✅
- Pull Request Quality Gate ✅
- merged `main` Quality Gate — run #82 ✅

**Phase 2 مغلقة رسميًا وENJAZ Design System 1.0 مجمّد. نقطة التنفيذ التالية حسب الـMaster Roadmap هي Phase 3 — Application Shell & Navigation.**

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. أي مرحلة جديدة تُبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم تُدمج فقط بعد نجاح الاختبارات وTypeScript وProduction Build. بعد الدمج يعاد تشغيل البوابة على `main` نفسه للتأكد من سلامة النسخة الرسمية.
