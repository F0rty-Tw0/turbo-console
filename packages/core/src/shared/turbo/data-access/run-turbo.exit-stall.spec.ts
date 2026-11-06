import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runTurbo } from './run-turbo.ts';
import type { ExitStallCheck, RunTurboOptions, TurboResult } from '../common/turbo.type.ts';
import { isAlive } from '../test/utils/process.spec.util.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

type RunOutcome = {
  readonly settled: unknown;
  readonly isStubAlive: boolean;
};

/**
 * Writes its pid next to itself, then `body`; exits by itself after 10 s, so a broken guard cannot leave it running.
 * That timer is unref'd: it never keeps a stub alive that would exit.
 */
const stubScript = (body: string): string => {
  return `#!/usr/bin/env node
require('node:fs').writeFileSync(__filename + '.pid', String(process.pid));
setTimeout(() => process.exit(0), 10000).unref();
${body}
`;
};

/**
 * Each prints to stdout, then never exits on its own (`setInterval`), apart from the `exit` ones. `held-exit-3` leaves a
 * grandchild holding its stdout for 1500 ms after it exits; `term-end-hang` writes `.ready` once its handler is in, then
 * ends its JSON and counts in `.terms` on each SIGTERM, without exiting.
 */
const STUB_BODIES = {
  'complete-hang': `process.stdout.write('{"tasks":[]}\\n');\nsetInterval(() => undefined, 1000);`,
  'half-hang': `process.stdout.write('{"tasks":[');\nsetInterval(() => undefined, 1000);`,
  'broken-hang': `process.stdout.write('{"tasks":]}\\n');\nsetInterval(() => undefined, 1000);`,
  'late-end-hang': `process.stdout.write('{');\nsetTimeout(() => process.stdout.write('}\\n'), 400);\nsetInterval(() => undefined, 1000);`,
  'complete-exit-3': `process.stdout.write('{}\\n');\nprocess.exitCode = 3;`,
  'complete-term-exit-1': `process.stdout.write('{}\\n');\nprocess.on('SIGTERM', () => process.exit(1));\nsetInterval(() => undefined, 1000);`,
  'broken-term-exit-0': `process.stdout.write('{"tasks":]}\\n');\nprocess.on('SIGTERM', () => process.exit(0));\nsetInterval(() => undefined, 1000);`,
  'held-exit-3': `require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => undefined, 1500)'], { stdio: ['ignore', 'inherit', 'ignore'] }).unref();
process.stdout.write('{}\\n');
process.exitCode = 3;`,
  'term-end-hang': `process.stdout.write('{');
process.on('SIGTERM', () => {
  process.stdout.write('}\\n');
  require('node:fs').appendFileSync(__filename + '.terms', 'x');
});
require('node:fs').writeFileSync(__filename + '.ready', '');
setInterval(() => undefined, 1000);`
};

type StubName = keyof typeof STUB_BODIES;

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

/** Short enough that a stopped stall lands far inside `TIMEOUT_MS`. */
const STALL_MS = 200;

/** For stubs that exit by themselves: longer than a loaded host takes from their last write to their exit. */
const EXITING_STALL_MS = 500;

const TIMEOUT_MS = 3000;

const GUARDED: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, timeoutMs: TIMEOUT_MS, platform: 'win32' };

const TIMEOUT_CAUSE = { name: 'TimeoutError' };

const TIMEOUT_ABORT = { name: 'AbortError', cause: TIMEOUT_CAUSE };

const settledOf = (settled: unknown): unknown => settled;

let stubDir = '';

const stubPath = (stub: StubName): string => join(stubDir, `${stub}.js`);

const writeStub = async ([stub, body]: [string, string]): Promise<void> => {
  await writeFile(join(stubDir, `${stub}.js`), stubScript(body), { mode: 0o755 });
};

/** Settles once `path` exists, checking every 10 ms, or after `tries` checks. */
const waitForFile = async (path: string, tries: number): Promise<void> => {
  const hasFile = existsSync(path);

  if (hasFile || tries === 0) return;

  await setTimeout(10);
  await waitForFile(path, tries - 1);
};

/** Runs `stub` until runTurbo settles; whether its node process still exists is probed as the result lands. */
const runStub = async (stub: StubName, options: RunTurboOptions): Promise<RunOutcome> => {
  const settled = await runTurbo(stubPath(stub), [], stubDir, options).then(settledOf, settledOf);
  const pidText = await readFile(`${stubPath(stub)}.pid`, 'utf8');
  const isStubAlive = isAlive(Number(pidText));
  const outcome: RunOutcome = { settled, isStubAlive };

  return outcome;
};

