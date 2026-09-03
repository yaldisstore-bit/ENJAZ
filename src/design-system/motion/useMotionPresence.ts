import { useEffect, useState } from 'react';
import { MOTION_DURATION_MS, prefersReducedMotion, type MotionPresenceState } from './motionContract.ts';

export interface MotionPresence {
  mounted: boolean;
  state: MotionPresenceState;
}

export function useMotionPresence(open: boolean, exitDurationMs = MOTION_DURATION_MS.standard): MotionPresence {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<MotionPresenceState>(open ? 'entered' : 'exited');

  useEffect(() => {
    if (open) {
      if (!mounted) setMounted(true);
      setState('entering');
      const frame = requestAnimationFrame(() => setState('entered'));
      return () => cancelAnimationFrame(frame);
    }

    if (!mounted) {
      setState('exited');
      return undefined;
    }

    setState('exiting');
    const delay = prefersReducedMotion() ? 0 : exitDurationMs;
    const timeout = window.setTimeout(() => {
      setMounted(false);
      setState('exited');
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [exitDurationMs, mounted, open]);

  return { mounted, state };
}
