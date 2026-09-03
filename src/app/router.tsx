import { createBrowserRouter } from 'react-router';
import { FoundationStatusPage } from '../features/foundation/pages/FoundationStatusPage';
import { NotFoundPage } from '../features/foundation/pages/NotFoundPage';
import { IdentityLabPage } from '../features/foundation/pages/IdentityLabPage';
import { TokenLabPage } from '../features/foundation/pages/TokenLabPage';
import { TypographyLabPage } from '../features/foundation/pages/TypographyLabPage';
import { ComponentLabPage } from '../features/foundation/pages/ComponentLabPage';
import { MotionLabPage } from '../features/foundation/pages/MotionLabPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { SignUpPage } from '../features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { UpdatePasswordPage } from '../features/auth/pages/UpdatePasswordPage';
import { AnonymousOnlyRoute, ProtectedRoute, RootRoute } from '../features/auth/pages/AuthRouteGuards';
import { AuthHomePage } from '../features/auth/pages/AuthHomePage';
import { ROUTES } from '../core/routing/routes';

export const router = createBrowserRouter([
  { path: ROUTES.root, Component: RootRoute },
  { path: ROUTES.foundation, Component: FoundationStatusPage },
  { path: ROUTES.identity, Component: IdentityLabPage },
  { path: ROUTES.tokens, Component: TokenLabPage },
  { path: ROUTES.typography, Component: TypographyLabPage },
  { path: ROUTES.components, Component: ComponentLabPage },
  { path: ROUTES.motion, Component: MotionLabPage },
  {
    Component: AnonymousOnlyRoute,
    children: [
      { path: ROUTES.login, Component: LoginPage },
      { path: ROUTES.signUp, Component: SignUpPage },
      { path: ROUTES.forgotPassword, Component: ForgotPasswordPage },
    ],
  },
  { path: ROUTES.updatePassword, Component: UpdatePasswordPage },
  { Component: ProtectedRoute, children: [{ path: ROUTES.appHome, Component: AuthHomePage }] },
  { path: '*', Component: NotFoundPage },
]);
