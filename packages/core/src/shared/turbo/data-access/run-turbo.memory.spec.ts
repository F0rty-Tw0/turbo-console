import { ChildProcess } from 'node:child_process';
import type * as childProcess from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { runTurbo } from './run-turbo.ts';
import { watchMemory } from './watch-memory.ts';
import type * as watchMemoryModule from './watch-memory.ts';
import { toTurboException } from '../../errors/utils/turbo-error.util.ts';
import { MemoryLimitError } from '../common/memory-limit.exception.ts';
import type { WatchMemoryOptions } from '../common/turbo.type.ts';
import { isAlive } from '../test/utils/process.spec.util.ts';

const spawns = vi.hoisted(() => {
  const stubs = new Set<string>();
  const children: unknown[] = [];
  const stops: Mock<() => void>[] = [];
  const state = { stubs, children, stops };

  return state;
});

/** Records each stub child `execFile` spawns; other spawns (macOS `/bin/ps` from the probe) pass through unrecorded. */
vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();

  const execFile = (...args: unknown[]): unknown => {
    const child: unknown = Reflect.apply(real.execFile, undefined, args);
    const isStub = spawns.stubs.has(String(args[0]));

    if (isStub) spawns.children.push(child);

    return child;
  };

  const mocked = { ...real, execFile };

  return mocked;
});

/** A passthrough spy: the real watch still polls the real `rssOf`. Each returned `stop` is recorded as a spy too. */
vi.mock('./watch-memory.ts', async (importOriginal) => {
  const real = await importOriginal<typeof watchMemoryModule>();

  const watchAndRecord = (pid: number, options: WatchMemoryOptions): (() => void) => {
    const realStop = real.watchMemory(pid, options);
    const stop = vi.fn(realStop);

    spawns.stops.push(stop);

    return stop;
  };

  const watchSpy = vi.fn(watchAndRecord);
  const mocked = { watchMemory: watchSpy };

  return mocked;
});

const MIB = 2 ** 20;

/**
 * Allocates and fills a 64 MiB chunk every 20 ms, so its pages are resident. It stops growing at 1 GiB and exits after
 * 10 s, so a broken watchdog cannot leave a hog running. `env` execs node under the same pid, so the watched pid is
 * the allocating one.
 */
const ALLOCATING_STUB = `#!/usr/bin/env node
const chunks = [];
const grow = () => {
  if (chunks.length < 16) chunks.push(Buffer.alloc(${String(64 * MIB)}, 1));
};
setInterval(grow, 20);
setTimeout(() => process.exit(0), 10000);
`;

/** Stays far under the bound and exits after 10 s. */
const IDLE_STUB = `#!/usr/bin/env node
setTimeout(() => undefined, 10000);
`;

/** Ignores SIGTERM, touches `<itself>.ready` once that handler is in place, and exits after 10 s. */
const SIGTERM_IGNORING_STUB = `#!/usr/bin/env node
process.on('SIGTERM', () => undefined);
require('node:fs').writeFileSync(__filename + '.ready', '');
setTimeout(() => process.exit(0), 10000);
`;

/** How long the SIGTERM-ignoring stub gets after the abort before the hard kill. */
const LONG_GRACE_MS = 2000;

/** Well inside `LONG_GRACE_MS`: the abort has run, the stub has not exited. */
const INSIDE_GRACE_MS = 500;

const BOUND = { maxRssBytes: 256 * MIB, rssPollMs: 50 };

/** Without the watchdog the allocating stub only exits after its own 10 s. */
const RUN_TIMEOUT_MS = 15_000;

const TIMEOUT_CAUSE = { name: 'TimeoutError' };

const TIMEOUT_ABORT = { name: 'AbortError', cause: TIMEOUT_CAUSE };

const ESRCH = { code: 'ESRCH' };

const rejectionOf = (rejection: unknown): unknown => rejection;

const causeOf = (error: unknown): unknown => (error instanceof Error ? error.cause : undefined);

const pidOf = (child: unknown): number | undefined => (child instanceof ChildProcess ? child.pid : undefined);

/** What a signal-0 probe of `pid` throws; `undefined` while the process still exists. */
const probeError = (pid: number | undefined): unknown => {
  if (pid === undefined) return new Error('no stub pid was recorded');

  try {
    process.kill(pid, 0);

    return undefined;
  } catch (error: unknown) {
    return error;
  }
};

/** Safety net for a failed run: no stub outlives the spec. */
const killLeftover = (child: unknown): void => {
  const pid = pidOf(child);

  if (pid === undefined) return;

  const isLeftover = isAlive(pid);

  if (isLeftover) process.kill(pid, 'SIGKILL');
};

