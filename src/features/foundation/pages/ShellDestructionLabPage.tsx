import { AppShellFrame } from '../../../shared/shell/AppShellFrame.tsx';
import {
  SHELL_DESTRUCTION_FIXTURES,
  SHELL_DESTRUCTION_LIMITS,
  SHELL_DESTRUCTION_SCENARIOS,
  classifyShellViewport,
  isKeyboardOccluding,
} from '../../../core/shell/shellDestructionContract.ts';
import { ROUTES } from '../../../core/routing/routes.ts';

const scenarioLabels: Record<(typeof SHELL_DESTRUCTION_SCENARIOS)[number], string> = {
  keyboard: 'لوحة المفاتيح والـvisual viewport',
  back: 'الرجوع الآمن بين مستويات التنقل',
  rotation: 'الدوران Portrait / Landscape',
  deepLink: 'فتح Deep Link وتحديث الصفحة',
  sessionExpiry: 'انتهاء الجلسة أثناء التنقل',
  offline: 'ثبات الهيكل أثناء Offline',
  narrowScreen: 'شاشة ضيقة 320px',
  longLabels: 'عناوين عربية طويلة 200 حرف',
};

export function ShellDestructionLabPage() {
  const keyboardDetected = isKeyboardOccluding(800, 620);
  const narrowClass = classifyShellViewport(
    SHELL_DESTRUCTION_LIMITS.narrowWidthPx,
    SHELL_DESTRUCTION_LIMITS.portraitHeightPx,
  );
  const landscapeClass = classifyShellViewport(
    SHELL_DESTRUCTION_LIMITS.landscapeWidthPx,
    SHELL_DESTRUCTION_LIMITS.landscapeHeightPx,
  );

  return (
    <main className="foundation-page shell-destruction-lab" id="main-content" data-phase="3.4">
      <section className="foundation-card shell-destruction-lab__intro" aria-labelledby="shell-destruction-title">
        <p className="foundation-eyebrow">Phase 3.4 — Shell Destruction Gate</p>
        <h1 id="shell-destruction-title">مختبر تدمير هيكل إنجاز</h1>
        <p>
          هذه الصفحة لا تبني وظائف أعمال جديدة؛ بل تثبت أن App Shell وNavigation وGlobal Interactions
          تتحمل حالات الضغط المحددة في الخطة قبل السماح بالانتقال إلى Phase 4.
        </p>
      </section>

      <section className="shell-destruction-lab__scenario-grid" aria-label="سيناريوهات التدمير">
        {SHELL_DESTRUCTION_SCENARIOS.map((scenario) => (
          <article className="shell-destruction-lab__scenario" data-scenario={scenario} key={scenario}>
            <strong>{scenarioLabels[scenario]}</strong>
            <span>محمي بعقد واختبار تخريب مستقل.</span>
          </article>
        ))}
      </section>

      <section className="foundation-card shell-destruction-lab__facts" aria-labelledby="destruction-facts-title">
        <h2 id="destruction-facts-title">حقائق الضغط</h2>
        <dl>
          <div><dt>أضيق عرض</dt><dd>{SHELL_DESTRUCTION_LIMITS.narrowWidthPx}px — {narrowClass}</dd></div>
          <div><dt>Landscape</dt><dd>{SHELL_DESTRUCTION_LIMITS.landscapeWidthPx}×{SHELL_DESTRUCTION_LIMITS.landscapeHeightPx} — {landscapeClass}</dd></div>
          <div><dt>Keyboard occlusion</dt><dd>{keyboardDetected ? 'detected' : 'not detected'}</dd></div>
          <div><dt>Long label</dt><dd>{SHELL_DESTRUCTION_FIXTURES.longArabicLabel.length} characters</dd></div>
          <div><dt>Deep link</dt><dd dir="ltr">{SHELL_DESTRUCTION_FIXTURES.deepLink}</dd></div>
          <div><dt>Session fallback</dt><dd dir="ltr">{SHELL_DESTRUCTION_FIXTURES.anonymousRedirect}</dd></div>
        </dl>
      </section>

      <section className="shell-destruction-lab__narrow-fixture" aria-label="معاينة Shell تحت الضغط">
        <AppShellFrame
          userLabel={SHELL_DESTRUCTION_FIXTURES.longArabicLabel}
          networkState="offline"
          currentPath={ROUTES.appTransactions}
          errorMessage="تعذر تحديث البيانات أثناء الاختبار. يجب أن يبقى التنقل والمحتوى الأساسيان قابلين للوصول دون تداخل أو قص."
          inboxCount={999}
        >
          <article className="foundation-card shell-destruction-lab__long-content">
            <p className="foundation-eyebrow">320px / Offline / Long-label fixture</p>
            <h2>{SHELL_DESTRUCTION_FIXTURES.longArabicLabel}</h2>
            <p>
              يجب أن يلتف النص، يبقى الشريط السفلي قابلًا للمس، ولا تغطي لوحة المفاتيح أو Safe Area
              الإجراء الأساسي. الرجوع من {ROUTES.appTransactions} يجب أن يبقى حتميًا عبر Navigation Contract.
            </p>
          </article>
        </AppShellFrame>
      </section>
    </main>
  );
}
