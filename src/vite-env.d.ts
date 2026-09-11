/// <reference types="vite/client" />

// ECMA-402 NumberFormat accepts numeric strings and preserves their exact decimal value.
// TypeScript's current ES2022 lib declaration only exposes number/bigint overloads.
declare namespace Intl {
  interface NumberFormat {
    format(value: string): string;
  }
}
