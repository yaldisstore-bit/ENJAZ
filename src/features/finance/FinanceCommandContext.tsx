import { createContext, useContext, type ReactNode } from 'react';
import type { FinanceCommandGateway } from './financeCommands.ts';

const FinanceCommandContext = createContext<FinanceCommandGateway | null>(null);

export function FinanceCommandProvider(props: Readonly<{ gateway: FinanceCommandGateway; children?: ReactNode }>) {
  return <FinanceCommandContext.Provider value={props.gateway}>{props.children}</FinanceCommandContext.Provider>;
}

export function useOptionalFinanceCommandGateway(): FinanceCommandGateway | null {
  return useContext(FinanceCommandContext);
}

export function useFinanceCommandGateway(): FinanceCommandGateway {
  const value = useOptionalFinanceCommandGateway();
  if (!value) throw new Error('FinanceCommandProvider is missing');
  return value;
}
