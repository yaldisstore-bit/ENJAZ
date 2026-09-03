import { createBrowserRouter } from 'react-router';
import { FoundationStatusPage } from '../features/foundation/pages/FoundationStatusPage';
import { IdentityLabPage } from '../features/foundation/pages/IdentityLabPage';
import { TokenLabPage } from '../features/foundation/pages/TokenLabPage';
import { TypographyLabPage } from '../features/foundation/pages/TypographyLabPage';
import { ComponentLabPage } from '../features/foundation/pages/ComponentLabPage';
import { MotionLabPage } from '../features/foundation/pages/MotionLabPage';
import { MobileLabPage } from '../features/foundation/pages/MobileLabPage';
import { PatternLabPage } from '../features/foundation/pages/PatternLabPage';
import { NotFoundPage } from '../features/foundation/pages/NotFoundPage';
import { ROUTES } from '../core/routing/routes';

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
  { path: '*', Component: NotFoundPage },
], { basename: import.meta.env.BASE_URL });
