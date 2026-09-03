import { useEffect, type ReactNode } from 'react';
import { MOTION_DURATION_MS, useMotionPresence } from '../motion/index.ts';
import { IconButton } from './Button.tsx';
import { classNames } from './classNames.ts';

interface OverlayProps {
  id: string;
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
}

interface OverlayFrameProps extends OverlayProps {
  mode: 'dialog' | 'sheet';
}

function OverlayFrame({
  id,
  open,
  title,
  description,
  children,
  actions,
  onClose,
  closeLabel = 'إغلاق',
  className,
  mode,
}: OverlayFrameProps) {
  const exitDuration = mode === 'sheet' ? MOTION_DURATION_MS.deliberate : MOTION_DURATION_MS.standard;
  const presence = useMotionPresence(open, exitDuration);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const frame = requestAnimationFrame(() => document.getElementById(`${id}-close`)?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [id, onClose, open]);

  if (!presence.mounted) return null;
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div
      className={classNames('ui-overlay', `ui-overlay--${mode}`)}
      data-motion-state={presence.state}
    >
      <section
        className={classNames('ui-overlay__panel', `ui-${mode}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="ui-overlay__header">
          <div className="ui-overlay__heading text-container-safe">
            <h2 className="type-title-sm" id={titleId}>{title}</h2>
            {description ? <p className="type-caption" id={descriptionId}>{description}</p> : null}
          </div>
          <IconButton label={closeLabel} icon="×" onClick={onClose} className="ui-overlay__close" />
        </header>
        <div className="ui-overlay__body type-body">{children}</div>
        {actions ? <footer className="ui-overlay__footer">{actions}</footer> : null}
      </section>
    </div>
  );
}

export function Dialog(props: OverlayProps) {
  return <OverlayFrame {...props} mode="dialog" />;
}

export function BottomSheet(props: OverlayProps) {
  return <OverlayFrame {...props} mode="sheet" />;
}
