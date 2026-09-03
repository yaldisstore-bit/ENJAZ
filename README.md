# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية الحالية: **Phase 2.5 — Motion & Interaction System ✅**

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

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

التالي: **Phase 2.6 — Mobile / Android Hardening**.

## ما تم تثبيته حتى 2.5

- React + TypeScript + Vite
- Supabase Auth / PostgreSQL / RLS foundation
- Workspace-scoped typed Data Layer
- Arabic-first RTL architecture
- Multi-layer typed Design Token System
- Typography & bidi contracts للنصوص العربية والمحتوى المختلط
- Core reusable components:
  - Button / IconButton
  - Card / Badge
  - TextField / SelectField / TextareaField
  - Checkbox / Switch
  - Tabs
  - Dialog / Bottom Sheet
  - Progress / Skeleton / Empty State
- Motion contract مركزي بأزمنة 90 / 140 / 220 / 320 / 420ms
- MotionReveal presets محدودة: Fade / Rise / Scale
- Presence حقيقي للـDialog والـBottom Sheet عند الدخول والخروج
- Press feedback للمس وHover محصور بالأجهزة ذات المؤشر الدقيق
- دعم إلزامي لـ`prefers-reduced-motion`
- منع `transition: all` والحركات اللانهائية غير المصرح بها والأزمنة/easing العشوائية
- Accessibility contracts و44px touch floor
- اختبارات تخريب تمنع regressions في الأمن والبيانات والهوية والـRTL والمكونات والحركة

## المختبرات داخل التطبيق

- `/foundation/identity` — مختبر الهوية البصرية 2.1
- `/foundation/tokens` — مختبر Design Tokens 2.2
- `/foundation/typography` — مختبر Typography & RTL 2.3
- `/foundation/components` — مختبر Core Components 2.4
- `/foundation/motion` — مختبر Motion & Interaction 2.5

## Quality Gate

المستودع مرتبط بـ GitHub Actions، والبوابة الدائمة تشغّل على `main` وعلى Pull Requests:

1. `npm ci`
2. التحقق الكامل حتى `verify:phase2.5`
3. TypeScript الحقيقي `tsc -b`
4. Vite production build
5. التحقق من إنتاج `dist/index.html`

آخر اعتماد لـ Phase 2.5 اجتاز البوابة كاملة بنجاح على GitHub Runner الحقيقي، بما في ذلك:

- **85/85 behavior tests**
- **127/127 Motion / Interaction / Presence / Reduced-Motion invariants**
- **16/16 deliberate motion regressions rejected**
- **41/41 component/accessibility/RTL/gate invariants**
- **17/17 deliberate component regressions rejected**
- **264 total tokens / 220 public typed tokens / 77 component contracts**
- TypeScript `tsc -b` ✅
- Vite 8.2.2 production build ✅ — 169 modules transformed
- `dist/index.html` assertion ✅

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. أي مرحلة جديدة تُبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم تُدمج فقط بعد نجاح الاختبارات وTypeScript وProduction Build.
