export function validateExtremeUI({ shell, shellCss, hardeningCss, tokensCss, foundationCss }) {
  const failures = [];
  const requireSource = (condition, message) => { if (!condition) failures.push(message); };

  requireSource(shell.includes('data-enjaz-ui="rebirth"'), 'missing rebirth runtime boundary');
  requireSource(shell.includes('dir="rtl"'), 'RTL root contract missing');
  requireSource(shell.includes('<header className="rebirth-shell__header"'), 'application header landmark missing');
  requireSource(shell.includes('<main className="rebirth-shell__viewport"'), 'main landmark missing');
  requireSource(shell.includes('<nav className="rebirth-shell__dock"'), 'primary navigation landmark missing');
  requireSource(shell.includes('aria-label="التنقل الرئيسي"'), 'primary navigation accessible name missing');
  requireSource(shell.includes('role="dialog"') && shell.includes('aria-modal="true"'), 'modal dialog semantics incomplete');
  requireSource(shell.includes('aria-labelledby="rebirth-quick-actions-title"'), 'dialog label relationship missing');
  requireSource(shell.includes('aria-haspopup="dialog"'), 'dialog trigger does not expose popup semantics');
  requireSource(shell.includes('aria-controls="rebirth-quick-actions"'), 'dialog trigger/control relationship missing');
  requireSource(shell.includes('aria-expanded={quickActionsOpen}'), 'dialog expanded state missing');
  requireSource(shell.includes('primaryActionRef') && shell.includes('quickSheetRef'), 'dialog focus references missing');
  requireSource(shell.includes("querySelector<HTMLElement>('[data-autofocus]')") && shell.includes('data-autofocus className='), 'dialog initial focus target/selector contract missing');
  requireSource(shell.includes("event.key === 'Escape'"), 'Escape dismissal contract missing');
  requireSource(shell.includes("event.key !== 'Tab'"), 'Tab focus-trap contract missing');
  requireSource((shell.match(/event\.shiftKey/g) ?? []).length >= 2 && shell.includes('!event.shiftKey'), 'bidirectional Tab/Shift+Tab focus traversal contract missing');
  requireSource(shell.includes('FOCUSABLE_SELECTOR'), 'focusable element enumeration missing');
  requireSource(shell.includes('primaryActionRef.current?.focus()'), 'focus restoration to trigger missing');
  requireSource((shell.match(/inert={quickActionsOpen \? true : undefined}/g) ?? []).length >= 3, 'background is not inert while dialog is open');

  const buttonTags = [...shell.matchAll(/<button\b([\s\S]*?)>/g)];
  requireSource(buttonTags.length >= 8, 'unexpectedly low interactive control coverage');
  for (const [, attributes] of buttonTags) {
    if (!/\btype="button"/.test(attributes)) failures.push('button without explicit type="button"');
  }

  requireSource(!/\b(console\.(log|debug)|debugger|FIXME|HACK)\b/.test(shell), 'debug/development residue in runtime shell');
  for (const legacy of ['app-shell__', 'home-dashboard', 'productivity-polish', 'productivity-depth', 'Identity 2', 'Identity 3']) {
    requireSource(!shell.includes(legacy), `legacy visual marker returned: ${legacy}`);
  }

  const css = `${shellCss}\n${hardeningCss}\n${tokensCss}`;
  requireSource(css.includes('100dvh'), 'dynamic viewport height contract missing');
  for (const side of ['top', 'bottom', 'left', 'right']) {
    requireSource(css.includes(`safe-area-inset-${side}`), `safe-area-inset-${side} missing`);
  }
  requireSource(css.includes('overflow-x: clip'), 'horizontal overflow containment missing');
  requireSource(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion contract missing');
  requireSource(hardeningCss.includes('@media (forced-colors: active)'), 'forced-colors accessibility contract missing');
  requireSource(hardeningCss.includes(':focus-visible'), 'visible keyboard focus contract missing');
  requireSource(tokensCss.includes('--ui-touch-min: 44px'), '44px minimum touch token missing');
  requireSource(tokensCss.includes('--ui-ink-secondary: #54514d'), 'high-contrast secondary ink token missing');
  requireSource(shellCss.includes('color: var(--ui-ink-secondary);'), 'quick-action microcopy is not using high-contrast secondary ink');
  requireSource(hardeningCss.includes('min-width: var(--ui-touch-min)') && hardeningCss.includes('min-height: var(--ui-touch-min)'), 'minimum interactive target size is not enforced');
  requireSource(
    hardeningCss.includes('inset-inline: 0;') && hardeningCss.includes('margin-inline: auto;') && hardeningCss.includes('translate: none;'),
    'direction-safe center CTA geometry missing',
  );
  requireSource(css.includes('grid-template-columns: 1fr 1fr 76px 1fr 1fr'), 'center CTA dock geometry changed');
  requireSource(css.includes('pointer-events: none') && css.includes('pointer-events: auto'), 'dock layering/pointer contract incomplete');
  requireSource(foundationCss.trim().endsWith("@import './qa-hardening.css';"), 'QA hardening layer is not last in foundation cascade');
  requireSource(!/100vh(?![a-z])/i.test(css), 'legacy 100vh used instead of dynamic viewport units');

  const sheetKeyframesStart = shellCss.indexOf('@keyframes rebirth-sheet-in');
  const sheetKeyframesEnd = sheetKeyframesStart >= 0 ? shellCss.indexOf('@media (min-width: 760px)', sheetKeyframesStart) : -1;
  const sheetKeyframes = sheetKeyframesStart >= 0 && sheetKeyframesEnd > sheetKeyframesStart
    ? shellCss.slice(sheetKeyframesStart, sheetKeyframesEnd)
    : '';
  requireSource(sheetKeyframes.includes('from { transform: translateY(28px) scale(.985); }'), 'dialog entrance transform contract missing');
  requireSource(sheetKeyframes.includes('to { transform: translateY(0) scale(1); }'), 'dialog entrance completion transform contract missing');
  requireSource(!sheetKeyframes.includes('opacity:'), 'dialog content must remain fully opaque during entrance to preserve WCAG contrast');

  return failures;
}
