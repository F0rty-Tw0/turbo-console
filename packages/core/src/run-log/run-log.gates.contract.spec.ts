import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { RunLogEntry, RunLogEvent } from './common/run-log.type.ts';
import type { RunLogRepo } from './test/common/run-log-repo.type.ts';
import { GO_FILE_STUB, LIB_READY_STUB, RUN_LOG_APP_STUB, RUN_LOG_LIB_STUB } from './test/stubs/run-log-fixture.stub.ts';
import { eventPairsOf, eventsOf, fixtureEventPairs } from './test/utils/run-log-event.spec.util.ts';
import { argsOf, cacheStatusOf, logEnvOf, logOf, runToMatchOf, sourcesOf } from './test/utils/run-log-gates.spec.util.ts';
import { jsonElementCount } from './test/utils/run-log-source.spec.util.ts';
import { createRunLogRepo, disposeRunLogRepos, readRunLog, readRunLogBytes } from './test/utils/run-log-turbo.spec.util.ts';
import { scanRunLog } from './utils/run-log-scan.util.ts';
import type { RunMatch } from '../run-summary/common/run-match.type.ts';
import { matchRunTasks } from '../run-summary/domain-logic/match-run-tasks.ts';
import { readNewestRunSummary } from '../run-summary/domain-logic/read-newest-run-summary.ts';
import { runMatchOf } from '../run-summary/test/utils/run-match.spec.util.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';
import { exitCodeOf, stopRun, waitForExit } from '../shared/turbo/test/utils/turbo-process.spec.util.ts';

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
const IS_WINDOWS = process.platform === 'win32';

