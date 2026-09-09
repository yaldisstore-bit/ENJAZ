import { createContext, useContext, type ReactNode } from 'react';
import type { OrganizationAssignmentCatalog } from './organizationAssignmentCatalog.ts';

const OrganizationAssignmentCatalogContext=createContext<OrganizationAssignmentCatalog|null>(null);

export function OrganizationAssignmentCatalogProvider({catalog,children}:Readonly<{catalog:OrganizationAssignmentCatalog;children:ReactNode}>){
  return <OrganizationAssignmentCatalogContext.Provider value={catalog}>{children}</OrganizationAssignmentCatalogContext.Provider>;
}

export function useOrganizationAssignmentCatalog():OrganizationAssignmentCatalog{
  const value=useContext(OrganizationAssignmentCatalogContext);
  if(!value)throw new Error('OrganizationAssignmentCatalogProvider is required');
  return value;
}
