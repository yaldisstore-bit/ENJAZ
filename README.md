# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة المرشحة الحالية: **Phase 3.3 — Global Interaction Surfaces ✅ PR candidate**  
المرحلة التالية فقط بعد نجاح PR ثم `main`: **Phase 3.4 — Shell Destruction Gate**

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
  - **Phase 3.3 — Global Interaction Surfaces** ✅ PR candidate; الإغلاق الرسمي بعد merged-main gate
  - **Phase 3.4 — Shell Destruction Gate** ⏭ NEXT بعد إغلاق 3.3

## ما تم تثبيته حتى مرشح Phase 3.3

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

مرشح 3.3 لا يُعتبر مغلقًا بمجرد وجود الواجهة. يجب أن ينجح Behavior test suite، وPhase 3.3 audit، وdestructive selftest، وجميع بوابات 3.2 وما قبلها، ثم TypeScript وProduction Build على PR. بعد الدمج يعاد الاختبار على `main` نفسه، ويجب أن يُنشر GitHub Pages من **نفس SHA** قبل إعلان 3.3 مغلقة رسميًا.

Phase 3.2 تبقى مغلقة رسميًا بنتائجها السابقة المثبتة: **124/124 behavior/contract tests**، **137/137 Navigation invariants**، **30/30 deliberate navigation regressions**، TypeScript الحقيقي، Production Build، وmerged-main/Pages verification ✅.

**Phase 2.8 — Visual Destruction & Quality Gate ✅** تبقى بوابة النظام البصري المجمدة، و**ENJAZ Design System 1.0** يبقى المرجع البصري الحاكم.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. أي مرحلة جديدة تُبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم تُدمج فقط بعد نجاح الاختبارات وTypeScript وProduction Build. بعد الدمج يعاد تشغيل البوابة على `main` نفسه للتأكد من سلامة النسخة الرسمية.
