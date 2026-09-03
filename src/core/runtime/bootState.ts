export type BootStatus = 'idle' | 'booting' | 'ready' | 'failed';

export interface BootSnapshot {
  readonly status: BootStatus;
  readonly startedAt: number | null;
  readonly readyAt: number | null;
  readonly failureCode: string | null;
}

const transitions: Readonly<Record<BootStatus, readonly BootStatus[]>> = Object.freeze({
  idle: ['booting'],
  booting: ['ready', 'failed'],
  ready: [],
  failed: [],
});

export class BootStateMachine {
  #snapshot: BootSnapshot = Object.freeze({
    status: 'idle',
    startedAt: null,
    readyAt: null,
    failureCode: null,
  });

  get snapshot(): BootSnapshot {
    return this.#snapshot;
  }

  begin(now = Date.now()): BootSnapshot {
    return this.#transition('booting', { startedAt: now, readyAt: null, failureCode: null });
  }

  ready(now = Date.now()): BootSnapshot {
    return this.#transition('ready', { readyAt: now, failureCode: null });
  }

  fail(code: string): BootSnapshot {
    const safeCode = code.trim() || 'UNKNOWN';
    return this.#transition('failed', { readyAt: null, failureCode: safeCode });
  }

  #transition(next: BootStatus, patch: Partial<BootSnapshot>): BootSnapshot {
    if (!transitions[this.#snapshot.status].includes(next)) {
      throw new Error(`Invalid boot transition: ${this.#snapshot.status} -> ${next}`);
    }
    this.#snapshot = Object.freeze({ ...this.#snapshot, ...patch, status: next });
    return this.#snapshot;
  }
}
