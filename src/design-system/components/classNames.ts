export type ClassValue = string | false | null | undefined;

export function classNames(...values: readonly ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
