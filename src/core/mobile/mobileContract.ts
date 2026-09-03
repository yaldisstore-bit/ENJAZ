export const MOBILE_VIEWPORT_META = 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' as const;
export const MOBILE_POINTER_QUERY = '(pointer: coarse)' as const;
export const MOBILE_TOUCH_TARGET_PX = 44 as const;
export const MOBILE_BREAKPOINT_PX = 768 as const;

interface MobileMediaQueryListLike {
  readonly matches: boolean;
}

interface MobileRuntime {
  readonly matchMedia?: (query: string) => MobileMediaQueryListLike;
  readonly CSS?: {
    readonly supports?: (property: string, value: string) => boolean;
  };
}

function runtimeOrGlobal(runtime?: MobileRuntime): MobileRuntime {
  return runtime ?? (globalThis as unknown as MobileRuntime);
}

export function usesCoarsePointer(runtime?: MobileRuntime): boolean {
  const activeRuntime = runtimeOrGlobal(runtime);
  return Boolean(activeRuntime.matchMedia?.(MOBILE_POINTER_QUERY).matches);
}

export function supportsDynamicViewport(runtime?: MobileRuntime): boolean {
  const activeRuntime = runtimeOrGlobal(runtime);
  return Boolean(activeRuntime.CSS?.supports?.('height', '100dvh'));
}
