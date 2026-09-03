import { createBrowserRouter } from 'react-router';
import { FoundationStatusPage } from '../features/foundation/pages/FoundationStatusPage';
import { NotFoundPage } from '../features/foundation/pages/NotFoundPage';
import { IdentityLabPage } from '../features/foundation/pages/IdentityLabPage';
import { TokenLabPage } from '../features/foundation/pages/TokenLabPage';
import { TypographyLabPage } from '../features/foundation/pages/TypographyLabPage';
import { ComponentLabPage } from '../features/foundation/pages/ComponentLabPage';
import { MotionLabPage } from '../features/foundation/pages/MotionLabPage';
import { MobileLabPage } from '../features/foundation/pages/MobileLabPage';
import { PatternLabPage } from '../features/foundation/pages/PatternLabPage';
import { VisualDestructionLabPage } from '../features/foundation/pages/VisualDestructionLabPage';
import { ShellPreviewPage } from '../features/foundation/pages/ShellPreviewPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { SignUpPage } from '../features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { UpdatePasswordPage } from '../features/auth/pages/UpdatePasswordPage';
import { AnonymousOnlyRoute, ProtectedRoute, RootRoute } from '../features/auth/pages/AuthRouteGuards';
import { AuthHomePage } from '../features/auth/pages/AuthHomePage';
import { NavigationBoundaryPage } from '../features/navigation/pages/NavigationBoundaryPage.tsx';
import { NavigationLabPage } from '../features/navigation/pages/NavigationLabPage.tsx';
import { PRODUCT_NAVIGATION_ROUTES } from '../core/routing/navigationContract.ts';
import { ROUTES } from '../core/routing/routes';
import { AppShell } from './AppShell';

const reservedProductRoutes = PRODUCT_NAVIGATION_ROUTES
  .filter((route) => route.id !== 'home')
  .map((route) => ({ path: route.path, Component: NavigationBoundaryPage }));

export const router = createBrowserRouter([
  { path: ROUTES.root, Component: RootRoute },
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
  {
    Component: AnonymousOnlyRoute,
    children: [
      { path: ROUTES.login, Component: LoginPage },
      { path: ROUTES.signUp, Component: SignUpPage },
      { path: ROUTES.forgotPassword, Component: ForgotPasswordPage },
    ],
  },
  { path: ROUTES.updatePassword, Component: UpdatePasswordPage },
  {
    Component: ProtectedRoute,
    children: [
      {
        Component: AppShell,
        children: [
          { path: ROUTES.appHome, Component: AuthHomePage },
          { path: ROUTES.appMore, Component: NavigationBoundaryPage },
          ...reservedProductRoutes,
        ],
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
