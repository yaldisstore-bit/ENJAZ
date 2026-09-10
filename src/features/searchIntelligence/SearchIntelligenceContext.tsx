import { createContext, useContext, type ReactNode } from 'react';
import type { SearchIntelligenceGateway } from './searchIntelligenceCommands.ts';

const SearchIntelligenceContext = createContext<SearchIntelligenceGateway | null>(null);

export function SearchIntelligenceProvider(props: Readonly<{ gateway: SearchIntelligenceGateway; children?: ReactNode }>) {
  return <SearchIntelligenceContext.Provider value={props.gateway}>{props.children}</SearchIntelligenceContext.Provider>;
}

export function useSearchIntelligenceGateway(): SearchIntelligenceGateway {
  const gateway = useContext(SearchIntelligenceContext);
  if (!gateway) throw new Error('SearchIntelligenceProvider is missing');
  return gateway;
}
