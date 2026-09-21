import { startA3Process, runA3Process } from './phase14-1-a3-process.mjs';

async function waitFor(url, preview) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (preview.closed) throw new Error('A3_PREVIEW_EXITED_BEFORE_READY');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* bounded startup retry; never log URLs or credentials */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('A3_PREVIEW_NOT_READY');
}

export async function checkPhase14A3RealBrowser({ owner, client, url, publishableKey, verify }) {
  if (!owner?.email || !owner?.password || !client?.email || !client?.password)
    throw new Error('A3_REAL_AUTH_USERS_MISSING');
  if (url !== 'https://nqhgaukutkyvfumbtbtg.supabase.co' ||
      typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_'))
    throw new Error('A3_REAL_AUTH_CONFIG_INVALID');

  // Install/build before creating cloud fixtures in the workflow. Run the actual
  // Node entrypoints: killing an npx wrapper leaves its Vite child and pipes alive.
  const { SUPABASE_SECRET_KEY: _secret, ...publicEnv } = process.env;
  const preview = startA3Process([
    'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1',
    '--port', '4193', '--strictPort',
  ], { env: publicEnv, timeoutMs: 10 * 60_000 });
  try {
    await waitFor('http://127.0.0.1:4193/portal', preview);
    await runA3Process([
      'node_modules/@playwright/test/cli.js', 'test',
      'tests-external/phase14-1-a3-real-auth.spec.cjs',
      '--reporter=line', '--workers=1', '--global-timeout=360000',
    ], { env: { ...publicEnv, ENJAZ_A3_BASE_URL: 'http://127.0.0.1:4193/',
      ENJAZ_A3_OWNER_EMAIL: owner.email, ENJAZ_A3_OWNER_PASSWORD: owner.password,
      ENJAZ_A3_CLIENT_EMAIL: client.email, ENJAZ_A3_CLIENT_PASSWORD: client.password,
    }, timeoutMs: 390_000 });
    verify(true, 'A3_REAL_AUTH_STAFF_CLIENT_FIVE_WIDTH_CHROMIUM');
    verify(true, 'A3_REAL_CLIENT_OFFLINE_REFRESH_RECOVERY');
  } finally {
    await preview.stop();
    console.log('A3_PREVIEW_PROCESS_CLOSED');
  }
}
