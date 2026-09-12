import { createContext,useContext,type ReactNode } from 'react';
import type { ProcessMiningHistoryGateway } from './processMiningSources.ts';

const ProcessMiningHistoryContext=createContext<ProcessMiningHistoryGateway|null>(null);

export function ProcessMiningHistoryProvider({gateway,children}:Readonly<{gateway:ProcessMiningHistoryGateway|null;children:ReactNode}>){
 return <ProcessMiningHistoryContext.Provider value={gateway}>{children}</ProcessMiningHistoryContext.Provider>;
}

export function useProcessMiningHistoryGateway():ProcessMiningHistoryGateway|null{
 return useContext(ProcessMiningHistoryContext);
}
