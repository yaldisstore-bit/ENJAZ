import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startA3Process, runA3Process } from '../scripts/phase14-1-a3-process.mjs';
import { requireExactPublishedBuild } from '../scripts/phase14-1-a3-real-browser.mjs';

const exactSha = 'be1c715fd783de8431dae2376833a456725f0c20';

test('A3 process reports success and propagates failure without a shell wrapper', async () => {
  await runA3Process(['-e', 'process.exit(0)'], { stdio: 'ignore' });
  await assert.rejects(runA3Process(['-e', 'process.exit(7)'], { stdio: 'ignore' }),
    /A3_COMMAND_FAILED/);
});

test('A3 timeout stops a hung child instead of waiting for the CI job limit', async () => {
  await assert.rejects(runA3Process(['-e', 'setInterval(()=>{},1000)'],
    { stdio: 'ignore', timeoutMs: 200, killGraceMs: 100 }), /A3_COMMAND_TIMEOUT/);
});

test('A3 stop waits for actual exit and escalates when SIGTERM is ignored', async () => {
  const preview = startA3Process(['-e',
    "process.on('SIGTERM',()=>{});setInterval(()=>{},1000);process.stdout.write('ready')"],
    { stdio: ['ignore', 'pipe', 'pipe'], timeoutMs: 5000, killGraceMs: 100 });
  try {
    await once(preview.child.stdout, 'data');
    const result = await preview.stop();
    assert.equal(preview.closed, true);
    assert.equal(result.exitSignal, 'SIGKILL');
    assert.equal(result.timedOut, false);
  } finally { await preview.stop(); }
});

test('A3 stop closes the spawned server child and its inherited pipes',
  { skip: process.platform === 'win32' }, async () => {
    const preview = startA3Process(['-e',
      "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});process.stdout.write('ready');setInterval(()=>{},1000)"],
      { stdio: ['ignore', 'pipe', 'pipe'], timeoutMs: 5000, killGraceMs: 100 });
    try {
      await once(preview.child.stdout, 'data');
      await preview.stop();
      assert.equal(preview.closed, true);
      assert.equal(preview.child.stdout.destroyed, true);
    } finally { await preview.stop(); }
  });

test('A3 published manifest tolerates transient edge readiness and then binds exact SHA', async () => {
  let request = 0;
  let clock = 0;
  const responses = [
    () => { throw new TypeError('fetch failed'); },
    () => ({ ok: false, status: 530 }),
    () => ({ ok: true, json: async () => ({
      schema: 'enjaz.phase14-1.a3.ephemeral-deploy.v1', sha: exactSha,
    }) }),
  ];
  await requireExactPublishedBuild('https://example.trycloudflare.com/', exactSha, {
    fetchImpl: async () => responses[request++](),
    wait: async ms => { clock += ms; },
    now: () => clock,
    timeoutMs: 5_000,
  });
  assert.equal(request, 3);
});

test('A3 published manifest rejects a reachable wrong SHA without retrying', async () => {
  let requests = 0;
  await assert.rejects(requireExactPublishedBuild(
    'https://example.trycloudflare.com/', exactSha, {
      fetchImpl: async () => {
        requests += 1;
        return { ok: true, json: async () => ({
          schema: 'enjaz.phase14-1.a3.ephemeral-deploy.v1',
          sha: '0000000000000000000000000000000000000000',
        }) };
      },
      wait: async () => assert.fail('wrong SHA must not be retried'),
    },
  ), /A3_PUBLISHED_SHA_NOT_EXACT/);
  assert.equal(requests, 1);
});
