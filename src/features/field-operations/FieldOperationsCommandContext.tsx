import { createContext, useContext, type ReactNode } from 'react';
import type { FieldOperationsCommandGateway } from './fieldOperationsCommands.ts';

const FieldOperationsCommandContext = createContext<FieldOperationsCommandGateway | null>(null);

export function FieldOperationsCommandProvider({ gateway, children }: Readonly<{ gateway: FieldOperationsCommandGateway; children: ReactNode }>) {
  return <FieldOperationsCommandContext.Provider value={gateway}>{children}</FieldOperationsCommandContext.Provider>;
}

export function useFieldOperationsCommandGateway(): FieldOperationsCommandGateway {
  const value = useContext(FieldOperationsCommandContext);
  if (!value) throw new Error('FieldOperationsCommandProvider is required');
  return value;
}