// The stubs are node scripts run through their shebang, which Windows cannot exec.
describe.skipIf(process.platform === 'win32')('FEATURE: runTurbo memory watchdog', () => {
  let stubDir = '';
  let allocatingStub = '';
  let idleStub = '';
  let sigtermIgnoringStub = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'run-turbo-memory-'));
    allocatingStub = join(stubDir, 'allocate.js');
    idleStub = join(stubDir, 'idle.js');
    spawns.stubs.add(allocatingStub);
    sigtermIgnoringStub = join(stubDir, 'ignore-term.js');
    spawns.stubs.add(idleStub);
    spawns.stubs.add(sigtermIgnoringStub);
    await writeFile(allocatingStub, ALLOCATING_STUB, { mode: 0o755 });
    await writeFile(idleStub, IDLE_STUB, { mode: 0o755 });
    await writeFile(sigtermIgnoringStub, SIGTERM_IGNORING_STUB, { mode: 0o755 });
  });

  afterAll(async () => {
    spawns.children.forEach(killLeftover);
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a binary that allocates 64 MiB chunks up to 1 GiB', () => {
    describe('WHEN runTurbo bounds it at 256 MiB', () => {
      let rejection: unknown;
      let elapsedMs = 0;
      let pid: number | undefined;

      beforeAll(async () => {
        const startedAt = performance.now();

        rejection = await runTurbo(allocatingStub, [], stubDir, BOUND).then(undefined, rejectionOf);
        elapsedMs = performance.now() - startedAt;
        pid = pidOf(spawns.children.at(-1));
      }, RUN_TIMEOUT_MS);

      it('THEN it rejects with an AbortError whose cause is a MemoryLimitError', () => {
        expect(rejection).toMatchObject({ name: 'AbortError' });
        expect(causeOf(rejection)).toBeInstanceOf(MemoryLimitError);
      });

      it('THEN it rejects within 5 s', () => {
        expect(elapsedMs).toBeLessThan(5000);
      });

      it('THEN the rejection maps to turbo used too much memory', () => {
        const exception = toTurboException(rejection, 'query');

        expect(exception.message).toContain('used too much memory');
      });

      it('THEN the stub process is gone', () => {
        expect(probeError(pid)).toMatchObject(ESRCH);
      });
    });
  });

  describe('GIVEN a binary that idles under the bound', () => {
    it('WHEN the 100 ms timeout fires first THEN the cause is the TimeoutError, not a MemoryLimitError', async () => {
      const options = { ...BOUND, timeoutMs: 100 };

      const rejection = await runTurbo(idleStub, [], stubDir, options).then(undefined, rejectionOf);

      expect(rejection).toMatchObject(TIMEOUT_ABORT);
    });
  });

  describe('GIVEN a binary that ignores SIGTERM and idles under the bound', () => {
    describe('WHEN the caller aborts once its handler is in place', () => {
      let rejection: unknown;
      let pid: number | undefined;
      let probeInsideGrace: unknown;
      let stopCallsInsideGrace = 0;

      beforeAll(async () => {
        const controller = new AbortController();
        const options = { ...BOUND, signal: controller.signal, graceMs: LONG_GRACE_MS };
        const ready = `${sigtermIgnoringStub}.ready`;
        const run = runTurbo(sigtermIgnoringStub, [], stubDir, options).then(undefined, rejectionOf);

        await vi.waitFor(async () => access(ready), { timeout: 5000, interval: 20 });
        controller.abort();
        await setTimeout(INSIDE_GRACE_MS);

        const stop = spawns.stops.at(-1);

        pid = pidOf(spawns.children.at(-1));
        probeInsideGrace = probeError(pid);
        stopCallsInsideGrace = stop?.mock.calls.length ?? 0;
        rejection = await run;
      }, RUN_TIMEOUT_MS);

      it('THEN the stub is still running inside the grace', () => {
        expect(probeInsideGrace).toBeUndefined();
      });

      it('THEN the watch is already stopped, before the exit', () => {
        expect(stopCallsInsideGrace).toBeGreaterThan(0);
      });

      it('THEN it rejects with an AbortError', () => {
        expect(rejection).toMatchObject({ name: 'AbortError' });
      });

      it('THEN the stub is gone after the hard kill', () => {
        expect(probeError(pid)).toMatchObject(ESRCH);
      });
    });
  });

  describe('GIVEN a missing binary', () => {
    describe('WHEN runTurbo runs it with a memory bound', () => {
      let rejection: unknown;

      beforeAll(async () => {
        const missing = join(stubDir, 'missing-turbo');

        vi.mocked(watchMemory).mockClear();

        rejection = await runTurbo(missing, [], stubDir, BOUND).then(undefined, rejectionOf);
      });

      it('THEN it rejects with the spawn error, as without a bound', () => {
        expect(rejection).toMatchObject({ code: 'ENOENT' });
      });

      it('THEN no memory watch is started', () => {
        expect(watchMemory).not.toHaveBeenCalled();
      });
    });
  });
});
