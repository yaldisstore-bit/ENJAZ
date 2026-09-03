import { useLocation } from 'react-router';
import { AppShellFrame } from '../../../shared/shell/AppShellFrame.tsx';
import { NavigationBoundaryPage } from './NavigationBoundaryPage.tsx';

export function NavigationPreviewAppPage() {
  const location = useLocation();

  return (
    <AppShellFrame
      userLabel="preview@enjaz.local"
      networkState="online"
      currentPath={location.pathname}
    >
      <NavigationBoundaryPage />
    </AppShellFrame>
  );
}
