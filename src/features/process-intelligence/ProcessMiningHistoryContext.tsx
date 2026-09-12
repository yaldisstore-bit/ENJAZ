import { createContext,useContext,type ReactNode } from 'react';
import type { ProcessRuntimeGateway } from './processMiningRuntime.ts';

export type ProcessRuntimeFactory=()=>Promise<ProcessRuntimeGateway>;
const ProcessRuntimeContext=createContext<ProcessRuntimeFactory|null>(null);
export function ProcessRuntimeProvider({factory,children}:Readonly<{factory:ProcessRuntimeFactory|null;children:ReactNode}>){return <ProcessRuntimeContext.Provider value={factory}>{children}</ProcessRuntimeContext.Provider>}
export function useProcessRuntimeFactory():ProcessRuntimeFactory|null{return useContext(ProcessRuntimeContext)}
