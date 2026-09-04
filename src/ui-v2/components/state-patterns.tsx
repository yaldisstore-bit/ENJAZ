import type { ReactNode } from 'react';
import { EzButton } from './primitives.tsx';

export type EzStateKind = 'loading' | 'empty' | 'error' | 'offline' | 'conflict' | 'permission' | 'success' | 'archived';

const stateMeta: Record<EzStateKind, { eyebrow: string; mark: string }> = {
  loading: { eyebrow: 'جارٍ التحضير', mark: '···' },
  empty: { eyebrow: 'لا توجد عناصر', mark: '○' },
  error: { eyebrow: 'تعذر الإكمال', mark: '!' },
  offline: { eyebrow: 'لا يوجد اتصال', mark: '↯' },
  conflict: { eyebrow: 'تعارض في التغييرات', mark: '⇄' },
  permission: { eyebrow: 'صلاحية مطلوبة', mark: '⌁' },
  success: { eyebrow: 'اكتمل بنجاح', mark: '✓' },
  archived: { eyebrow: 'مؤرشف', mark: '▣' },
};

export function EzStatePanel(props: Readonly<{
  kind: EzStateKind;
  title: string;
  body: string;
  detail?: string;
  actionLabel?: string;
  onAction?(): void;
  secondary?: ReactNode;
  compact?: boolean;
}>) {
  const meta = stateMeta[props.kind];
  const liveRole = props.kind === 'error' || props.kind === 'offline' || props.kind === 'conflict' || props.kind === 'permission' ? 'alert' : 'status';

  return (
    <section className={`ez-state ez-state--${props.kind} ${props.compact ? 'ez-state--compact' : ''}`.trim()} role={liveRole} data-state-kind={props.kind}>
      <div className="ez-state__mark" aria-hidden="true">{meta.mark}</div>
      <div className="ez-state__copy">
        <span>{meta.eyebrow}</span>
        <h3>{props.title}</h3>
        <p>{props.body}</p>
        {props.detail ? <small>{props.detail}</small> : null}
      </div>
      {props.kind === 'loading' ? (
        <div className="ez-state__skeleton" aria-hidden="true"><i /><i /><i /></div>
      ) : null}
      {(props.actionLabel && props.onAction) || props.secondary ? (
        <div className="ez-state__actions">
          {props.actionLabel && props.onAction ? <EzButton tone={props.kind === 'error' || props.kind === 'conflict' ? 'dark' : 'ghost'} onClick={props.onAction}>{props.actionLabel}</EzButton> : null}
          {props.secondary}
        </div>
      ) : null}
    </section>
  );
}
