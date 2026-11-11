import { describe, expect, it } from 'vitest';

import { isNearRun, runCommandOf, summaryCandidateOf, taskOutcomesOf } from './run-match.util.ts';
import type { RunExtras } from '../../run-args/common/run-args.type.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunMatch, RunTasksMatch, RunToMatch, TaskOutcome } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { TASK_NODE_STUB } from '../test/stubs/task-node.stub.ts';
import { cutShortOf, summaryOf, taskEntry } from '../test/utils/run-summary.spec.util.ts';

const LAUNCHED_AT = 1_760_000_000_000;

const ENDED_AT = LAUNCHED_AT + 10_000;

const COMMAND = 'turbo run build --filter=web';

/** Inside the run window: starts 1 s after launch, takes 4 s. */
const WINDOW = { startTime: LAUNCHED_AT + 1000, endTime: LAUNCHED_AT + 5000 };

const TASK_SPAN = { startTime: LAUNCHED_AT + 1500, endTime: LAUNCHED_AT + 2000 };

const RUN: RunToMatch = { task: TASK_NODE_STUB, packageName: 'web', launchedAt: LAUNCHED_AT, endedAt: ENDED_AT, exitCode: 0 };

const ONLY: RunExtras = { only: true };

const RUN_ONLY: RunToMatch = { ...RUN, extras: ONLY };

/** Label, extras, the recorded command (P8). */
const RECORDED: [string, RunExtras, string][] = [
  ['no extras fields', {}, COMMAND],
  ['only', ONLY, `${COMMAND} --only`],
  ['continue', { continueMode: 'dependencies-successful' }, `${COMMAND} --continue=dependencies-successful`],
  ['concurrency 2', { concurrency: '2' }, COMMAND],
  ['concurrency 50%', { concurrency: '50%' }, COMMAND],
  ['empty passThrough', { passThrough: [] }, COMMAND],
  ['pass-through', { passThrough: ['--watch', '--port=3000'] }, `${COMMAND} -- --watch --port=3000`],
  [
    'separate value and positional',
    { passThrough: ['--watch', '--port', '3000', './src/a.ts'] },
    `${COMMAND} -- --watch --port 3000 ./src/a.ts`
  ],
  [
    'all, in the other input order',
    { passThrough: ['--watch', '--port=3000'], concurrency: '2', continueMode: 'dependencies-successful', only: true },
    `${COMMAND} --continue=dependencies-successful --only -- --watch --port=3000`
  ]
];

const OWN_ENTRY = taskEntry('web#build', TASK_SPAN, 'MISS');

const DEPENDENCY_ENTRY = taskEntry('ui#build', WINDOW, 'HIT');

const OWN_MATCH: RunMatch = { cache: 'MISS', durationMs: 500, interrupted: false };

/** The whole summary, `WINDOW`, cut short: turbo exits 0 on Ctrl+C with no cache status for the run. */
const INTERRUPTED_MATCH: RunMatch = { cache: null, durationMs: 4000, interrupted: true };

const PASSED_BOTH: TaskOutcome[] = [
  { taskId: 'ui#build', state: 'passed' },
  { taskId: 'web#build', state: 'passed' }
];

const fileAt = (mtimeMs: number): RunSummaryFile => {
  const file: RunSummaryFile = { name: 'a.json', mtimeMs };

  return file;
};

/** The match part of `summaryCandidateOf`: `null` for a summary that is no candidate or does not fit. */
const matchOf = (summary: RunSummary, run: RunToMatch): RunMatch | null => {
  const candidate = summaryCandidateOf(summary, run);

  return candidate?.match ?? null;
};

