import { createContext, useContext, type ReactNode } from 'react';
import type { EnjazDataLayerFactory } from '../createDataLayer.ts';

const DataLayerContext = createContext<EnjazDataLayerFactory | null>(null);

export function DataLayerProvider(props: { readonly factory: EnjazDataLayerFactory; readonly children?: ReactNode }) {
  return <DataLayerContext.Provider value={props.factory}>{props.children}</DataLayerContext.Provider>;
}

export function useOptionalDataLayerFactory(): EnjazDataLayerFactory | null {
  return useContext(DataLayerContext);
}

export function useDataLayerFactory(): EnjazDataLayerFactory {
  const value = useOptionalDataLayerFactory();
  if (!value) throw new Error('DataLayerProvider is missing');
  return value;
}
