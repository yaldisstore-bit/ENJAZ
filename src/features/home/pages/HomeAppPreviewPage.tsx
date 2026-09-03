import { ROUTES } from '../../../core/routing/routes.ts';
import { AppShellFrame } from '../../../shared/shell/AppShellFrame.tsx';
import { HomeDashboardPreviewPage } from './HomeDashboardPreviewPage.tsx';

export function HomeAppPreviewPage() {
  return (
    <AppShellFrame
      userLabel="مساحة المعاينة"
      networkState="online"
      currentPath={ROUTES.appHome}
      inboxCount={3}
    >
      <HomeDashboardPreviewPage />
    </AppShellFrame>
  );
}