describe('FEATURE: run match', () => {
  describe('GIVEN a run of web#build', () => {
    it('WHEN its command is built THEN it is the turbo run line without --skip-infer and --summarize', () => {
      expect(runCommandOf(RUN)).toBe(COMMAND);
    });
  });

  describe('GIVEN a run launched with extras', () => {
    it.each(RECORDED)('WHEN extras are %s THEN the command is what turbo records', (_label, extras, expected) => {
      expect(runCommandOf({ ...RUN, extras })).toBe(expected);
    });

    it('WHEN the summary records the --only command THEN a run with only matches it', () => {
      const summary = summaryOf(`${COMMAND} --only`, WINDOW, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN_ONLY)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN the summary holds the plain command THEN a run with only has no match', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN_ONLY)).toBeNull();
    });

    it('WHEN the summary holds the --only command THEN a plain run has no match', () => {
      const summary = summaryOf(`${COMMAND} --only`, WINDOW, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN summary files written around the run', () => {
    it('WHEN one was written at the slack before launchedAt THEN it is near the run', () => {
      expect(isNearRun(fileAt(LAUNCHED_AT - SUMMARY_MTIME_SLACK_MS), RUN)).toBe(true);
    });

    it('WHEN one was written at the slack after endedAt THEN it is near the run', () => {
      expect(isNearRun(fileAt(ENDED_AT + SUMMARY_MTIME_SLACK_MS), RUN)).toBe(true);
    });

    it('WHEN one was written 1 ms earlier than the slack allows THEN it is not near the run', () => {
      expect(isNearRun(fileAt(LAUNCHED_AT - SUMMARY_MTIME_SLACK_MS - 1), RUN)).toBe(false);
    });

    it('WHEN one was written 1 ms later than the slack allows THEN it is not near the run', () => {
      expect(isNearRun(fileAt(ENDED_AT + SUMMARY_MTIME_SLACK_MS + 1), RUN)).toBe(false);
    });
  });

  describe('GIVEN one summary that fits the run', () => {
    it('WHEN matched THEN the entry of the task gives the cache status and its own duration', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY, OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN its start equals launchedAt THEN it still matches', () => {
      const summary = summaryOf(COMMAND, { ...WINDOW, startTime: LAUNCHED_AT }, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN its start equals endedAt THEN it still matches', () => {
      const summary = summaryOf(COMMAND, { startTime: ENDED_AT, endTime: ENDED_AT + 1000 }, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toStrictEqual(OWN_MATCH);
    });
  });

  describe('GIVEN a summary that breaks exactly one condition', () => {
    it('WHEN it started before launchedAt THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { ...WINDOW, startTime: LAUNCHED_AT - 1 }, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });

    it('WHEN it started after endedAt THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { startTime: ENDED_AT + 1, endTime: ENDED_AT + 1000 }, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });

    it('WHEN its command is another filter THEN there is no match', () => {
      const summary = summaryOf('turbo run build --filter=lib', WINDOW, 0, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });

    it('WHEN its exit code differs THEN there is no match', () => {
      const summary = summaryOf(COMMAND, WINDOW, 1, [OWN_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });

    it('WHEN it lists other entries but none for the task, and every attempted task ended, THEN there is no match', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY]);

      expect(matchOf(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a fitting summary of a run turbo was interrupted in', () => {
    it('WHEN it lists no task, attempted 0 (Ctrl+C before turbo attempted one) THEN it matches as interrupted', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, []);

      expect(matchOf(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN it lists no task, attempted 1 (turbo 2.11.7 after Ctrl+C) THEN it matches as interrupted', () => {
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 0, []));

      expect(matchOf(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN it lists the task but attempted more tasks than ended THEN it matches as interrupted', () => {
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 0, [OWN_ENTRY]));

      expect(matchOf(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN its span is broken THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { startTime: WINDOW.startTime, endTime: LAUNCHED_AT }, 0, []);

      expect(matchOf(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a fitting summary of a failed run (exit 1) in which turbo cut a task off', () => {
    const failedRun: RunToMatch = { ...RUN, exitCode: 1 };

    it('WHEN it lists the task THEN the entry gives the data and the run is not interrupted', () => {
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 1, [OWN_ENTRY]));

      expect(matchOf(summary, failedRun)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN it lists another entry but none for the task (a failed dependency) THEN there is no match', () => {
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 1, [DEPENDENCY_ENTRY]));

      expect(matchOf(summary, failedRun)).toBeNull();
    });

    it('WHEN it lists no task THEN there is no match', () => {
      const summary = summaryOf(COMMAND, WINDOW, 1, []);

      expect(matchOf(summary, failedRun)).toBeNull();
    });
  });

  describe('GIVEN a fitting summary whose task entry has a bad duration', () => {
    it('WHEN the entry ends before it starts THEN there is no match', () => {
      const backwards = taskEntry('web#build', { startTime: TASK_SPAN.endTime, endTime: TASK_SPAN.startTime }, 'MISS');
      const summary = summaryOf(COMMAND, WINDOW, 0, [backwards]);

      expect(matchOf(summary, RUN)).toBeNull();
    });

    it('WHEN the entry spans -1e308 to 1e308, an infinite duration, THEN there is no match', () => {
      const endless = taskEntry('web#build', { startTime: -1e308, endTime: 1e308 }, 'MISS');
      const summary = summaryOf(COMMAND, WINDOW, 0, [endless]);

      expect(matchOf(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a run of a task turbo records no entry for', () => {
    const umbrellaCommand = 'turbo run e2e-ci --filter=web';
    const fileEntry = taskEntry('web#e2e--a.spec.ts', TASK_SPAN, 'MISS');
    const umbrella: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e-ci', name: 'e2e-ci', kind: 'atom-umbrella' };

    it('WHEN an umbrella run is matched THEN there is no cache and the duration is the summary span', () => {
      const summary = summaryOf(umbrellaCommand, WINDOW, 0, [fileEntry]);

      expect(matchOf(summary, { ...RUN, task: umbrella })).toStrictEqual({ cache: null, durationMs: 4000, interrupted: false });
    });

    it('WHEN the umbrella run attempted more tasks than ended THEN it matches as interrupted', () => {
      const summary = cutShortOf(summaryOf(umbrellaCommand, WINDOW, 0, [fileEntry]));

      expect(matchOf(summary, { ...RUN, task: umbrella })).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN the umbrella summary ends before it starts THEN there is no match', () => {
      const summary = summaryOf(umbrellaCommand, { startTime: WINDOW.startTime, endTime: LAUNCHED_AT }, 0, [fileEntry]);

      expect(matchOf(summary, { ...RUN, task: umbrella })).toBeNull();
    });

    it('WHEN an aggregate run is matched THEN there is no cache and the duration is the summary span', () => {
      const task: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e-ci--all', name: 'e2e-ci--all', kind: 'atom-aggregate' };
      const summary = summaryOf('turbo run e2e-ci--all --filter=web', WINDOW, 0, [fileEntry]);

      expect(matchOf(summary, { ...RUN, task })).toStrictEqual({ cache: null, durationMs: 4000, interrupted: false });
    });

    it('WHEN an atom file run is matched THEN it has its own entry, so the entry gives the data', () => {
      const task: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e--a.spec.ts', name: 'e2e--a.spec.ts', kind: 'atom-file' };
      const summary = summaryOf('turbo run e2e--a.spec.ts --filter=web', WINDOW, 0, [fileEntry]);

      expect(matchOf(summary, { ...RUN, task })).toStrictEqual(OWN_MATCH);
    });
  });

  describe('GIVEN summary entries of each kind', () => {
    it.each([
      ['a MISS that exited 0', 'passed', taskEntry('ui#build', WINDOW, 'MISS')],
      ['a MISS that exited 3', 'failed', taskEntry('ui#build', WINDOW, 'MISS', 3)],
      ['a HIT', 'passed', taskEntry('ui#build', WINDOW, 'HIT')],
      ['a HIT that records exit 1 (a HIT is passed whatever the code)', 'passed', taskEntry('ui#build', WINDOW, 'HIT', 1)]
    ])('WHEN the outcomes of a summary listing %s are read THEN its state is %s', (_name, state, entry) => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [entry]);

      expect(taskOutcomesOf(summary)).toStrictEqual([{ taskId: 'ui#build', state }]);
    });

    it('WHEN a summary lists a dependency then the task THEN the outcomes keep that order', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY, OWN_ENTRY]);

      expect(taskOutcomesOf(summary)).toStrictEqual(PASSED_BOTH);
    });
  });

  describe('GIVEN summaries as candidates of the run', () => {
    it('WHEN the summary is of another command THEN it is no candidate', () => {
      const summary = summaryOf('turbo run build --filter=lib', WINDOW, 0, [OWN_ENTRY]);

      expect(summaryCandidateOf(summary, RUN)).toBeNull();
    });

    it('WHEN it fits THEN it has the own match and every outcome', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY, OWN_ENTRY]);
      const expected: RunTasksMatch = { match: OWN_MATCH, outcomes: PASSED_BOTH };

      expect(summaryCandidateOf(summary, RUN)).toStrictEqual(expected);
    });

    it('WHEN a failed run lists only a failed dependency THEN it has no match but that outcome', () => {
      const failedRun: RunToMatch = { ...RUN, exitCode: 1 };
      const summary = summaryOf(COMMAND, WINDOW, 1, [taskEntry('ui#build', WINDOW, 'MISS', 3)]);
      const outcomes: TaskOutcome[] = [{ taskId: 'ui#build', state: 'failed' }];
      const expected: RunTasksMatch = { match: null, outcomes };

      expect(summaryCandidateOf(summary, failedRun)).toStrictEqual(expected);
    });

    it('WHEN its own entry has a broken span THEN it has no match, outcomes kept', () => {
      const backwards = taskEntry('web#build', { startTime: TASK_SPAN.endTime, endTime: TASK_SPAN.startTime }, 'MISS');
      const summary = summaryOf(COMMAND, WINDOW, 0, [backwards]);
      const outcomes: TaskOutcome[] = [{ taskId: 'web#build', state: 'passed' }];
      const expected: RunTasksMatch = { match: null, outcomes };

      expect(summaryCandidateOf(summary, RUN)).toStrictEqual(expected);
    });

    it('WHEN Ctrl+C cut it short after the dependency ended THEN it is interrupted and only the dependency has an outcome', () => {
      const summary = cutShortOf(summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY]));
      const outcomes: TaskOutcome[] = [{ taskId: 'ui#build', state: 'passed' }];
      const expected: RunTasksMatch = { match: INTERRUPTED_MATCH, outcomes };

      expect(summaryCandidateOf(summary, RUN)).toStrictEqual(expected);
    });
  });
});
