# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية الحالية: **Phase 3.3 — Global Interaction Surfaces ✅**  
المرحلة التالية: **Phase 3.4 — Shell Destruction Gate**

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
  - **Phase 3.2 — Navigation Architecture** ✅
  - **Phase 3.3 — Global Interaction Surfaces** ✅
  - **Phase 3.4 — Shell Destruction Gate** ⏭ NEXT

## ما تم تثبيته حتى Phase 3.3

- React + TypeScript + Vite.
- Supabase Auth / PostgreSQL / RLS foundation.
- Workspace-scoped typed Data Layer.
- Arabic-first RTL architecture.
- Multi-layer typed Design Token System.
- Typography & bidi contracts للنصوص العربية والمحتوى المختلط.
- Core reusable components مع Motion/Presence ودعم `prefers-reduced-motion`.
- Android keyboard-aware viewport، Safe Areas، overscroll containment، و44px touch floor.
- Premium Pattern Library 2.7 وVisual Destruction Gate 2.8 المجمدان كأساس بصري حاكم.
- App Shell 3.1 مع Top Bar وBottom Navigation وPage Container وحالات الشبكة العامة.
- Navigation Architecture 3.2 مع **18 product-domain roots** و**5 primary navigation slots** و14 secondary domains تحت More.
- **Global Interaction Surfaces 3.3** مركبة مرة واحدة داخل App Shell بأربع نقاط دخول فقط: البحث الشامل، الوارد، الإنشاء السريع، والقيادة/العمليات.
- البحث العالمي في 3.3 يبحث خريطة أقسام ENJAZ الحقيقية فقط، بحد أدنى حرفين وبحد أقصى 8 نتائج؛ لا يختلق سجلات أعمال قبل مراحلها.
- Inbox يوجّه إلى مسار الإشعارات المركزي ويحتوي Badge storms عند `99+`؛ البيانات والعداد الحقيقيان يبقيان لمرحلة الإشعارات.
- Quick Create يثبت نوايا معاملة/شركة/متابعة جديدة لكنه **يفوض** التنفيذ إلى المجال المالك؛ لا توجد نماذج أو عمليات حفظ مكررة داخل App Shell.
- مدخل القيادة/العمليات يفوض إلى Operations Center وCommand Center من دون نقل منطق workflow/automation إلى الهيكل.
- لا يوجد Supabase أو Data Layer أو عمليات insert/update/delete داخل Global Interaction surfaces.
- GitHub Pages preview يحافظ على SPA deep-link refresh عبر `dist/404.html` و`basename` الصحيح.

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
- `/foundation/interactions` — مختبر Global Interaction Surfaces 3.3

## Quality Gate

المستودع مرتبط بـ GitHub Actions، والبوابة الدائمة تعمل على `main` وعلى Pull Requests:

1. `npm ci`
2. التحقق المتسلسل الكامل حتى `verify:phase3.3`
3. Roadmap integrity audit
4. TypeScript الحقيقي `tsc -b`
5. Vite production build
6. التحقق من إنتاج `dist/index.html`

Phase 3.3 اجتازت البوابة على PR #12 ثم على `main` بعد الدمج. النسخة المدمجة المثبتة كانت `58886263e19261aa4264091e34b14bdec021860b`؛ نجح ENJAZ Quality Gate run #172 ونجح GitHub Pages run #132 على **نفس SHA**، كما تم الاحتفاظ بالـproduction artifact الرسمي.

نتائج Phase 3.3 المثبتة:

- **136/136 behavior/contract tests** ✅
- **151/151 Phase 3.3 Global Interaction invariants** ✅
- **41/41 deliberate Phase 3.3 regressions rejected** ✅
- **137/137 Phase 3.2 Navigation invariants** ✅
- **31/31 deliberate Phase 3.2 regressions rejected** ✅
- **79/79 Phase 3.1 App Shell invariants** ✅
- **15/15 deliberate App Shell regressions rejected** ✅
- **90/90 Phase 2.8 visual-destruction invariants** ✅
- **19/19 deliberate Phase 2.8 regressions rejected** ✅
- **115/115 Phase 2.7 pattern invariants** ✅
- **17/17 deliberate Phase 2.7 regressions rejected** ✅
- **50/50 Mobile / Android invariants** ✅
- **10/10 deliberate mobile regressions rejected** ✅
- **166/166 Motion / Interaction / Presence / Reduced-Motion invariants** ✅
- **16/16 deliberate motion regressions rejected** ✅
- **41/41 component/accessibility/RTL/gate invariants** ✅
- **17/17 deliberate component regressions rejected** ✅
- **264 total tokens / 220 public typed tokens / 77 component contracts** ✅
- Database audit: **45 tables / 118 policies / 42 indexes** ✅
- Offline TypeScript contract ✅
- Real TypeScript `tsc -b` ✅
- Vite 8.2.2 production build ✅ — **189 modules transformed**
- `dist/index.html` assertion ✅
- merged `main` Quality Gate run #172 ✅
- GitHub Pages deployment run #132 for the same merged source ✅

أثناء 3.3 التقطت البوابات عيوبًا حقيقية في المدقق نفسه وتم تشديدها بدل تجاوزها: عدّ Primary Navigation كان يلتقط سجلات غير مقصودة، ثم كانت حدود `4/8/99` تُفحص بطريقة substring قد تسمح بـ`40/80/999`، كما كان اختبار توثيق Global Search حساسًا لحالة الأحرف. تم إصلاح الحراس وإضافة regressions متعمدة لهذه الحالات.

**Phase 2.8 — Visual Destruction & Quality Gate ✅** تبقى بوابة النظام البصري المجمدة، و**ENJAZ Design System 1.0** يبقى المرجع البصري الحاكم.  
بعد إغلاق **Phase 3.3 ✅** رسميًا، تكون الخطوة التنفيذية التالية فقط **Phase 3.4 — Shell Destruction Gate**.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. أي مرحلة جديدة تُبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم تُدمج فقط بعد نجاح الاختبارات وTypeScript وProduction Build. بعد الدمج يعاد تشغيل البوابة على `main` نفسه للتأكد من سلامة النسخة الرسمية.
