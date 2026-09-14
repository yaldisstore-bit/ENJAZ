import {createContext,useContext,type ReactNode} from 'react';
import type {FinancialReportRenderGateway} from './financialReportRenderCommands.ts';

const FinancialReportRenderContext=createContext<FinancialReportRenderGateway|null>(null);

export function FinancialReportRenderProvider(props:Readonly<{gateway:FinancialReportRenderGateway;children?:ReactNode}>){return <FinancialReportRenderContext.Provider value={props.gateway}>{props.children}</FinancialReportRenderContext.Provider>}
export function useOptionalFinancialReportRenderGateway(){return useContext(FinancialReportRenderContext)}
export function useFinancialReportRenderGateway(){const value=useOptionalFinancialReportRenderGateway();if(!value)throw new Error('FinancialReportRenderProvider is missing');return value}
