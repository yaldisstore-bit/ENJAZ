import { createBrowserRouter } from 'react-router';
import { FoundationStatusPage } from '../features/foundation/pages/FoundationStatusPage';
import { IdentityLabPage } from '../features/foundation/pages/IdentityLabPage';
import { TokenLabPage } from '../features/foundation/pages/TokenLabPage';
import { TypographyLabPage } from '../features/foundation/pages/TypographyLabPage';
import { ComponentLabPage } from '../features/foundation/pages/ComponentLabPage';
import { MotionLabPage } from '../features/foundation/pages/MotionLabPage';
import { MobileLabPage } from '../features/foundation/pages/MobileLabPage';
import { PatternLabPage } from '../features/foundation/pages/PatternLabPage';
import { VisualDestructionLabPage } from '../features/foundation/pages/VisualDestructionLabPage';
import { ShellPreviewPage } from '../features/foundation/pages/ShellPreviewPage';
import { GlobalInteractionLabPage } from '../features/foundation/pages/GlobalInteractionLabPage';
import { ShellDestructionLabPage } from '../features/foundation/pages/ShellDestructionLabPage';
import { NotFoundPage } from '../features/foundation/pages/NotFoundPage';
import { NavigationLabPage } from '../features/navigation/pages/NavigationLabPage.tsx';
import { NavigationPreviewAppPage } from '../features/navigation/pages/NavigationPreviewAppPage.tsx';
import { PRODUCT_NAVIGATION_ROUTES } from '../core/routing/navigationContract.ts';
import { ROUTES } from '../core/routing/routes';

const previewProductRoutes = PRODUCT_NAVIGATION_ROUTES
  .map((route) => ({ path: route.path, Component: NavigationPreviewAppPage }));

export const previewRouter = createBrowserRouter([
  { path: ROUTES.root, Component: FoundationStatusPage },
  { path: ROUTES.foundation, Component: FoundationStatusPage },
  { path: ROUTES.identity, Component: IdentityLabPage },
  { path: ROUTES.tokens, Component: TokenLabPage },
  { path: ROUTES.typography, Component: TypographyLabPage },
  { path: ROUTES.components, Component: ComponentLabPage },
  { path: ROUTES.motion, Component: MotionLabPage },
  { path: ROUTES.mobile, Component: MobileLabPage },
  { path: ROUTES.patterns, Component: PatternLabPage },
  { path: ROUTES.destruction, Component: VisualDestructionLabPage },
  { path: ROUTES.shellPreview, Component: ShellPreviewPage },
  { path: ROUTES.navigationPreview, Component: NavigationLabPage },
  { path: ROUTES.interactionsPreview, Component: GlobalInteractionLabPage },
  { path: ROUTES.shellDestructionPreview, Component: ShellDestructionLabPage },
  { path: ROUTES.appMore, Component: NavigationPreviewAppPage },
  ...previewProductRoutes,
  { path: '*', Component: NotFoundPage },
], { basename: import.meta.env.BASE_URL });
