import { createContext, useContext, type ReactNode } from 'react';
import type { OrganizationWorkspaceResolver } from './organizationWorkspaceResolver.ts';

const OrganizationWorkspaceResolverContext=createContext<OrganizationWorkspaceResolver|null>(null);

export function OrganizationWorkspaceResolverProvider({resolver,children}:Readonly<{resolver:OrganizationWorkspaceResolver;children:ReactNode}>){
  return <OrganizationWorkspaceResolverContext.Provider value={resolver}>{children}</OrganizationWorkspaceResolverContext.Provider>;
}

export function useOrganizationWorkspaceResolver():OrganizationWorkspaceResolver{
  const value=useContext(OrganizationWorkspaceResolverContext);
  if(!value)throw new Error('OrganizationWorkspaceResolverProvider is required');
  return value;
}
