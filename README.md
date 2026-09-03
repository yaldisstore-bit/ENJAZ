# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الرسمية الحالية: **Phase 3.4 — Shell Destruction Gate ✅**  
المرحلة التالية المسموح بها: **Phase 4 — Home, Daily Work & Executive Overview** — لم تبدأ بعد.

إنجاز مشروع جديد مبني من الصفر بهوية مستقلة وبنية حديثة، مع الحفاظ على المفاهيم التشغيلية الأساسية للمشروع السابق دون نقل واجهاته أو الـlegacy UI DNA.

## الخطة الرسمية حتى التسليم

- [`docs/ENJAZ_MASTER_ROADMAP.md`](docs/ENJAZ_MASTER_ROADMAP.md) — التسلسل الرسمي من التأسيس حتى **ENJAZ 1.0 — Delivered**.
- [`docs/ENJAZ_ROADMAP_PROVENANCE.md`](docs/ENJAZ_ROADMAP_PROVENANCE.md) — مصدر الخطة وحدود استعادة التسميات التاريخية.

**قاعدة حاكمة:** لا يجوز تخطي مرحلة أو إعادة تسميتها أو القفز إلى مرحلة لاحقة بصمت. أي تغيير في الخطة يجب أن يكون صريحًا وموثقًا داخل المستودع.

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
- **Phase 4 — Home, Daily Work & Executive Overview** ⏭ NEXT — not started.

## Phase 3.4 — ما تم تدميره والتحقق منه

3.4 لم تضف شاشات أعمال. كانت بوابة ضغط نهائية للـShell قبل بدء Home/Daily Work:

- Keyboard / visual viewport torture.
- Back/navigation determinism.
- Portrait ↔ landscape rotation stress.
- Route refresh وdeep-link على GitHub Pages.
- Session expiry أثناء التنقل مع fail-closed إلى login.
- Offline/online recovery مع بقاء الهيكل قابلًا للاستخدام.
- Narrow phone fixture عند **320px**.
- Long Arabic labels عند **200 characters**.
- Safe Areas و`100dvh` و44px touch floor.
- منع raw colors و`!important` وnumeric z-index و`transition: all` وأي كسر للـDesign Tokens.

المختبر البنيوي: `/foundation/shell-destruction`.

## ما تم تثبيته حتى إغلاق Phase 3

- React + TypeScript + Vite.
- Supabase Auth / PostgreSQL / RLS foundation.
- Workspace-scoped typed Data Layer.
- Arabic-first RTL architecture.
- ENJAZ Design System 1.0 المجمد.
- App Shell 3.1.
- Navigation Architecture 3.2 مع 18 product-domain roots و5 primary navigation slots.
- Global Interaction Surfaces 3.3: Global Search، Inbox، Quick Create، Command/Operations من دون تكرار منطق المجالات.
- Shell Destruction Gate 3.4 مع keyboard/back/rotation/deep-link/session/offline/narrow/long-label torture.
- GitHub Pages SPA fallback وdeep-link-safe preview.

## المختبرات داخل التطبيق

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

## Quality Gate

GitHub Actions يعمل على Pull Requests وعلى `main`:

1. `npm ci`
2. السلسلة الكاملة حتى `npm run verify:phase3.4`
3. Roadmap integrity audit
4. TypeScript الحقيقي `tsc -b`
5. Vite production build
6. فحص `dist/index.html`
7. الاحتفاظ بالـproduction artifact على `main`
8. GitHub Pages ينشر فقط من verified `main` workflow.

Phase 3.4 اجتازت PR #14 ثم merged `main` على SHA `a2df0390858e93fb4d55cf9412f5f6b452a1ed18`:

- **148/148 behavior/contract tests** ✅
- **143/143 Phase 3.4 shell-destruction invariants** ✅
- **37/37 deliberate Phase 3.4 regressions rejected** ✅
- Phase 3.3 legacy audit **151/151** + forward-compatibility **7/7** ✅
- Phase 3.3 destructive **41/41** + forward downgrade/workflow/gate **5/5** ✅
- Navigation 3.2 **137/137 + 31/31** ✅
- App Shell 3.1 **79/79 + 15/15** ✅
- Motion **169/169 + 16/16** ✅
- Mobile/Android **50/50 + 10/10** ✅
- Database **45 tables / 118 policies / 42 indexes**; DB selftest **5/5** ✅
- Real TypeScript `tsc -b` ✅
- Vite 8.2.2 production build ✅ — **191 modules transformed**
- `dist/index.html` assertion ✅
- PR Quality Gate run **#183** ✅
- merged-main Quality Gate run **#184** ✅
- GitHub Pages Preview run **#144** on the same merged feature SHA ✅
- verified production artifact ID `9904038804`, digest `sha256:383e48b9090a6fa3196a50a6603330cf9d95e1112ce17bca71f77d5a3a595767` ✅

أثناء 3.4 لم تُخفَ العيوب في الاختبارات: تم إصلاح coupling قديم في 3.3 مع الحفاظ على جميع فحوصه الأصلية، وتقوية destructive probes للـauth subscription وoffline plumbing و`100dvh` وSafe Areas والتوثيق بدل حذف السيناريوهات أو تخفيف الحراس.

**Phase 3 — Application Shell & Navigation ✅ مكتملة.**  
الخطوة التالية فقط هي **Phase 4 — Home, Daily Work & Executive Overview**، ولم تبدأ بعد.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. كل مرحلة جديدة تبنى على فرع مستقل، تمر عبر GitHub Quality Gate، ثم يعاد اختبار `main` ونشر Pages من النسخة الموثقة قبل الإغلاق الرسمي.
