import { useEffect, useState, type ReactNode } from 'react';
import { EzButton } from './primitives.tsx';

type MotionState = 'entering' | 'open' | 'closing';

function useOverlayPresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [motionState, setMotionState] = useState<MotionState>(open ? 'open' : 'closing');

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (open) {
      setMounted(true);
      setMotionState('entering');
      frame = window.requestAnimationFrame(() => setMotionState('open'));
    } else if (mounted) {
      setMotionState('closing');
      timer = window.setTimeout(() => setMounted(false), reducedMotion ? 0 : 180);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [open, mounted]);

  return { mounted, motionState } as const;
}

export function EzDialog(props: Readonly<{
  open: boolean;
  title: string;
  body: string;
  onClose(): void;
  primaryLabel?: string;
  onPrimary?(): void;
  tone?: 'warning' | 'danger';
  eyebrow?: string;
}>) {
  const presence = useOverlayPresence(props.open);
  if (!presence.mounted) return null;
  const tone = props.tone ?? 'warning';
  return (
    <div className="ez-overlay" role="presentation" data-motion-state={presence.motionState} onMouseDown={(event) => { if (props.open && event.currentTarget === event.target) props.onClose(); }}>
      <section className={`ez-dialog ez-dialog--${tone}`} role="dialog" aria-modal="true" aria-labelledby="ez-dialog-title" data-dialog-tone={tone}>
        <div className="ez-dialog__mark" aria-hidden="true">{tone === 'danger' ? '×' : '!'}</div>
        <div className="ez-dialog__copy"><span>{props.eyebrow ?? (tone === 'danger' ? 'إجراء لا يمكن التراجع عنه' : 'تأكيد الإجراء')}</span><h2 id="ez-dialog-title">{props.title}</h2><p>{props.body}</p></div>
        <div className="ez-dialog__actions">
          <EzButton tone="ghost" onClick={props.onClose}>إلغاء</EzButton>
          {props.primaryLabel && props.onPrimary ? <EzButton tone={tone === 'danger' ? 'danger' : 'dark'} onClick={props.onPrimary}>{props.primaryLabel}</EzButton> : null}
        </div>
      </section>
    </div>
  );
}

export function EzSheet(props: Readonly<{
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose(): void;
  children: ReactNode;
}>) {
  const presence = useOverlayPresence(props.open);
  if (!presence.mounted) return null;
  return (
    <div className="ez-overlay ez-overlay--sheet" role="presentation" data-motion-state={presence.motionState} onMouseDown={(event) => { if (props.open && event.currentTarget === event.target) props.onClose(); }}>
      <section className="ez-sheet" role="dialog" aria-modal="true" aria-labelledby="ez-sheet-title">
        <span className="ez-sheet__grabber" aria-hidden="true" />
        <header className="ez-sheet__head">
          <div>{props.eyebrow ? <span>{props.eyebrow}</span> : null}<h2 id="ez-sheet-title">{props.title}</h2></div>
          <button type="button" className="ez-sheet__close" onClick={props.onClose} aria-label="إغلاق">×</button>
        </header>
        <div className="ez-sheet__body">{props.children}</div>
      </section>
    </div>
  );
}

export function EzMenu(props: Readonly<{
  open: boolean;
  anchorLabel: string;
  items: readonly { id: string; label: string; detail?: string; danger?: boolean }[];
  onSelect(id: string): void;
}>) {
  if (!props.open) return null;
  return (
    <div className="ez-menu" role="menu" aria-label={props.anchorLabel}>
      {props.items.map((item) => (
        <button key={item.id} type="button" role="menuitem" className={item.danger ? 'is-danger' : ''} onClick={() => props.onSelect(item.id)}>
          <span><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
          <span aria-hidden="true">←</span>
        </button>
      ))}
    </div>
  );
}
