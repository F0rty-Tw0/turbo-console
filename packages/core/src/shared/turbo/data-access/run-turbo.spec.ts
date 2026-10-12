import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runTurbo } from './run-turbo.ts';
import { toTurboException } from '../../errors/utils/turbo-error.util.ts';
import type { RunTurboOptions, TurboResult } from '../common/turbo.type.ts';
import { isAlive } from '../test/utils/process.spec.util.ts';

type StubName = 'slow-term' | 'ignore-term' | 'quick-term' | 'stderr-term' | 'exit-3';

type AbortOutcome = {
  readonly error: unknown;
  readonly elapsedMs: number;
  readonly isStubAlive: boolean;
};

/** Installed before the stub writes its pid, so a visible pid means a SIGTERM already meets the trap. */
const STUB_TRAPS: Record<StubName, string> = {
  'slow-term': "trap 'sleep 1.5; exit 0' TERM",
  'ignore-term': "trap '' TERM",
  'quick-term': "trap 'exit 0' TERM",
  'stderr-term': "trap 'exit 0' TERM",
  'exit-3': ':'
};

/** Runs after the shell writes its own pid (`$$`) and its first argument next to the script. */
const STUB_BODIES: Record<StubName, string> = {
  'slow-term': 'while :; do sleep 0.1; done',
  'ignore-term': 'while :; do sleep 0.1; done',
  'quick-term': 'while :; do sleep 0.1; done',
  'stderr-term': "head -c 70000 /dev/zero | tr '\\0' x >&2; echo partial >&2; while :; do sleep 0.1; done",
  'exit-3': 'echo out; echo err >&2; exit 3'
};

const STUB_NAMES: StubName[] = ['slow-term', 'ignore-term', 'quick-term', 'stderr-term', 'exit-3'];

const noop = (): void => undefined;

/** The stubs are POSIX shell scripts; the Windows taskkill path is proven by the contract hang test. */
const IS_WINDOWS = process.platform === 'win32';

let stubDir = '';

const stubFile = (stub: StubName, extension: string): string => join(stubDir, `${stub}.${extension}`);

const stubScript = (stub: StubName): string =>
  `#!/bin/sh\n${STUB_TRAPS[stub]}\necho $$ > "$(dirname "$0")/${stub}.pid"\necho "$1" > "$(dirname "$0")/${stub}.argv"\n${STUB_BODIES[stub]}\n`;

const writeStub = async (stub: StubName): Promise<void> => {
  await writeFile(stubFile(stub, 'sh'), stubScript(stub), { mode: 0o755 });
};

/** The stub's pid once its shell has written it; throws while the file is missing or still empty, so `vi.waitFor` retries. */
const readPid = async (stub: StubName): Promise<number> => {
  const text = await readFile(stubFile(stub, 'pid'), 'utf8');
  const pid = Number.parseInt(text, 10);
  const isPid = Number.isInteger(pid);

  if (!isPid) throw new Error(`${stub} has not written its pid yet`);

  return pid;
};

/** Removes the pid file an earlier case left, so a stub that never starts leaves none. */
const clearPid = async (stub: StubName): Promise<void> => {
  await rm(stubFile(stub, 'pid'), { force: true });
};

const startStub = async (stub: StubName, options: RunTurboOptions): Promise<TurboResult> => runTurbo(stubFile(stub, 'sh'), [], stubDir, options);

/**
 * Runs the stub until runTurbo rejects, calling `onStarted` once the stub's pid (and so its trap) is in place; whether
 * the stub's shell still exists is probed as the rejection lands.
 */
const runUntilAborted = async (stub: StubName, options: RunTurboOptions, onStarted: () => void = noop): Promise<AbortOutcome> => {
  await clearPid(stub);
  const startedAt = performance.now();
  const run = startStub(stub, options);
  const pid = await vi.waitFor(async () => readPid(stub), { timeout: 2000, interval: 20 });

  onStarted();

  try {
    await run;
  } catch (error) {
    const elapsedMs = performance.now() - startedAt;
    const isStubAlive = isAlive(pid);
    const outcome: AbortOutcome = { error, elapsedMs, isStubAlive };

    return outcome;
  }

  throw new Error(`${stub} resolved instead of aborting`);
};