describe('FEATURE: turbo 2.11.7 structured log gates for live run progress (U7 D2)', () => {
  const repos: RunLogRepo[] = [];

  const newRepo = async (): Promise<RunLogRepo> => {
    const repo = await createRunLogRepo();

    repos.push(repo);

    return repo;
  };

  afterAll(async () => {
    await disposeRunLogRepos(repos);
  });

  describe('GIVEN @acme/app#build, whose dependency @acme/lib#build waits for a go file (env route)', () => {
    let seenWhileWaiting: RunLogEvent[] = [];
    let wasRunning = false;
    let goWasAbsent = false;
    let logFileArgs: string[] = [];
    let taskSources = new Set<string>();
    let pairs: string[] = [];
    let fixturePairs: string[] = [];
    let summaryMatch: RunMatch | null = null;

    beforeAll(async () => {
      const repo = await newRepo();
      const args = argsOf(RUN_LOG_APP_STUB, 'build');
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
      await waitForExit(child);
      const entries = await readRunLog(log);

      logFileArgs = args.filter((arg) => arg.startsWith('--log-file'));
      taskSources = new Set(sourcesOf(entries).filter((source) => source !== TURBO_SOURCE));
      pairs = eventPairsOf(entries);
      fixturePairs = await fixtureEventPairs('g1-live');
      summaryMatch = runMatchOf(await matchRunTasks(repo.dir, runToMatchOf(RUN_LOG_APP_STUB, 'build', launchedAt, exitCodeOf(child))));
    });

    it('WHEN the log is polled while go is absent THEN a seen event for @acme/lib#build is already in it (G1)', () => {
      expect(seenWhileWaiting).toContainEqual(LIB_SEEN);
    });

    it('WHEN the log is polled while go is absent THEN turbo still runs and go does not exist (G1)', () => {
      expect({ wasRunning, goWasAbsent }).toStrictEqual({ wasRunning: true, goWasAbsent: true });
    });

    it('THEN every task source equals a model task id: no id map (G2)', () => {
      expect(taskSources).toStrictEqual(new Set([LIB_BUILD, APP_BUILD]));
    });

    it('THEN argv carries no --log-file word (G3)', () => {
      expect(logFileArgs).toStrictEqual([]);
    });

    it('THEN the file holds task lines though only the env asked for it (G3)', () => {
      expect(pairs).not.toStrictEqual([]);
    });

    it('THEN matchRunTasks still matches the run (G3)', () => {
      expect(summaryMatch).toMatchObject({ interrupted: false });
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g1-live fixture', () => {
      expect(pairs).toStrictEqual(fixturePairs);
    });
  });

  describe('GIVEN @acme/lib#hit run twice: plain, then with TURBO_LOG_FILE on a new path (G4 env pair)', () => {
    let cacheStatus: string | undefined;
    let events: RunLogEvent[] = [];
    let pairs: string[] = [];
    let fixturePairs: string[] = [];

    beforeAll(async () => {
      const repo = await newRepo();
      const args = argsOf(RUN_LOG_LIB_STUB, 'hit');

      await waitForExit(repo.launch(args, {}));
      await waitForExit(repo.launch(args, logEnvOf(logOf('b'))));
      const summary = await readNewestRunSummary(repo.dir);
      const entries = await readRunLog(join(repo.dir, logOf('b')));

      cacheStatus = cacheStatusOf(summary, LIB_HIT);
      events = eventsOf(entries);
      pairs = eventPairsOf(entries);
      fixturePairs = await fixtureEventPairs('g4-hit');
    });

    it('THEN the second summary records HIT: the path of the log does not bust the cache', () => {
      expect(cacheStatus).toBe('HIT');
    });

    it('THEN the second run log gives a cacheHit event for @acme/lib#hit', () => {
      expect(events).toContainEqual({ kind: 'cacheHit', taskId: LIB_HIT });
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g4-hit fixture', () => {
      expect(pairs).toStrictEqual(fixturePairs);
    });
  });

  describe('GIVEN @acme/lib#hit-flag run twice: plain, then with the one-word --log-file flag and no env (D16)', () => {
    let summary: RunSummary | null = null;
    let cacheStatus: string | undefined;
    let events: RunLogEvent[] = [];
    let summaryMatch: RunMatch | null = null;

    beforeAll(async () => {
      const repo = await newRepo();
      const args = argsOf(RUN_LOG_LIB_STUB, 'hit-flag');

      await waitForExit(repo.launch(args, {}));
      const launchedAt = Date.now();
      const child = repo.launch([...args, `--log-file=${logOf('d')}`], {});

      await waitForExit(child);
      summary = await readNewestRunSummary(repo.dir);
      cacheStatus = cacheStatusOf(summary, LIB_HIT_FLAG);
      events = eventsOf(await readRunLog(join(repo.dir, logOf('d'))));
      summaryMatch = runMatchOf(
        await matchRunTasks(repo.dir, runToMatchOf(RUN_LOG_LIB_STUB, 'hit-flag', launchedAt, exitCodeOf(child)))
      );
    });

    it('THEN the second summary records HIT', () => {
      expect(cacheStatus).toBe('HIT');
    });

    it('THEN the summary command carries no --log-file word, so isCandidate needs no change', () => {
      expect(summary?.execution.command).not.toContain('--log-file');
    });

    it('THEN matchRunTasks still matches the run', () => {
      expect(summaryMatch).toMatchObject({ cache: 'HIT', interrupted: false });
    });

    it('THEN the flag writes the log: it gives a cacheHit event for @acme/lib#hit-flag', () => {
      expect(events).toContainEqual({ kind: 'cacheHit', taskId: LIB_HIT_FLAG });
    });
  });

  describe('GIVEN @acme/app#after-fail, whose dependency @acme/lib#fail exits 3 (G5)', () => {
    let exitCode: number | null = null;
    let pairs: string[] = [];
    let fixturePairs: string[] = [];
    let afterFailEvents: RunLogEvent[] = [];
    let exitLines: RunLogEntry[] = [];
    let exitLineEvents: RunLogEvent[] = [];

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await waitForExit(repo.launch(argsOf(RUN_LOG_APP_STUB, 'after-fail'), logEnvOf(logOf('g5'))));
      const entries = await readRunLog(join(repo.dir, logOf('g5')));

      pairs = eventPairsOf(entries);
      fixturePairs = await fixtureEventPairs('g5-fail');
      afterFailEvents = eventsOf(entries).filter((event) => event.taskId === APP_AFTER_FAIL);
      exitLines = entries.filter((entry) => entry.source === TURBO_SOURCE && entry.text.endsWith('exited (3)'));
      exitLineEvents = eventsOf(exitLines);
    });

    it('THEN turbo exits 3', () => {
      expect(exitCode).toBe(3);
    });

    it('THEN the log gives only a seen event for @acme/lib#fail', () => {
      expect(pairs).toStrictEqual([`${LIB_FAIL} seen`]);
    });

    it('THEN the log gives no event for @acme/app#after-fail, which never ran', () => {
      expect(afterFailEvents).toStrictEqual([]);
    });

    it('THEN the turbo-source exited (3) line classifies to null: the failure carries no task id', () => {
      expect(exitLineEvents).toStrictEqual([]);
      expect(exitLines).toHaveLength(1);
    });

    it('THEN the live run classifies to the same (taskId, kind) set as the g5-fail fixture', () => {
      expect(pairs).toStrictEqual(fixturePairs);
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN @acme/lib#build interrupted by SIGINT once its lib-ready line is in the log (G6)', () => {
    let exitCode: number | null = null;
    let invalid = -1;
    let events: RunLogEvent[] = [];
    let entryCount = -1;
    let elementCount = -2;
    let text = '';

    beforeAll(async () => {
      const repo = await newRepo();
      const log = join(repo.dir, logOf('g6'));
      const child = repo.launch(argsOf(RUN_LOG_LIB_STUB, 'build'), logEnvOf(logOf('g6')));

      const watchReady = async (): Promise<void> => {
        const entries = await readRunLog(log);
        const libLines = entries.filter((entry) => entry.source === LIB_BUILD);

        expect(libLines.some((entry) => entry.text.includes(LIB_READY_STUB))).toBe(true);
      };

      await vi.waitFor(watchReady, POLL);
      exitCode = await stopRun(child);
      const bytes = await readRunLogBytes(log);
      const scan = scanRunLog(bytes, 0);

      invalid = scan.invalid;
      events = eventsOf(scan.entries);
      entryCount = scan.entries.length;
      elementCount = jsonElementCount(bytes);
      text = new TextDecoder().decode(bytes);
    });

    it('THEN turbo exits 0', () => {
      expect(exitCode).toBe(0);
    });

    it('THEN scanRunLog reads the file with no invalid object and a seen event for @acme/lib#build', () => {
      expect(invalid).toBe(0);
      expect(events).toContainEqual(LIB_SEEN);
    });

    it('THEN the whole file parses as a JSON array of the scanned entries', () => {
      expect(elementCount).toBe(entryCount);
    });

    it('THEN the file ends with a newline, the closing bracket and a newline', () => {
      expect(text).toMatch(/\n\]\n$/);
    });
  });

  describe('GIVEN @acme/lib#quiet, which hides its output', () => {
    let exitCode: number | null = null;
    let sources: string[] = [];

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await waitForExit(repo.launch(argsOf(RUN_LOG_LIB_STUB, 'quiet'), logEnvOf(logOf('q'))));
      sources = sourcesOf(await readRunLog(join(repo.dir, logOf('q'))));
    });

    it('THEN turbo exits 0: the task ran', () => {
      expect(exitCode).toBe(0);
    });

    it('THEN the task writes 0 lines with its source, while turbo writes its own', () => {
      expect(sources).toContain(TURBO_SOURCE);
      expect(sources).not.toContain(LIB_QUIET);
    });
  });

  /**
   * Measured on windows-latest CI run 41842270220: turbo does not create a missing log dir there, so U7e1 keeps D6's
   * mkdir. Turbo's exit code on Windows is not measured, so only posix pins it.
   */
  describe('GIVEN @acme/lib#quiet logged to a directory that does not exist yet', () => {
    const missingDirLog = '.turbo/turbo-console-new/run-q.json';
    let exitCode: number | null = null;
    let created = false;

    beforeAll(async () => {
      const repo = await newRepo();

      exitCode = await waitForExit(repo.launch(argsOf(RUN_LOG_LIB_STUB, 'quiet'), logEnvOf(missingDirLog)));
      created = existsSync(join(repo.dir, missingDirLog));
    });

    it.skipIf(IS_WINDOWS)('THEN on posix turbo exits 0 and creates the directory and the file', () => {
      expect({ exitCode, created }).toStrictEqual({ exitCode: 0, created: true });
    });

    it.runIf(IS_WINDOWS)(
      'THEN on Windows turbo exits on its own but creates no file: the launcher must create the directory (D6)',
      () => {
        expect({ hasExitCode: exitCode !== null, created }).toStrictEqual({ hasExitCode: true, created: false });
      }
    );
  });
});
