import { createContext, useContext, type ReactNode } from 'react';
import type { GovernanceCommandGateway } from './governanceCommands.ts';

const GovernanceCommandContext = createContext<GovernanceCommandGateway | null>(null);

export function GovernanceCommandProvider(props: Readonly<{ gateway: GovernanceCommandGateway; children?: ReactNode }>) {
  return <GovernanceCommandContext.Provider value={props.gateway}>{props.children}</GovernanceCommandContext.Provider>;
}

export function useGovernanceCommandGateway(): GovernanceCommandGateway {
  const value = useContext(GovernanceCommandContext);
  if (!value) throw new Error('GovernanceCommandProvider is missing');
  return value;
}
