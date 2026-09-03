# ENJAZ — Phase 2.5 Motion & Interaction System

## الهدف
الحركة في إنجاز تشرح تغيّر الحالة وتؤكد الاستجابة ولا تتحول إلى زينة أو عائق. هذه المرحلة تجعل الحركة عقداً مركزياً قبل بناء App Shell والشاشات الفعلية.

## العقود
- مدد الحركة الأساسية: 90 / 140 / 220 / 320 / 420ms فقط.
- لا `transition: all`.
- لا مدد `ms` أو منحنيات `cubic-bezier` داخل Product CSS؛ مصدرها الوحيد Motion Tokens.
- hover transforms تعمل فقط على أجهزة تدعم hover فعلياً وpointer دقيقاً.
- الضغط Touch/Pointer لا يغيّر أبعاد العنصر ولا يؤخر النقر.
- Dialog وBottom Sheet يملكان enter/exit presence حقيقية قبل unmount.
- `prefers-reduced-motion: reduce` جزء إلزامي من النظام ويوقف الحركة غير الضرورية.
- لا bounce أو loops زخرفية أو `will-change` دائم.

## Motion primitives
- `MOTION_DURATION_MS` — عقد TypeScript مطابق لسلم المدد.
- `useMotionPresence` — entering → entered → exiting → exited مع تخطي انتظار الخروج عند Reduce Motion.
- `MotionReveal` — presets محدودة: fade / rise / scale، وتأخيرات محدودة: none / 1 / 2 / 3.

## المكونات المشمولة
- Button / IconButton press + fine-pointer hover.
- Field focus/error feedback.
- Checkbox / Switch state feedback.
- Tabs state transitions.
- Dialog / Bottom Sheet enter + exit.
- Skeleton / Spinner مع تعطيل الحركة في Reduced Motion.

## Proof surface
`/foundation/motion`

يعرض المختبر استجابة اللمس، reveal presets، الطبقات المتحركة، وحالة Reduce Motion.

## Quality gate
`npm run verify:phase2.5`

يمدّد بوابة 2.4 ثم يشغّل Motion Audit وMotion destructive self-test. لا تُعتمد 2.5 إذا فشل npm ci أو TypeScript أو Vite production build على GitHub Actions.
