import { createContext, useContext, type ReactNode } from 'react';

const CurrentUserIdContext = createContext<string | null>(null);

export function CurrentUserIdProvider(props: Readonly<{ userId: string | null; children?: ReactNode }>) {
  return <CurrentUserIdContext.Provider value={props.userId}>{props.children}</CurrentUserIdContext.Provider>;
}

export function useCurrentUserId(): string | null {
  return useContext(CurrentUserIdContext);
}
