declare namespace JSX {
  interface Element {}
  interface IntrinsicAttributes { key?: string | number }
  interface IntrinsicElements { [elementName: string]: Record<string, unknown> }
}

declare module 'react' {
  export type ReactNode = unknown;
  export type SetStateAction<T> = T | ((previous: T) => T);
  export interface ErrorInfo { componentStack?: string | null }
  export interface FormEvent<T = Element> { preventDefault(): void; currentTarget: T; target: T }
  export interface ChangeEvent<T = Element> { currentTarget: T; target: T }
  export interface KeyboardEvent<T = Element> { key: string; preventDefault(): void; currentTarget: T; target: T }
  export const StrictMode: (props: { children?: ReactNode }) => JSX.Element;
  export interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => JSX.Element; readonly __contextType?: T }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function useState<T>(initial: T | (() => T)): [T, (value: SetStateAction<T>) => void];
  export function useEffect(effect: () => void | (() => void), dependencies: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T;
  export class Component<P = {}, S = {}> {
    readonly props: Readonly<P>;
    state: S;
    constructor(props: P);
  }
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';
  export interface Root { render(children: ReactNode): void }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module 'react-router' {
  import type { ReactNode } from 'react';
  export interface RouterObject {}
  export interface Location {
    pathname: string;
    search: string;
    hash: string;
  }
  export interface LinkProps {
    to: string;
    className?: string;
    children?: ReactNode;
    key?: string | number;
    role?: string;
    onClick?: () => void;
    'aria-label'?: string;
    'aria-current'?: 'page' | undefined;
  }
  export function createBrowserRouter(routes: readonly unknown[], options?: { basename?: string }): RouterObject;
  export function RouterProvider(props: { router: RouterObject }): JSX.Element;
  export function Link(props: LinkProps): JSX.Element;
  export function Navigate(props: { to: string; replace?: boolean }): JSX.Element;
  export function Outlet(): JSX.Element;
  export function useNavigate(): (to: string, options?: { replace?: boolean }) => void;
  export function useLocation(): Location;
}

interface ImportMetaEnv { readonly [key: string]: unknown }
interface ImportMeta { readonly env: ImportMetaEnv }

// Offline typecheck: side-effect stylesheet imports are intentionally opaque.
declare module '*.css' {}
