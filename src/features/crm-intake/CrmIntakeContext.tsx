import { createContext, useContext, type ReactNode } from 'react';
import type { CrmIntakeGateway } from './crmIntakeCommands.ts';

const CrmIntakeContext=createContext<CrmIntakeGateway|null>(null);
export function CrmIntakeProvider({gateway,children}:Readonly<{gateway:CrmIntakeGateway;children:ReactNode}>){return <CrmIntakeContext.Provider value={gateway}>{children}</CrmIntakeContext.Provider>}
export function useCrmIntakeGateway():CrmIntakeGateway{const value=useContext(CrmIntakeContext);if(!value)throw new Error('CrmIntakeProvider is required');return value}
