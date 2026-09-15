import { createContext, useContext, type ReactNode } from 'react';
import type { SchedulingCommandGateway } from './schedulingCommands.ts';

const SchedulingCommandContext = createContext<SchedulingCommandGateway | null>(null);

export function SchedulingCommandProvider(props: Readonly<{ gateway: SchedulingCommandGateway; children?: ReactNode }>) {
  return <SchedulingCommandContext.Provider value={props.gateway}>{props.children}</SchedulingCommandContext.Provider>;
}

export function useOptionalSchedulingCommandGateway(): SchedulingCommandGateway | null {
  return useContext(SchedulingCommandContext);
}

export function useSchedulingCommandGateway(): SchedulingCommandGateway {
  const value = useOptionalSchedulingCommandGateway();
  if (!value) throw new Error('SchedulingCommandProvider is missing');
  return value;
}
