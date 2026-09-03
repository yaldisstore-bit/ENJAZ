import type { ReactNode } from 'react';
import { classNames } from './classNames.ts';
import type { BadgeTone } from './componentContract.ts';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span className={classNames('ui-badge', `ui-badge--${tone}`, className)}>
      <span className="ui-badge__dot" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
