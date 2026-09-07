import { createContext, useContext, type ReactNode } from 'react';
import type { GovernmentProcedureCommandGateway } from './governmentProcedureCommands.ts';

const GovernmentProcedureCommandContext = createContext<GovernmentProcedureCommandGateway | null>(null);

export function GovernmentProcedureCommandProvider(props: Readonly<{ gateway: GovernmentProcedureCommandGateway; children?: ReactNode }>) {
  return <GovernmentProcedureCommandContext.Provider value={props.gateway}>{props.children}</GovernmentProcedureCommandContext.Provider>;
}

export function useOptionalGovernmentProcedureCommandGateway(): GovernmentProcedureCommandGateway | null {
  return useContext(GovernmentProcedureCommandContext);
}

export function useGovernmentProcedureCommandGateway(): GovernmentProcedureCommandGateway {
  const value = useOptionalGovernmentProcedureCommandGateway();
  if (!value) throw new Error('GovernmentProcedureCommandProvider is missing');
  return value;
}
