import { createContext, useContext, type ReactNode } from 'react';
import type { NotificationCommandGateway } from './notificationCommands.ts';

const NotificationCommandContext = createContext<NotificationCommandGateway | null>(null);

export function NotificationCommandProvider(props: Readonly<{ gateway: NotificationCommandGateway; children?: ReactNode }>) {
  return <NotificationCommandContext.Provider value={props.gateway}>{props.children}</NotificationCommandContext.Provider>;
}

export function useOptionalNotificationCommandGateway(): NotificationCommandGateway | null {
  return useContext(NotificationCommandContext);
}

export function useNotificationCommandGateway(): NotificationCommandGateway {
  const value = useOptionalNotificationCommandGateway();
  if (!value) throw new Error('NotificationCommandProvider is missing');
  return value;
}
