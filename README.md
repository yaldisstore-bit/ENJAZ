# ENJAZ — إنجاز

**Arabic-first legal & administrative operations platform**

الحالة الحالية: **Phase 3.4 — Shell Destruction Gate 🚧 PR candidate**  
المرحلة التالية فقط بعد نجاح PR ثم `main` ثم GitHub Pages على نفس SHA: **Phase 4 — Home, Daily Work & Executive Overview**

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
- **Phase 3 — Application Shell & Navigation** 🚧
  - **Phase 3.1 — App Shell** ✅
  - **Phase 3.2 — Navigation Architecture** ✅
  - **Phase 3.3 — Global Interaction Surfaces** ✅
  - **Phase 3.4 — Shell Destruction Gate** 🚧 PR candidate
- **Phase 4 — Home, Daily Work & Executive Overview** ⏳ blocked until 3.4 closes on PR + merged `main` + Pages.

## Phase 3.4 — ما يتم تدميره الآن

3.4 لا تضيف شاشات أعمال. هي بوابة ضغط نهائية للـShell قبل بدء Home/Daily Work:

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

## ما تم تثبيته حتى 3.3

- React + TypeScript + Vite.
- Supabase Auth / PostgreSQL / RLS foundation.
- Workspace-scoped typed Data Layer.
- Arabic-first RTL architecture.
- ENJAZ Design System 1.0 المجمد.
- App Shell 3.1.
- Navigation Architecture 3.2 مع 18 product-domain roots و5 primary navigation slots.
- Global Interaction Surfaces 3.3: Global Search، Inbox، Quick Create، Command/Operations من دون تكرار منطق المجالات.
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
8. GitHub Pages يجب أن ينشر نفس merged-main SHA قبل إغلاق المرحلة.

Phase 3.4 لا تعتبر ناجحة بمجرد فتح المختبر. يجب أن تنجح اختبارات behavior/contracts، مدقق 3.4، destructive selftest، جميع بوابات 3.3 وما قبلها، TypeScript والبناء على PR، ثم تتكرر البوابة على `main` نفسه ويُثبت Pages على نفس SHA.

## الأمان والأسرار

المستودع لا يحتوي على `.env.local` أو مفاتيح Supabase الفعلية أو Service Role secrets. إعدادات البيئة الحساسة تبقى خارج Git.

## ملاحظة التطوير

`main` هو المصدر الرسمي المعتمد. لا يبدأ Phase 4 قبل إغلاق **Phase 3.4 — Shell Destruction Gate** بالكامل.
