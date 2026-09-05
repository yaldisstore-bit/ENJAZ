import { useEffect, useRef } from 'react';

type R2OverlayId = 'search' | 'account' | null;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function currentDestination(): string {
  return new URLSearchParams(window.location.search).get('dest')?.trim() || 'home';
}

function visibleFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
}

export function useR2OverlayFocusGuard(overlay: R2OverlayId): void {
  const lastOutsideFocus = useRef<HTMLElement | null>(null);
  const previousOverlay = useRef<R2OverlayId>(overlay);
  const openedDestination = useRef<string | null>(overlay ? currentDestination() : null);

  useEffect(() => {
    const rememberOutsideFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('.r2-overlay')) return;
      lastOutsideFocus.current = target;
    };
    document.addEventListener('focusin', rememberOutsideFocus, true);
    return () => document.removeEventListener('focusin', rememberOutsideFocus, true);
  }, []);

  useEffect(() => {
    const previous = previousOverlay.current;

    if (overlay && !previous) openedDestination.current = currentDestination();

    if (!overlay && previous) {
      const shouldRestore = openedDestination.current === currentDestination();
      const target = shouldRestore ? lastOutsideFocus.current : null;
      openedDestination.current = null;
      if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }

    previousOverlay.current = overlay;
  }, [overlay]);

  useEffect(() => {
    if (!overlay) return undefined;

    const overlayNode = document.querySelector<HTMLElement>(`[data-overlay="${overlay}"]`);
    const panel = overlayNode?.querySelector<HTMLElement>('.r2-search-panel, .r2-account-sheet');
    if (!overlayNode || !panel) return undefined;

    const background = Array.from(document.querySelectorAll<HTMLElement>('.r2-shell__rail, .r2-shell__workspace'));
    background.forEach((node) => node.setAttribute('inert', ''));

    const focusInitial = () => {
      const focusables = visibleFocusableElements(panel);
      const preferred = panel.querySelector<HTMLElement>('input[autofocus], [data-r2-dialog-initial]');
      const target = preferred && focusables.includes(preferred) ? preferred : focusables[0];
      target?.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(focusInitial);

    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusables = visibleFocusableElements(panel);
      if (!focusables.length) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', trapTab, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', trapTab, true);
      background.forEach((node) => node.removeAttribute('inert'));
    };
  }, [overlay]);
}
