import { RouterProvider } from 'react-router';
import type { AuthGateway } from '../core/auth/authGateway.ts';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { AuthProvider } from '../features/auth/state/AuthContext.tsx';
import { router } from './router.tsx';

export function App(props: { readonly authGateway: AuthGateway; readonly dataLayerFactory: EnjazDataLayerFactory }) {
  return (
    <AuthProvider gateway={props.authGateway}>
      <DataLayerProvider factory={props.dataLayerFactory}>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <RouterProvider router={router} />
      </DataLayerProvider>
    </AuthProvider>
  );
}
