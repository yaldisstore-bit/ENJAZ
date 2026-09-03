import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path: string): Promise<string> {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Home receives authenticated user identity through app composition, never Auth feature imports', async () => {
  const [hook, appShell, sharedSession] = await Promise.all([
    source('src/features/home/useHomeDashboard.ts'),
    source('src/app/AppShell.tsx'),
    source('src/shared/session/CurrentUserIdContext.tsx'),
  ]);

  assert.doesNotMatch(hook, /features\/auth|\.\.\/auth\/|AuthContext|useAuth/);
  assert.match(hook, /useCurrentUserId/);
  assert.match(appShell, /useAuth/);
  assert.match(appShell, /CurrentUserIdProvider userId=\{user\?\.id \?\? null\}/);
  assert.doesNotMatch(sharedSession, /features\/|AuthContext|useAuth/);
});

test('offline React shim models JSX keys and functional state updates used by real React', async () => {
  const shim = await source('types/offline-react.d.ts');
  assert.match(shim, /interface IntrinsicAttributes \{ key\?: string \| number \}/);
  assert.match(shim, /SetStateAction<T> = T \| \(\(previous: T\) => T\)/);
  assert.match(shim, /useState<T>\(initial: T \| \(\(\) => T\)\)/);
});

test('Home links consume a frozen typography weight token instead of inventing semibold', async () => {
  const css = await source('src/styles/home-dashboard.css');
  assert.match(css, /\.home-dashboard__text-link[\s\S]*font-weight:\s*var\(--font-weight-medium\)/);
  assert.doesNotMatch(css, /--font-weight-semibold/);
});