describe('FEATURE: runTurbo process lifecycle', () => {
  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'run-turbo-'));
    await Promise.all(STUB_NAMES.map(writeStub));
  });

  afterAll(async () => {
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a binary that writes to stdout and stderr and exits 3', () => {
    let result: TurboResult;

    beforeAll(async () => {
      result = await startStub('exit-3', {});
    });

    it('WHEN it runs THEN runTurbo resolves with its output and exit code', () => {
      const expected: TurboResult = { stdout: 'out\n', stderr: 'err\n', exitCode: 3 };

      expect(result).toStrictEqual(expected);
    });

    it('WHEN it runs THEN its first argument is --skip-infer', async () => {
      const argv = await readFile(stubFile('exit-3', 'argv'), 'utf8');

      expect(argv).toBe('--skip-infer\n');
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a binary that takes 1.5 s to exit on SIGTERM', () => {
    describe('WHEN a 300 ms timeout fires', () => {
      let outcome: AbortOutcome;

      beforeAll(async () => {
        outcome = await runUntilAborted('slow-term', { timeoutMs: 300 });
      });

      it('THEN runTurbo rejects with an AbortError caused by a TimeoutError', () => {
        const timeoutCause = { name: 'TimeoutError' };

        expect(outcome.error).toMatchObject({ name: 'AbortError', cause: timeoutCause });
      });

      it('THEN the rejection waits for the binary to exit', () => {
        expect(outcome.elapsedMs).toBeGreaterThanOrEqual(1500);
      });

      it('THEN SIGTERM stops the binary, well before the hard kill after the 5 s grace period', () => {
        expect(outcome.elapsedMs).toBeLessThan(300 + 1500 + 1000);
      });

      it('THEN the binary is gone when runTurbo rejects', () => {
        expect(outcome.isStubAlive).toBe(false);
      });
    });

    describe('WHEN the caller aborts once the binary has started', () => {
      const reason = new Error('caller stopped');
      let outcome: AbortOutcome;

      beforeAll(async () => {
        const controller = new AbortController();
        const abort = (): void => controller.abort(reason);

        outcome = await runUntilAborted('slow-term', { signal: controller.signal }, abort);
      });

      it("THEN runTurbo rejects with an AbortError caused by the caller's reason", () => {
        expect(outcome.error).toMatchObject({ name: 'AbortError', cause: reason });
      });

      it('THEN the binary is gone when runTurbo rejects', () => {
        expect(outcome.isStubAlive).toBe(false);
      });
    });

    describe('WHEN the signal is already aborted', () => {
      let error: unknown;

      beforeAll(async () => {
        await clearPid('slow-term');
        const run = startStub('slow-term', { signal: AbortSignal.abort() });

        error = await run.catch((caught: unknown) => caught);
        // Long enough for a spawned stub to write its pid.
        await setTimeout(300);
      });

      it('THEN runTurbo rejects with an AbortError', () => {
        expect(error).toMatchObject({ name: 'AbortError' });
      });

      it('THEN the binary never starts', async () => {
        await expect(readFile(stubFile('slow-term', 'pid'))).rejects.toMatchObject({ code: 'ENOENT' });
      });
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a binary that ignores SIGTERM', () => {
    describe('WHEN a 300 ms timeout fires with a 300 ms grace period', () => {
      let outcome: AbortOutcome;

      beforeAll(async () => {
        outcome = await runUntilAborted('ignore-term', { timeoutMs: 300, graceMs: 300 });
      });

      it('THEN runTurbo rejects with an AbortError after the timeout and the grace period', () => {
        expect(outcome.error).toMatchObject({ name: 'AbortError' });
        expect(outcome.elapsedMs).toBeGreaterThanOrEqual(600);
      });

      it('THEN the binary is gone when runTurbo rejects', () => {
        expect(outcome.isStubAlive).toBe(false);
      });
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a binary that exits 0 at once on SIGTERM', () => {
    it('WHEN a 300 ms timeout fires THEN runTurbo still rejects with an AbortError', async () => {
      const outcome = await runUntilAborted('quick-term', { timeoutMs: 300 });

      expect(outcome.error).toMatchObject({ name: 'AbortError' });
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a binary that writes 70 000 x and a line to stderr, then hangs', () => {
    describe('WHEN a 1000 ms timeout fires', () => {
      let outcome: AbortOutcome;

      beforeAll(async () => {
        outcome = await runUntilAborted('stderr-term', { timeoutMs: 1000 });
      });

      it('THEN the AbortError carries the stderr line written before the abort', () => {
        expect(outcome.error).toMatchObject({ name: 'AbortError' });
        expect(outcome.error).toHaveProperty('stderr', expect.stringContaining('xpartial\n'));
      });

      it('THEN the carried stderr is cut to its last 64 KiB', () => {
        expect(outcome.error).toHaveProperty('stderr.length', 64 * 1024);
      });
    });
  });

  describe('GIVEN a binary path that does not exist', () => {
    it('WHEN the caller aborts during the cwd check THEN runTurbo rejects with an AbortError, not a spawn ENOENT', async () => {
      const controller = new AbortController();

      const run = runTurbo(join(stubDir, 'missing-turbo'), [], stubDir, { signal: controller.signal });

      controller.abort();

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    }, 1000);
  });

  describe('GIVEN a cwd that does not exist', () => {
    let error: unknown;

    beforeAll(async () => {
      error = await runTurbo(stubFile('exit-3', 'sh'), [], join(stubDir, 'missing-cwd')).catch((rejection: unknown) => rejection);
    });

    it('WHEN runTurbo is called THEN it rejects with an ENOENT naming the cwd, not the binary', () => {
      expect(error).toMatchObject({ code: 'ENOENT', path: join(stubDir, 'missing-cwd') });
    });

    it('WHEN the rejection is converted THEN it is io, not not-found', () => {
      const exception = toTurboException(error, 'query');

      expect(exception.kind).toBe('io');
    });
  });

  describe('GIVEN a signal that is already aborted', () => {
    it('WHEN runTurbo is called on a missing binary THEN it rejects with an AbortError, not a spawn ENOENT', async () => {
      const run = runTurbo(join(stubDir, 'missing-turbo'), [], stubDir, { signal: AbortSignal.abort() });

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    });

    it("WHEN runTurbo is called with a missing cwd THEN it rejects with an AbortError, not the cwd's ENOENT", async () => {
      const run = runTurbo(stubFile('exit-3', 'sh'), [], join(stubDir, 'missing-cwd'), { signal: AbortSignal.abort() });

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    });
  });
});
