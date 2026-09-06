import { createContext, useContext, type ReactNode } from 'react';

const LiveCompaniesExperienceContext = createContext<ReactNode>(null);

export function LiveCompaniesExperienceProvider({ value, children }: Readonly<{ value: ReactNode; children?: ReactNode }>) {
  return <LiveCompaniesExperienceContext.Provider value={value}>{children}</LiveCompaniesExperienceContext.Provider>;
}

export function useLiveCompaniesExperience(): ReactNode {
  return useContext(LiveCompaniesExperienceContext);
}
