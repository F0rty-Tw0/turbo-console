import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { RunLogEntry, RunLogEvent } from './common/run-log.type.ts';
import type { RunLogRepo } from './test/common/run-log-repo.type.ts';
import {
  GO_FILE_STUB,
  LIB_READY_STUB,
  RUN_LOG_APP_STUB,
  RUN_LOG_DIR_STUB,
  RUN_LOG_LIB_STUB
} from './test/stubs/run-log-fixture.stub.ts';
import { eventPairsOf, eventsOf, fixtureEventPairs } from './test/utils/run-log-event.spec.util.ts';
import { jsonElementCount } from './test/utils/run-log-source.spec.util.ts';
import {
  createRunLogRepo,
  readRunLog,
  readRunLogBytes,
  signalGroup,
  taskNodeOf,
  waitForExit
} from './test/utils/run-log-turbo.spec.util.ts';
import { scanRunLog } from './utils/run-log-scan.util.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunMatch, RunToMatch } from '../run-summary/common/run-match.type.ts';
import { matchRunSummary } from '../run-summary/domain-logic/match-run-summary.ts';
import { readNewestRunSummary } from '../run-summary/domain-logic/read-newest-run-summary.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';

const TURBO_SOURCE = 'turbo';
const LIB_BUILD = `${RUN_LOG_LIB_STUB}#build`;
const APP_BUILD = `${RUN_LOG_APP_STUB}#build`;
const LIB_FAIL = `${RUN_LOG_LIB_STUB}#fail`;
const APP_AFTER_FAIL = `${RUN_LOG_APP_STUB}#after-fail`;
const LIB_HIT = `${RUN_LOG_LIB_STUB}#hit`;
const LIB_HIT_FLAG = `${RUN_LOG_LIB_STUB}#hit-flag`;
const LIB_QUIET = `${RUN_LOG_LIB_STUB}#quiet`;
const LIB_SEEN: RunLogEvent = { kind: 'seen', taskId: LIB_BUILD };
const POLL = { timeout: 30_000, interval: 100 };
const SIGKILL_AFTER_MS = 20_000;

/** The repo-relative log path of run `name`, as `TURBO_LOG_FILE` and `--log-file` take it. */
const logOf = (name: string): string => `${RUN_LOG_DIR_STUB}/run-${name}.json`;

/** The env that makes turbo write the structured log to the repo-relative `path`. */
const logEnvOf = (path: string): Record<string, string> => {
  const env: Record<string, string> = {};

  env['TURBO_LOG_FILE'] = path;

  return env;
};

const argsOf = (packageName: string, taskName: string): string[] => turboRunArgs(taskNodeOf(packageName, taskName), packageName);

const runToMatchOf = (packageName: string, taskName: string, launchedAt: number, exitCode: number | null): RunToMatch => {
  const run: RunToMatch = {
    task: taskNodeOf(packageName, taskName),
    packageName,
    launchedAt,
    endedAt: Date.now(),
    exitCode: exitCode ?? -1
  };

  return run;
};

const cacheStatusOf = (summary: RunSummary | null, taskId: string): string | undefined =>
  summary?.tasks.find((task) => task.taskId === taskId)?.cache.status;

const sourcesOf = (entries: RunLogEntry[]): string[] => entries.map((entry) => entry.source);

