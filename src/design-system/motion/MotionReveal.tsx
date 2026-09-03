import type { ReactNode } from 'react';
import { classNames } from '../components/classNames.ts';
import type { MotionDelay, MotionPreset } from './motionContract.ts';

export interface MotionRevealProps {
  children: ReactNode;
  preset?: MotionPreset;
  delay?: MotionDelay;
  className?: string;
}

export function MotionReveal({ children, preset = 'rise', delay = 'none', className }: MotionRevealProps) {
  return (
    <div
      className={classNames('ui-motion-reveal', className)}
      data-motion-preset={preset}
      data-motion-delay={delay}
    >
      {children}
    </div>
  );
}
