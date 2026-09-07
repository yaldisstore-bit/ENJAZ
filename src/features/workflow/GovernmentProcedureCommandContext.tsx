import { createContext, useContext, type ReactNode } from 'react';
import type { GovernmentProcedureRuntimeGateway } from './governmentProcedureRuntime.ts';

const GovernmentProcedureCommandContext = createContext<GovernmentProcedureRuntimeGateway | null>(null);

export function GovernmentProcedureCommandProvider(props: Readonly<{ gateway: GovernmentProcedureRuntimeGateway; children?: ReactNode }>) {
  return <GovernmentProcedureCommandContext.Provider value={props.gateway}>{props.children}</GovernmentProcedureCommandContext.Provider>;
}

export function useOptionalGovernmentProcedureCommandGateway(): GovernmentProcedureRuntimeGateway | null {
  return useContext(GovernmentProcedureCommandContext);
}

export function useGovernmentProcedureCommandGateway(): GovernmentProcedureRuntimeGateway {
  const value = useOptionalGovernmentProcedureCommandGateway();
  if (!value) throw new Error('GovernmentProcedureCommandProvider is missing');
  return value;
}