describe('FEATURE: turbo 2.11.7 structured log gates for live run progress (U7 D2)', () => {
  const repos: RunLogRepo[] = [];

  const newRepo = async (): Promise<RunLogRepo> => {
    const repo = await createRunLogRepo();

    repos.push(repo);

    return repo;
  };

  afterAll(async () => {
    for (const repo of repos) await repo.dispose();
  });

  describe('GIVEN @acme/app#build, whose dependency @acme/lib#build waits for a go file (env route)', () => {
    let repo: RunLogRepo;
    let seenWhileWaiting: RunLogEvent[] = [];
    let wasRunning = false;
    let goWasAbsent = false;
    let args: string[] = [];
    let entries: RunLogEntry[] = [];
    let summaryMatch: RunMatch | null = null;

    beforeAll(async () => {
      repo = await newRepo();
      args = argsOf(RUN_LOG_APP_STUB, 'build');
      const launchedAt = Date.now();
      const child = repo.launch(args, logEnvOf(logOf('g1')));
      const log = join(repo.dir, logOf('g1'));

      const watchLib = async (): Promise<RunLogEvent[]> => {
        const events = eventsOf(await readRunLog(log));

        expect(events).toContainEqual(LIB_SEEN);

        return events;
      };

      seenWhileWaiting = await vi.waitFor(watchLib, POLL).catch((): RunLogEvent[] => []);
      wasRunning = child.exitCode === null;
      goWasAbsent = !existsSync(join(repo.dir, GO_FILE_STUB));
      await writeFile(join(repo.dir, GO_FILE_STUB), '');
      const exitCode = await waitForExit(child);

      entries = await readRunLog(log);
      summaryMatch = await matchRunSummary(repo.dir, runToMatchOf(RUN_LOG_APP_STUB, 'build', launchedAt, exitCode));
    });

    it('WHEN the log is polled while go is absent THEN a seen event for @acme/lib#build is already in it (G1)', () => {
      expect(seenWhileWaiting).toContainEqual(LIB_SEEN);
    });

    it('WHEN the log is polled while go is absent THEN turbo still runs and go does not exist (G1)', () => {
      expect({ wasRunning, goWasAbsent }).toStrictEqual({ wasRunning: true, goWasAbsent: true });
    });

    it('THEN every task source equals a model task id: no id map (G2)', () => {
      const taskSources = new Set(sourcesOf(entries).filter((source) => source !== TURBO_SOURCE));

      expect(taskSources).toStrictEqual(new Set([LIB_BUILD, APP_BUILD]));
    });

    it('THEN argv carries no --log-file word (G3)', () => {
      expect(args.filter((arg) => arg.startsWith('--log-file'))).toStrictEqual([]);
    });

    it('THEN the file holds task lines though only the env asked for it (G3)', () => {
      expect(eventPairsOf(entries)).not.toStrictEqual([]);
    });

    it('THEN matchRunSummary still matches the run (G3)', () => {
      expect(summaryMatch).toMatchObject({ interrupted: false });
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g1-live fixture', async () => {
      expect(eventPairsOf(entries)).toStrictEqual(await fixtureEventPairs('g1-live'));
    });
  });

  describe('GIVEN @acme/lib#hit run twice: plain, then with TURBO_LOG_FILE on a new path (G4 env pair)', () => {
    let repo: RunLogRepo;
    let summary: RunSummary | null = null;
    let entries: RunLogEntry[] = [];

    beforeAll(async () => {
      repo = await newRepo();
      const args = argsOf(RUN_LOG_LIB_STUB, 'hit');

      await waitForExit(repo.launch(args, {}));
      await waitForExit(repo.launch(args, logEnvOf(logOf('b'))));
      summary = await readNewestRunSummary(repo.dir);
      entries = await readRunLog(join(repo.dir, logOf('b')));
    });

    it('THEN the second summary records HIT: the path of the log does not bust the cache', () => {
      expect(cacheStatusOf(summary, LIB_HIT)).toBe('HIT');
    });

    it('THEN the second run log gives a cacheHit event for @acme/lib#hit', () => {
      expect(eventsOf(entries)).toContainEqual({ kind: 'cacheHit', taskId: LIB_HIT });
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g4-hit fixture', async () => {
      expect(eventPairsOf(entries)).toStrictEqual(await fixtureEventPairs('g4-hit'));
    });
  });

  describe('GIVEN @acme/lib#hit-flag run twice: plain, then with the one-word --log-file flag and no env (D16)', () => {
    let repo: RunLogRepo;
    let summary: RunSummary | null = null;
    let entries: RunLogEntry[] = [];
    let summaryMatch: RunMatch | null = null;

    beforeAll(async () => {
      repo = await newRepo();
      const args = argsOf(RUN_LOG_LIB_STUB, 'hit-flag');

      await waitForExit(repo.launch(args, {}));
      const launchedAt = Date.now();
      const exitCode = await waitForExit(repo.launch([...args, `--log-file=${logOf('d')}`], {}));

      summary = await readNewestRunSummary(repo.dir);
      entries = await readRunLog(join(repo.dir, logOf('d')));
      summaryMatch = await matchRunSummary(repo.dir, runToMatchOf(RUN_LOG_LIB_STUB, 'hit-flag', launchedAt, exitCode));
    });

    it('THEN the second summary records HIT', () => {
      expect(cacheStatusOf(summary, LIB_HIT_FLAG)).toBe('HIT');
    });

    it('THEN the summary command carries no --log-file word, so isCandidate needs no change', () => {
      expect(summary?.execution.command).not.toContain('--log-file');
    });

    it('THEN matchRunSummary still matches the run', () => {
      expect(summaryMatch).toMatchObject({ cache: 'HIT', interrupted: false });
    });

    it('THEN the flag writes the log: it gives a cacheHit event for @acme/lib#hit-flag', () => {
      expect(eventsOf(entries)).toContainEqual({ kind: 'cacheHit', taskId: LIB_HIT_FLAG });
    });
  });

  describe('GIVEN @acme/app#after-fail, whose dependency @acme/lib#fail exits 3 (G5)', () => {
    let repo: RunLogRepo;
    let exitCode: number | null = null;
    let entries: RunLogEntry[] = [];

    beforeAll(async () => {
      repo = await newRepo();
      exitCode = await waitForExit(repo.launch(argsOf(RUN_LOG_APP_STUB, 'after-fail'), logEnvOf(logOf('g5'))));
      entries = await readRunLog(join(repo.dir, logOf('g5')));
    });

    it('THEN turbo exits 3', () => {
      expect(exitCode).toBe(3);
    });

    it('THEN the log gives only a seen event for @acme/lib#fail', () => {
      expect(eventPairsOf(entries)).toStrictEqual([`${LIB_FAIL} seen`]);
    });

    it('THEN the log gives no event for @acme/app#after-fail, which never ran', () => {
      const afterFail = eventsOf(entries).filter((event) => event.taskId === APP_AFTER_FAIL);

      expect(afterFail).toStrictEqual([]);
    });

    it('THEN the turbo-source exited (3) line classifies to null: the failure carries no task id', () => {
      const exitLines = entries.filter((entry) => entry.source === TURBO_SOURCE && entry.text.endsWith('exited (3)'));

      expect(eventsOf(exitLines)).toStrictEqual([]);
      expect(exitLines).toHaveLength(1);
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g5-fail fixture', async () => {
      expect(eventPairsOf(entries)).toStrictEqual(await fixtureEventPairs('g5-fail'));
    });
  });

  describe.skipIf(process.platform === 'win32')(
    'GIVEN @acme/lib#build interrupted by SIGINT once its lib-ready line is in the log (G6)',
    () => {
      let repo: RunLogRepo;
      let exitCode: number | null = null;
      let bytes: Uint8Array = new Uint8Array();

      beforeAll(async () => {
        repo = await newRepo();
        const log = join(repo.dir, logOf('g6'));
        const child = repo.launch(argsOf(RUN_LOG_LIB_STUB, 'build'), logEnvOf(logOf('g6')));

        const watchReady = async (): Promise<void> => {
          const entries = await readRunLog(log);
          const libLines = entries.filter((entry) => entry.source === LIB_BUILD);

          expect(libLines.some((entry) => entry.text.includes(LIB_READY_STUB))).toBe(true);
        };

        await vi.waitFor(watchReady, POLL);
        signalGroup(child, 'SIGINT');
        const killTimer = setTimeout(() => signalGroup(child, 'SIGKILL'), SIGKILL_AFTER_MS);

        exitCode = await waitForExit(child);
        clearTimeout(killTimer);
        bytes = await readRunLogBytes(log);
      });

      it('THEN turbo exits 0', () => {
        expect(exitCode).toBe(0);
      });

      it('THEN scanRunLog reads the file with no invalid object and a seen event for @acme/lib#build', () => {
        const { entries, invalid } = scanRunLog(bytes, 0);

        expect(invalid).toBe(0);
        expect(eventsOf(entries)).toContainEqual(LIB_SEEN);
      });

      it('THEN the whole file parses as a JSON array of the scanned entries', () => {
        const { entries } = scanRunLog(bytes, 0);

        expect(jsonElementCount(bytes)).toBe(entries.length);
      });

      it('THEN the file ends with a newline, the closing bracket and a newline', () => {
        expect(new TextDecoder().decode(bytes)).toMatch(/\n\]\n$/);
      });
    }
  );

  describe('GIVEN @acme/lib#quiet, which hides its output, logged to a directory that does not exist yet', () => {
    let repo: RunLogRepo;
    const missingDirLog = '.turbo/turbo-console-new/run-q.json';
    let entries: RunLogEntry[] = [];

    beforeAll(async () => {
      repo = await newRepo();
      await waitForExit(repo.launch(argsOf(RUN_LOG_LIB_STUB, 'quiet'), logEnvOf(missingDirLog)));
      entries = await readRunLog(join(repo.dir, missingDirLog));
    });

    it('THEN turbo creates the directory and the file: D6 needs no mkdir', () => {
      expect(existsSync(join(repo.dir, missingDirLog))).toBe(true);
    });

    it('THEN the task writes 0 lines with its source, while turbo writes its own', () => {
      const sources = sourcesOf(entries);

      expect(sources).toContain(TURBO_SOURCE);
      expect(sources).not.toContain(LIB_QUIET);
    });
  });
});
