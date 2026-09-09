import { createContext, useContext, type ReactNode } from 'react';
import type { OrganizationGateway } from './organizationCommands.ts';

const OrganizationCommandContext=createContext<OrganizationGateway|null>(null);

export function OrganizationCommandProvider({gateway,children}:Readonly<{gateway:OrganizationGateway;children:ReactNode}>){
  return <OrganizationCommandContext.Provider value={gateway}>{children}</OrganizationCommandContext.Provider>;
}

export function useOrganizationGateway():OrganizationGateway{
  const value=useContext(OrganizationCommandContext);
  if(!value)throw new Error('OrganizationCommandProvider is required');
  return value;
}