// The stubs are node scripts run through their shebang, which Windows cannot exec; `platform` stands in for win32.
describe.skipIf(process.platform === 'win32')('FEATURE: runTurbo exit-stall guard', () => {
  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'run-turbo-exit-stall-'));
    await Promise.all(Object.entries(STUB_BODIES).map(writeStub));
  });

  afterAll(async () => {
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a binary that prints complete JSON, then never exits', () => {
    describe('WHEN the guard runs on win32 with a 200 ms stall', () => {
      let outcome: RunOutcome;

      beforeAll(async () => {
        outcome = await runStub('complete-hang', GUARDED);
      });

      it('THEN runTurbo resolves with its stdout and exit code 0', () => {
        const expected: TurboResult = { stdout: '{"tasks":[]}\n', stderr: '', exitCode: 0 };

        expect(outcome.settled).toStrictEqual(expected);
      });

      it('THEN the binary is gone when runTurbo resolves', () => {
        expect(outcome.isStubAlive).toBe(false);
      });
    });
  });

  describe('GIVEN a binary that prints half a JSON object, then never exits', () => {
    it('WHEN the guard runs on win32 THEN runTurbo rejects with the timeout, as without the guard', async () => {
      const options: RunTurboOptions = { ...GUARDED, timeoutMs: 1000 };
      const outcome = await runStub('half-hang', options);

      expect(outcome.settled).toMatchObject(TIMEOUT_ABORT);
    });
  });

  describe('GIVEN a binary whose stdout ends like JSON but does not parse, then never exits', () => {
    it('WHEN the guard stops it THEN runTurbo rejects with the kill error, as for any killed turbo', async () => {
      const outcome = await runStub('broken-hang', GUARDED);

      expect(outcome.settled).toMatchObject({ signal: 'SIGTERM', stderr: '' });
    });
  });

  describe('GIVEN a binary that prints "{", then "}" after 400 ms, then never exits', () => {
    it('WHEN the guard runs with a 200 ms stall THEN the late output re-arms it and runTurbo resolves with exit code 0', async () => {
      const outcome = await runStub('late-end-hang', GUARDED);

      expect(outcome.settled).toMatchObject({ stdout: '{}\n', exitCode: 0 });
    });
  });

  describe('GIVEN a binary that prints complete JSON and exits 3', () => {
    it('WHEN the guard runs on win32 THEN runTurbo resolves with exit code 3, as without the guard', async () => {
      const outcome = await runStub('complete-exit-3', { ...GUARDED, exitStallMs: EXITING_STALL_MS });

      expect(outcome.settled).toMatchObject({ stdout: '{}\n', exitCode: 3 });
    });
  });

  describe('GIVEN a binary that prints complete JSON, then exits 1 on SIGTERM, as taskkill /F leaves turbo', () => {
    it('WHEN the guard stops it THEN runTurbo resolves with the exit code its stdout gives, not the 1', async () => {
      const outcome = await runStub('complete-term-exit-1', GUARDED);

      expect(outcome.settled).toStrictEqual({ stdout: '{}\n', stderr: '', exitCode: 0 });
    });
  });

  describe('GIVEN a binary that prints broken JSON, then exits 0 on SIGTERM', () => {
    it('WHEN the guard stops it THEN runTurbo resolves with exit code 0, as a turbo that exited by itself', async () => {
      const outcome = await runStub('broken-term-exit-0', GUARDED);

      expect(outcome.settled).toMatchObject({ stdout: '{"tasks":]}\n', exitCode: 0 });
    });
  });

  describe('GIVEN a binary that prints complete JSON and exits 3 while a grandchild holds its stdout', () => {
    it('WHEN the stall time passes before the output closes THEN runTurbo still resolves with exit code 3', async () => {
      const outcome = await runStub('held-exit-3', { ...GUARDED, exitStallMs: EXITING_STALL_MS });

      expect(outcome.settled).toMatchObject({ stdout: '{}\n', exitCode: 3 });
    });
  });

  describe('GIVEN a binary that ends its JSON on SIGTERM, without exiting', () => {
    it('WHEN the caller aborts it THEN the guard sends no second SIGTERM during the grace', async () => {
      const controller = new AbortController();
      const outcome = runStub('term-end-hang', { ...GUARDED, signal: controller.signal, graceMs: 800 });

      await waitForFile(`${stubPath('term-end-hang')}.ready`, 300);
      controller.abort();
      await outcome;

      await expect(readFile(`${stubPath('term-end-hang')}.terms`, 'utf8')).resolves.toBe('x');
    });
  });
});
