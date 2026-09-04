export function validateRebirthShell(tsx, css) {
  const failures = [];
  const requireTsx = (needle, label) => { if (!tsx.includes(needle)) failures.push(`missing ${label}`); };
  const requireCss = (needle, label) => { if (!css.includes(needle)) failures.push(`missing ${label}`); };

  requireTsx('className="rebirth-shell__header"', 'new shell header');
  requireTsx('className="rebirth-shell__viewport"', 'content viewport');
  requireTsx('className="rebirth-shell__dock"', 'engineered bottom dock');
  requireTsx('className="rebirth-shell__primary-action ui-pressable"', 'integrated center action');
  requireTsx('className="rebirth-shell__cta-slot"', 'center action dock slot');
  requireTsx('aria-label="التنقل الرئيسي"', 'navigation accessibility label');
  requireTsx('aria-expanded={quickActionsOpen}', 'quick action expanded state');
  requireTsx('role="dialog"', 'quick action dialog semantics');
  requireTsx('dir="rtl"', 'RTL direction');
  requireTsx('ROUTES.appHome', 'home routing contract');
  requireTsx('ROUTES.appToday', 'daily-work routing contract');
  requireTsx('ROUTES.appTransactions', 'transactions routing contract');
  requireTsx('ROUTES.appMore', 'more routing contract');

  requireCss('env(safe-area-inset-top)', 'top safe area');
  requireCss('env(safe-area-inset-bottom)', 'bottom safe area');
  requireCss('grid-template-columns: 1fr 1fr 76px 1fr 1fr', 'dock geometry with integrated CTA slot');
  requireCss('@media (prefers-reduced-motion: reduce)', 'reduced motion contract');
  requireCss('.rebirth-shell__primary-action[aria-expanded=\'true\']', 'CTA interaction state');
  requireCss('backdrop-filter:', 'layered shell chrome');

  const forbiddenVisualImports = [
    "src/styles/",
    "src/design-system/",
    "shared/shell",
    "features/home/pages",
    "productivity-polish",
    "productivity-depth",
    "identity3",
  ];
  for (const marker of forbiddenVisualImports) {
    if (tsx.includes(marker) || css.includes(marker)) failures.push(`legacy visual dependency or marker present: ${marker}`);
  }

  const userFacingForbidden = [
    'STAGE 0', 'STAGE 1', 'UI REBIRTH', 'boundary', 'audit', 'proof',
    'مرحلة 0', 'مرحلة 1', 'اختبار', 'تدقيق',
  ];
  for (const marker of userFacingForbidden) {
    if (tsx.includes(`>${marker}<`) || tsx.includes(`>${marker} `) || tsx.includes(` ${marker}<`)) {
      failures.push(`developer terminology exposed to user: ${marker}`);
    }
  }

  const navItemCount = (tsx.match(/data-route=\{item\.route\}/g) ?? []).length;
  if (navItemCount !== 2) failures.push(`navigation map structure changed unexpectedly: expected 2 mapped nav blocks, got ${navItemCount}`);

  if (!/min-height:\s*100dvh/.test(css)) failures.push('dynamic viewport height contract missing');
  if (!/position:\s*fixed[\s\S]*?bottom:\s*max\(10px, env\(safe-area-inset-bottom\)\)/.test(css)) failures.push('dock is not safe-area anchored');
  if (!/pointer-events:\s*none[\s\S]*?\.rebirth-shell__dock-surface[\s\S]*?pointer-events:\s*auto/.test(css)) failures.push('dock layering/pointer-event contract missing');

  return failures;
}
