import { createContext, useContext, type ReactNode } from 'react';
import type { AutomationCommandGateway } from './automationCommands.ts';

const AutomationCommandContext = createContext<AutomationCommandGateway | null>(null);

export function AutomationCommandProvider(props: Readonly<{ gateway: AutomationCommandGateway; children?: ReactNode }>) {
  return <AutomationCommandContext.Provider value={props.gateway}>{props.children}</AutomationCommandContext.Provider>;
}

export function useAutomationCommandGateway(): AutomationCommandGateway {
  const gateway = useContext(AutomationCommandContext);
  if (!gateway) throw new Error('AutomationCommandProvider is missing');
  return gateway;
}
