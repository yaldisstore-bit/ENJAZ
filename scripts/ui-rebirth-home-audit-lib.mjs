export function auditHomeSources({ component, css, shell, connected, preview }) {
  const failures = [];
  const requireRule = (condition, message) => { if (!condition) failures.push(message); };

  // Real business-core integration: the new visual layer consumes the preserved Home contract.
  requireRule(component.includes("HomeDashboardSnapshot") && component.includes("HomeDashboardLoadState"), 'Home UI must consume typed Home dashboard contracts');
  requireRule(connected.includes('useHomeDashboard()'), 'connected Home adapter must use the real Home data hook');
  requireRule(connected.includes('onRetry={state.retry}'), 'real Home retry contract must reach the new UI');
  requireRule(shell.includes('activeRoute === ROUTES.appHome'), 'Home must mount only for the canonical appHome route');
  requireRule(shell.includes('<RebirthHomeDashboard'), 'rebirth shell must mount the new Home presentation');

  // Reference-driven composition. These are intentionally not a uniform card grid.
  for (const token of [
    'rebirth-home__hero',
    'rebirth-home__hero-score',
    'rebirth-home__hero-stats',
    'rebirth-home__priority-mosaic',
    'rebirth-home__finance',
    'rebirth-home__signal-stack',
    'rebirth-home__closing',
  ]) requireRule(component.includes(token), `Home composition missing ${token}`);

  requireRule(component.includes('الأولوية قبل القائمة'), 'priority-first information hierarchy missing');
  requireRule(component.includes('التحصيل النشط'), 'Home financial snapshot missing');
  requireRule(component.includes('نبض التشغيل'), 'Home operational signals missing');
  requireRule(component.includes('ROUTES.appToday') && component.includes('ROUTES.appTransactions'), 'Home actions must connect to real ENJAZ destinations');
  requireRule(component.includes("status === 'loading'") && component.includes("status === 'error'"), 'Home must have explicit loading and error states');
  requireRule(component.includes('لم نعرض أرقامًا غير مؤكدة'), 'error state must refuse fabricated/partial metrics');

  // Visual DNA from the approved yellow / charcoal / cream Home reference.
  requireRule(css.includes('var(--ui-gold)') && css.includes('var(--ui-charcoal)'), 'Home must use canonical gold + charcoal identity');
  requireRule(/\.rebirth-home__hero\s*\{[\s\S]*linear-gradient/.test(css), 'Home hero must be a designed gold composition');
  requireRule(/\.rebirth-home__priority-card\[data-rank='1'\][\s\S]*grid-column:\s*1\s*\/\s*-1/.test(css), 'mobile priority composition must give rank 1 dominant geometry');
  requireRule(/@media \(min-width:\s*760px\)[\s\S]*grid-template-columns:\s*1\.35fr\s+\.85fr\s+\.85fr/.test(css), 'wide Home must keep asymmetric priority geometry');
  requireRule(/\.rebirth-home__finance\s*\{[\s\S]*var\(--ui-charcoal\)/.test(css), 'finance block must be deep charcoal, not another white card');
  requireRule(css.includes("[data-rank='2']") && css.includes("[data-rank='3']") && css.includes("[data-rank='4']"), 'priority cards must have varied visual weights');
  requireRule(css.includes("[data-tone='danger']") && css.includes("[data-tone='warning']") && css.includes("[data-tone='success']"), 'operational signals must express semantic state');
  requireRule(css.includes('@media (max-width: 390px)'), 'compact Android reflow contract missing');
  requireRule(css.includes('@media (prefers-reduced-motion: reduce)'), 'Home reduced-motion contract missing');

  // Interaction and semantic quality.
  requireRule(!/<div[^>]+onClick=/.test(component), 'clickable div is forbidden in Home');
  requireRule(!/<span[^>]+onClick=/.test(component), 'clickable span is forbidden in Home');
  requireRule((component.match(/type="button"/g) ?? []).length >= 5, 'Home actions must use semantic buttons');
  requireRule(component.includes('aria-labelledby="rebirth-home-title"'), 'Home hero needs a labelled landmark');
  requireRule(component.includes('aria-label="ملخص العمل"'), 'Home summary must have an accessible label');
  requireRule(component.includes('aria-busy="true"'), 'Home loading state must expose aria-busy');
  requireRule(!/Phase\s*\d|Stage\s*\d|preview fixture|developer/i.test(component), 'developer/stage terminology must not leak into Home UI');
  requireRule(!/home-dashboard|AppShellFrame|identity3|productivity-(?:polish|depth)/i.test(component + css), 'previous visual DNA leaked into Home');

  // Preview is deterministic and shaped exactly like the real snapshot contract.
  requireRule(preview.includes("status: 'ready'"), 'Home preview must use a typed ready state');
  requireRule((preview.match(/destination: '\/app\/transactions'/g) ?? []).length >= 4, 'preview priorities must preserve real transaction destinations');
  requireRule(preview.includes('precisionSafe: true'), 'preview finance precision contract missing');
  requireRule((preview.match(/Object\.freeze\(/g) ?? []).length >= 8, 'preview state must be immutable/deterministic');

  return failures;
}
