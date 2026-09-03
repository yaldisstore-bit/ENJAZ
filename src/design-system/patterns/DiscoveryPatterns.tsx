import type { ReactNode } from 'react';
import { Badge, Button, IconButton, Skeleton, type BadgeTone } from '../components/index.ts';
import { type PatternDensity, type SystemStateTone } from './patternContract.ts';

export interface SearchResultPatternProps {
  kind: 'transaction' | 'company' | 'contact' | 'document';
  title: string;
  subtitle?: string;
  reference?: string;
  meta?: readonly string[];
  statusLabel?: string;
  statusTone?: BadgeTone;
  density?: PatternDensity;
  onOpen?: () => void;
}

const KIND_LABELS: Record<SearchResultPatternProps['kind'], string> = {
  transaction: 'معاملة',
  company: 'شركة',
  contact: 'شخص',
  document: 'مستند',
};

export function SearchResultPattern({
  kind,
  title,
  subtitle,
  reference,
  meta = [],
  statusLabel,
  statusTone = 'neutral',
  density = 'comfortable',
  onOpen,
}: SearchResultPatternProps) {
  return (
    <article className={`pattern-search-result pattern-search-result--${kind} pattern-density--${density}`}>
      <div className="pattern-search-result__kind" aria-hidden="true">{kind === 'transaction' ? 'م' : kind === 'company' ? 'ش' : kind === 'contact' ? 'ص' : 'و'}</div>
      <div className="pattern-search-result__copy text-container-safe">
        <div className="pattern-search-result__eyebrow type-label">
          <span>{KIND_LABELS[kind]}</span>
          {reference ? <bdi className="text-code">{reference}</bdi> : null}
        </div>
        <h3 className="type-title-sm text-clamp-2">{title}</h3>
        {subtitle ? <p className="type-caption text-clamp-2">{subtitle}</p> : null}
        {meta.length ? <p className="pattern-search-result__meta type-caption">{meta.map((item) => <span key={item}>{item}</span>)}</p> : null}
      </div>
      <div className="pattern-search-result__aside">
        {statusLabel ? <Badge tone={statusTone}>{statusLabel}</Badge> : null}
        <IconButton label={`فتح ${KIND_LABELS[kind]} ${title}`} icon="←" {...(onOpen ? { onClick: onOpen } : {})} />
      </div>
    </article>
  );
}

export interface ActionMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onSelect?: () => void;
}

export interface ActionMenuPatternProps {
  label?: string;
  items: readonly ActionMenuItem[];
  density?: PatternDensity;
}

export function ActionMenuPattern({ label = 'الإجراءات المتاحة', items, density = 'comfortable' }: ActionMenuPatternProps) {
  return (
    <section className={`pattern-action-menu pattern-density--${density}`} aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          className={`pattern-action-menu__item pattern-action-menu__item--${item.tone ?? 'default'}`}
          type="button"
          disabled={item.disabled}
          onClick={item.onSelect}
        >
          <span className="pattern-action-menu__icon" aria-hidden="true">{item.icon ?? '•'}</span>
          <span className="pattern-action-menu__copy text-container-safe">
            <strong className="type-body">{item.label}</strong>
            {item.description ? <small className="type-caption">{item.description}</small> : null}
          </span>
          <span className="pattern-action-menu__chevron" aria-hidden="true">‹</span>
        </button>
      ))}
    </section>
  );
}

const STATE_COPY: Record<SystemStateTone, { icon: string; label: string; live: 'polite' | 'assertive' }> = {
  empty: { icon: '○', label: 'حالة فارغة', live: 'polite' },
  loading: { icon: '…', label: 'جارٍ التحميل', live: 'polite' },
  success: { icon: '✓', label: 'نجاح', live: 'polite' },
  warning: { icon: '!', label: 'تحذير', live: 'polite' },
  error: { icon: '×', label: 'خطأ', live: 'assertive' },
  conflict: { icon: '⇄', label: 'تعارض', live: 'assertive' },
  offline: { icon: '⌁', label: 'غير متصل', live: 'polite' },
  recovery: { icon: '↻', label: 'استعادة', live: 'polite' },
};

export interface SystemStatePatternProps {
  tone: SystemStateTone;
  title: string;
  description: string;
  detail?: string;
  primaryAction?: { label: string; onClick?: () => void };
  secondaryAction?: { label: string; onClick?: () => void };
  density?: PatternDensity;
}

export function SystemStatePattern({
  tone,
  title,
  description,
  detail,
  primaryAction,
  secondaryAction,
  density = 'comfortable',
}: SystemStatePatternProps) {
  const copy = STATE_COPY[tone];

  return (
    <section
      className={`pattern-system-state pattern-system-state--${tone} pattern-density--${density}`}
      role={tone === 'error' || tone === 'conflict' ? 'alert' : 'status'}
      aria-live={copy.live}
    >
      <div className="pattern-system-state__icon" aria-hidden="true">{copy.icon}</div>
      <div className="pattern-system-state__copy text-container-safe">
        <p className="pattern-system-state__label type-label">{copy.label}</p>
        <h3 className="type-title-sm">{title}</h3>
        <p className="type-body">{description}</p>
        {detail ? <p className="pattern-system-state__detail type-caption">{detail}</p> : null}
      </div>
      {(primaryAction || secondaryAction) ? (
        <div className="pattern-system-state__actions">
          {primaryAction ? <Button {...(primaryAction.onClick ? { onClick: primaryAction.onClick } : {})}>{primaryAction.label}</Button> : null}
          {secondaryAction ? <Button variant="ghost" {...(secondaryAction.onClick ? { onClick: secondaryAction.onClick } : {})}>{secondaryAction.label}</Button> : null}
        </div>
      ) : null}
    </section>
  );
}

export interface PatternSkeletonProps {
  rows?: number;
  compact?: boolean;
}

export function PatternSkeleton({ rows = 3, compact = false }: PatternSkeletonProps) {
  const safeRows = Math.min(6, Math.max(1, Math.round(rows)));
  const rowSlots = Array<null>(safeRows).fill(null);

  return (
    <section className={`pattern-skeleton${compact ? ' pattern-skeleton--compact' : ''}`} aria-label="جارٍ تحميل المحتوى" aria-busy="true">
      <div className="pattern-skeleton__header"><Skeleton variant="circle" /><div><Skeleton /><Skeleton /></div></div>
      <div className="pattern-skeleton__body">
        {rowSlots.map((_, index) => (
          <span className="pattern-skeleton__row" key={`pattern-skeleton-${index}`}>
            <Skeleton variant={index === safeRows - 1 ? 'block' : 'line'} />
          </span>
        ))}
      </div>
    </section>
  );
}
