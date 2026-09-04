import type { AppRoute } from '../../core/routing/routes.ts';
import { useHomeDashboard } from '../../features/home/useHomeDashboard.ts';
import { RebirthHomeDashboard } from './RebirthHomeDashboard.tsx';

export function RebirthConnectedHomeDashboard(props: Readonly<{ onNavigate(route: AppRoute): void }>) {
  const state = useHomeDashboard();
  return (
    <RebirthHomeDashboard
      state={state}
      onNavigate={props.onNavigate}
      onRetry={state.retry}
    />
  );
}
