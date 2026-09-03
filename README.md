# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية المرشحة للدمج: **Phase 3.2 — Navigation Architecture ✅**  
المرحلة التالية بعد نجاح الدمج والتحقق من `main`: **Phase 3.3 — Global Interaction Surfaces**

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
- **Phase 3 — Application Shell & Navigation** 🚧
  - **Phase 3.1 — App Shell** ✅
  - **Phase 3.2 — Navigation Architecture** ✅ PR gate green; final confirmation occurs again on merged `main`
  - **Phase 3.3 — Global Interaction Surfaces** ⏭ NEXT
  - **Phase 3.4 — Shell Destruction Gate** ⏳

## ما تم تثبيته حتى Phase 3.2

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
- App Shell 3.1 موحد مع Top Bar وBottom Navigation وPage Container وSafe Areas وحالات الشبكة العامة.
- **Navigation Architecture 3.2** بعقد مركزي يضم 18 product-domain roots، وخمسة primary navigation slots فقط، و14 secondary domains تحت More.
- Active navigation مشتق من pathname الحقيقي، وBack behavior حتمي وآمن للـDeep Links بدل الاعتماد على browser history وحده.
- المسارات الفعلية للمجالات مثبتة لكن محتواها يبقى `reserved` حتى مرحلة كل مجال؛ لا توجد شاشات أعمال مبكرة داخل Phase 3.2.
- GitHub Pages preview يحافظ على SPA deep-link refresh عبر `dist/404.html` و`basename` الصحيح.
- حارس شامل يمنع في CSS المنتج: raw colors، `!important`، numeric z-index، الخطوط الخام الأصغر من حد القراءة، و`transition: all`.

## المختبرات داخل التطبيق

- `/foundation/identity` — مختبر الهوية البصرية 2.1
- `/foundation/tokens` — مختبر Design Tokens 2.2
- `/foundation/typography` — مختبر Typography & RTL 2.3
- `/foundation/components` — مختبر Core Components 2.4
- `/foundation/motion` — مختبر Motion & Interaction 2.5
- `/foundation/mobile` — مختبر Mobile / Android Hardening 2.6
- `/foundation/patterns` — مختبر Premium Pattern Library 2.7
- `/foundation/destruction` — مختبر Visual Destruction & Quality Gate 2.8
- `/foundation/shell` — مختبر App Shell 3.1
- `/foundation/navigation` — مختبر Navigation Architecture 3.2

## Quality Gate

المستودع مرتبط بـ GitHub Actions، والبوابة الدائمة تعمل على `main` وعلى Pull Requests:

1. `npm ci`
2. التحقق المتسلسل الكامل حتى `verify:phase3.2`
3. Roadmap integrity audit
4. TypeScript الحقيقي `tsc -b`
5. Vite production build
6. التحقق من إنتاج `dist/index.html`

آخر بوابة كاملة ناجحة لمرشح Phase 3.2 على Pull Request أثبتت:

- **124/124 behavior/contract tests** ✅
- **137/137 Phase 3.2 Navigation Architecture invariants** ✅
- **30/30 deliberate Phase 3.2 route/deep-link/back/permission/mobile/token/gate regressions rejected** ✅
- **79/79 Phase 3.1 App Shell invariants** ✅
- **15/15 deliberate App Shell regressions rejected** ✅
- **90/90 Phase 2.8 visual-destruction invariants** ✅
- **19/19 deliberate Phase 2.8 visual/mobile/RTL/accessibility/gate regressions rejected** ✅
- **115/115 Phase 2.7 pattern invariants** ✅
- **17/17 deliberate Phase 2.7 pattern regressions rejected** ✅
- **50/50 Mobile / Android invariants** ✅
- **10/10 deliberate mobile/version/workflow regressions rejected** ✅
- **160/160 Motion / Interaction / Presence / Reduced-Motion invariants** ✅
- **16/16 deliberate motion regressions rejected** ✅
- **41/41 component/accessibility/RTL/gate invariants** ✅
- **17/17 deliberate component regressions rejected** ✅
- **264 total tokens / 220 public typed tokens / 77 component contracts** ✅
- Database audit: **45 tables / 118 policies / 42 indexes** ✅
- Offline TypeScript contract ✅
- Real TypeScript `tsc -b` ✅
- Vite 8.2.2 production build ✅ — **186 modules transformed**
- `dist/index.html` assertion ✅

خلال 3.2 كشفت البوابات عيوبًا حقيقية وتم إصلاحها بدل تجاوزها: نقص `useLocation` وخصائص `Link` في Offline React Router shim، مرجع Design Token غير موجود في Navigation CSS، افتراضات version جامدة في destructive selftests القديمة لـ2.7 و2.8، واختبار تخريب 3.2 ضعيف تم تشديده ليكسر دليل المسار الحقيقي. أضيفت/قويت اختبارات الانحدار لكل حالة.

**Phase 2.8 — Visual Destruction & Quality Gate ✅** تبقى بوابة النظام البصري المجمدة، و**ENJAZ Design System 1.0** يبقى المرجع البصري الحاكم.  
**نقطة الانتقال التاريخية المجمدة في الخطة هي Phase 3 — Application Shell & Navigation؛ وبعد إغلاق 3.2 على `main` تكون الخطوة التنفيذية التالية Phase 3.3 — Global Interaction Surfaces.**

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. أي مرحلة جديدة تُبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم تُدمج فقط بعد نجاح الاختبارات وTypeScript وProduction Build. بعد الدمج يعاد تشغيل البوابة على `main` نفسه للتأكد من سلامة النسخة الرسمية.
