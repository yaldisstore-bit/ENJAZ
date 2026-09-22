import { spawn } from 'node:child_process';

// The Linux CI worker owns the process group, including browser/server children.
// A sent signal (ChildProcess.killed) is not evidence that a process has exited.
export function startA3Process(args, {
  env = process.env, stdio = 'inherit', timeoutMs = 600_000, killGraceMs = 2000,
} = {}) {
  const grouped = process.platform !== 'win32';
  const child = spawn(process.execPath, args, { env, stdio, detached: grouped });
  let closed = false, timedOut = false, spawnError = false, forceTimer;
  const signal = name => {
    try {
      if (grouped && child.pid) process.kill(-child.pid, name);
      else child.kill(name);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  const done = new Promise(resolve => {
    child.once('error', () => { spawnError = true; });
    child.once('close', (code, exitSignal) => {
      closed = true;
      clearTimeout(deadline);
      clearTimeout(forceTimer);
      resolve({ code, exitSignal, timedOut, spawnError });
    });
  });
  const stop = async () => {
    if (!closed) {
      signal('SIGTERM');
      forceTimer ??= setTimeout(() => signal('SIGKILL'), killGraceMs);
    }
    return done;
  };
  const deadline = setTimeout(() => { timedOut = true; void stop(); }, timeoutMs);
  return { child, done, stop, get closed() { return closed; } };
}

export async function runA3Process(args, options) {
  const result = await startA3Process(args, options).done;
  if (result.timedOut) throw new Error('A3_COMMAND_TIMEOUT');
  if (result.spawnError || result.code !== 0) throw new Error('A3_COMMAND_FAILED');
}
