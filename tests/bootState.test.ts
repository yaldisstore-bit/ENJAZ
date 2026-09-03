import assert from 'node:assert/strict';
import test from 'node:test';
import { BootStateMachine } from '../src/core/runtime/bootState.ts';

test('boot state follows idle -> booting -> ready', () => {
  const state = new BootStateMachine();
  assert.equal(state.snapshot.status, 'idle');
  state.begin(100);
  assert.equal(state.snapshot.status, 'booting');
  state.ready(150);
  assert.equal(state.snapshot.status, 'ready');
  assert.equal(state.snapshot.startedAt, 100);
  assert.equal(state.snapshot.readyAt, 150);
});

test('boot state rejects double boot and terminal transitions', () => {
  const state = new BootStateMachine();
  state.begin();
  assert.throws(() => state.begin(), /Invalid boot transition/);
  state.fail('BOOT_FAILED');
  assert.equal(state.snapshot.failureCode, 'BOOT_FAILED');
  assert.throws(() => state.ready(), /Invalid boot transition/);
});
