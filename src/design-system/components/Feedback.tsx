import type { ReactNode } from 'react';
import { classNames } from './classNames.ts';
import { clampProgress, type SkeletonVariant } from './componentContract.ts';

export interface ProgressBarProps {
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const safeValue = clampProgress(value);
  return (
    <div className={classNames('ui-progress-wrap', className)}>
      <div className="ui-progress__meta type-caption">
        <span>{label}</span>
        <bdi className="text-numeric">{safeValue}%</bdi>
      </div>
      <progress className="ui-progress" max={100} value={safeValue} aria-label={label} />
    </div>
  );
}

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

export function Skeleton({ variant = 'line', className }: SkeletonProps) {
  return <span className={classNames('ui-skeleton', `ui-skeleton--${variant}`, className)} aria-hidden="true" />;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon = '✓', action, className }: EmptyStateProps) {
  return (
    <section className={classNames('ui-empty-state', className)} role="status">
      <div className="ui-empty-state__icon" aria-hidden="true">{icon}</div>
      <div className="ui-empty-state__copy text-container-safe">
        <h3 className="type-title-sm">{title}</h3>
        <p className="type-body">{description}</p>
      </div>
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </section>
  );
}
