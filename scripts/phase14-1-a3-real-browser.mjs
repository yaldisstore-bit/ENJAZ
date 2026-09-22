import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { startA3Process, runA3Process } from './phase14-1-a3-process.mjs';

const CLOUDFLARED_VERSION = '2026.9.1';
const CLOUDFLARED_SHA256 = '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc';
const CLOUDFLARED_PATH = `/tmp/enjaz-cloudflared-${CLOUDFLARED_VERSION}`;
const CLOUDFLARED_LOG = '/tmp/enjaz-phase14-1-a3-cloudflared.log';
const PUBLISHED_MANIFEST = 'dist/enjaz-phase14-1-a3-deploy.json';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function startExternalProcess(command, args, { env = process.env, timeoutMs = 600_000 } = {}) {
  const grouped = process.platform !== 'win32';
  const child = spawn(command, args, { env, stdio: 'ignore', detached: grouped });
  let closed = false, timedOut = false, forceTimer;
  const signal = name => {
    try {
      if (grouped && child.pid) process.kill(-child.pid, name);
      else child.kill(name);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  const done = new Promise(resolve => {
    child.once('error', error => {
      closed = true;
      clearTimeout(deadline);
      clearTimeout(forceTimer);
      resolve({ code: null, signal: null, error });
    });
    child.once('close', (code, signalName) => {
      closed = true;
      clearTimeout(deadline);
      clearTimeout(forceTimer);
      resolve({ code, signal: signalName, error: null, timedOut });
    });
  });
  const stop = async () => {
    if (!closed) {
      signal('SIGTERM');
      forceTimer ??= setTimeout(() => signal('SIGKILL'), 2000);
    }
    return done;
  };
  const deadline = setTimeout(() => { timedOut = true; void stop(); }, timeoutMs);
  return { child, done, stop, get closed() { return closed; } };
}

async function ensurePinnedCloudflared() {
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('A3_PUBLISHED_TUNNEL_UNSUPPORTED_RUNNER');
  const download = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-amd64`;
  const response = await fetch(download, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error('A3_PUBLISHED_TUNNEL_DOWNLOAD_FAILED');
  const binary = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(binary).digest('hex');
  if (digest !== CLOUDFLARED_SHA256) throw new Error('A3_PUBLISHED_TUNNEL_DIGEST_MISMATCH');
  await writeFile(CLOUDFLARED_PATH, binary, { mode: 0o700 });
  await chmod(CLOUDFLARED_PATH, 0o700);
  return CLOUDFLARED_PATH;
}

export function parseQuickTunnelUrl(log) {
  const urls = String(log).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/gi) ?? [];
  if (!urls.length) return null;
  const parsed = new URL(urls.at(-1));
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/' ||
      !/^[a-z0-9-]+\.trycloudflare\.com$/.test(parsed.hostname))
    throw new Error('A3_PUBLISHED_TUNNEL_URL_INVALID');
  return parsed.toString();
}

async function waitForQuickTunnel(tunnel) {
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    if (tunnel.closed) throw new Error('A3_PUBLISHED_TUNNEL_EXITED_BEFORE_READY');
    try {
      const url = parseQuickTunnelUrl(await readFile(CLOUDFLARED_LOG, 'utf8'));
      if (url) return url;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await sleep(500);
  }
  throw new Error('A3_PUBLISHED_TUNNEL_NOT_READY');
}

export async function requireExactPublishedBuild(baseUrl, sha, {
  fetchImpl = fetch,
  wait = sleep,
  now = Date.now,
  timeoutMs = 90_000,
  requestTimeoutMs = 15_000,
} = {}) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('A3_PUBLISHED_SHA_INVALID');
  const manifestUrl = new URL('/enjaz-phase14-1-a3-deploy.json', baseUrl);
  const deadline = now() + timeoutMs;
  do {
    try {
      const response = await fetchImpl(manifestUrl, {
        cache: 'no-store', signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) {
        let manifest = null;
        try { manifest = await response.json(); } catch { /* Edge may still return transient HTML. */ }
        if (manifest !== null) {
          if (manifest?.schema !== 'enjaz.phase14-1.a3.ephemeral-deploy.v1' || manifest?.sha !== sha)
            throw new Error('A3_PUBLISHED_SHA_NOT_EXACT');
          console.log('A3_PUBLISHED_MANIFEST_EXACT_SHA_READY');
          return;
        }
      }
    } catch (error) {
      // A reachable but stale/wrong build is a hard failure, never a retry.
      if (error?.message === 'A3_PUBLISHED_SHA_NOT_EXACT') throw error;
    }
    if (now() >= deadline) break;
    await wait(Math.min(1_000, Math.max(0, deadline - now())));
  } while (now() < deadline);
  throw new Error('A3_PUBLISHED_MANIFEST_UNREACHABLE');
}

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
  const publishExternally = process.env.GITHUB_ACTIONS === 'true';
  const exactHead = process.env.GITHUB_SHA ?? '';
  if (publishExternally) {
    if (!/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('A3_PUBLISHED_SHA_INVALID');
    await writeFile(PUBLISHED_MANIFEST, JSON.stringify({
      schema: 'enjaz.phase14-1.a3.ephemeral-deploy.v1', sha: exactHead,
    }) + '\n', 'utf8');
    // Vite keeps its host allowlist narrow. This adds only the temporary tunnel
    // suffix and avoids the unsafe all-hosts option.
    publicEnv.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = '.trycloudflare.com';
  }
  const preview = startA3Process([
    'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1',
    '--port', '4193', '--strictPort',
  ], { env: publicEnv, timeoutMs: 10 * 60_000 });
  let tunnel = null;
  try {
    await waitFor('http://127.0.0.1:4193/portal', preview);
    let browserBaseUrl = 'http://127.0.0.1:4193/';
    if (publishExternally) {
      const binary = await ensurePinnedCloudflared();
      await writeFile(CLOUDFLARED_LOG, '', 'utf8');
      tunnel = startExternalProcess(binary, [
        'tunnel', '--url', 'http://127.0.0.1:4193', '--no-autoupdate',
        '--logfile', CLOUDFLARED_LOG, '--loglevel', 'info',
      ], { env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        LANG: process.env.LANG ?? 'C.UTF-8',
      }, timeoutMs: 10 * 60_000 });
      browserBaseUrl = await waitForQuickTunnel(tunnel);
      await requireExactPublishedBuild(browserBaseUrl, exactHead);
    }
    await runA3Process([
      'node_modules/@playwright/test/cli.js', 'test',
      'tests-external/phase14-1-a3-real-auth.spec.cjs',
      '--reporter=line', '--workers=1', '--global-timeout=360000',
    ], { env: { ...publicEnv, ENJAZ_A3_BASE_URL: browserBaseUrl,
      ENJAZ_A3_OWNER_EMAIL: owner.email, ENJAZ_A3_OWNER_PASSWORD: owner.password,
      ENJAZ_A3_CLIENT_EMAIL: client.email, ENJAZ_A3_CLIENT_PASSWORD: client.password,
    }, timeoutMs: 390_000 });
    verify(true, 'A3_REAL_AUTH_STAFF_CLIENT_FIVE_WIDTH_CHROMIUM');
    verify(true, 'A3_REAL_CLIENT_OFFLINE_REFRESH_RECOVERY');
    if (publishExternally) {
      const tunnelResult = await tunnel.stop();
      if (tunnelResult.error || tunnelResult.timedOut || !tunnel.closed)
        throw new Error('A3_PUBLISHED_TUNNEL_DID_NOT_CLOSE');
      tunnel = null;
      console.log('A3_PUBLISHED_TUNNEL_PROCESS_CLOSED');
      verify(true, 'A3_EXACT_SHA_EPHEMERAL_HTTPS_PUBLISHED_PORTAL');
      verify(true, 'A3_PUBLISHED_PORTAL_TUNNEL_CLOSED_AFTER_TEST');
    }
  } finally {
    if (tunnel) {
      await tunnel.stop();
      console.log('A3_PUBLISHED_TUNNEL_PROCESS_CLOSED');
    }
    await preview.stop();
    console.log('A3_PREVIEW_PROCESS_CLOSED');
  }
}
