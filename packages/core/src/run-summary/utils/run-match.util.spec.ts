import { describe, expect, it } from 'vitest';

import { isNearRun, matchSummary, runCommandOf } from './run-match.util.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunToMatch } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { TASK_NODE_STUB } from '../test/stubs/task-node.stub.ts';
import { summaryOf, taskEntry } from '../test/utils/run-summary.spec.util.ts';

const LAUNCHED_AT = 1_760_000_000_000;

const ENDED_AT = LAUNCHED_AT + 10_000;

const COMMAND = 'turbo run build --filter=web';

/** Inside the run window: starts 1 s after launch, takes 4 s. */
const WINDOW = { startTime: LAUNCHED_AT + 1000, endTime: LAUNCHED_AT + 5000 };

const TASK_SPAN = { startTime: LAUNCHED_AT + 1500, endTime: LAUNCHED_AT + 2000 };

const RUN: RunToMatch = { task: TASK_NODE_STUB, packageName: 'web', launchedAt: LAUNCHED_AT, endedAt: ENDED_AT, exitCode: 0 };

const OWN_ENTRY = taskEntry('web#build', TASK_SPAN, 'MISS');

const DEPENDENCY_ENTRY = taskEntry('ui#build', WINDOW, 'HIT');

const OWN_MATCH = { cache: 'MISS', durationMs: 500, interrupted: false };

/** The whole summary, `WINDOW`, cut short: turbo exits 0 on Ctrl+C with no cache status for the run. */
const INTERRUPTED_MATCH = { cache: null, durationMs: 4000, interrupted: true };

/** `summary` with `attempted` raised past the tasks it saw end: a Ctrl+C cut one of them off. */
const cutShort = (summary: RunSummary): RunSummary => {
  const execution = { ...summary.execution, attempted: summary.execution.attempted + 1 };
  const cut: RunSummary = { ...summary, execution };

  return cut;
};

const fileAt = (mtimeMs: number): RunSummaryFile => {
  const file: RunSummaryFile = { name: 'a.json', mtimeMs };

  return file;
};

describe('FEATURE: run match', () => {
  describe('GIVEN a run of web#build', () => {
    it('WHEN its command is built THEN it is the turbo run line without --skip-infer and --summarize', () => {
      expect(runCommandOf(RUN)).toBe(COMMAND);
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

      expect(matchSummary(summary, RUN)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN its start equals launchedAt THEN it still matches', () => {
      const summary = summaryOf(COMMAND, { ...WINDOW, startTime: LAUNCHED_AT }, 0, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toStrictEqual(OWN_MATCH);
    });

    it('WHEN its start equals endedAt THEN it still matches', () => {
      const summary = summaryOf(COMMAND, { startTime: ENDED_AT, endTime: ENDED_AT + 1000 }, 0, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toStrictEqual(OWN_MATCH);
    });
  });

  describe('GIVEN a summary that breaks exactly one condition', () => {
    it('WHEN it started before launchedAt THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { ...WINDOW, startTime: LAUNCHED_AT - 1 }, 0, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });

    it('WHEN it started after endedAt THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { startTime: ENDED_AT + 1, endTime: ENDED_AT + 1000 }, 0, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });

    it('WHEN its command is another filter THEN there is no match', () => {
      const summary = summaryOf('turbo run build --filter=lib', WINDOW, 0, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });

    it('WHEN its exit code differs THEN there is no match', () => {
      const summary = summaryOf(COMMAND, WINDOW, 1, [OWN_ENTRY]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a fitting summary of a run turbo was interrupted in', () => {
    it('WHEN it lists no entry for the task THEN it matches as interrupted with the whole summary span', () => {
      const summary = summaryOf(COMMAND, WINDOW, 0, [DEPENDENCY_ENTRY]);

      expect(matchSummary(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN it lists no task, attempted 1 (turbo 2.11.7 after Ctrl+C) THEN it matches as interrupted', () => {
      const summary = cutShort(summaryOf(COMMAND, WINDOW, 0, []));

      expect(matchSummary(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN it lists the task but attempted more tasks than ended THEN it matches as interrupted', () => {
      const summary = cutShort(summaryOf(COMMAND, WINDOW, 0, [OWN_ENTRY]));

      expect(matchSummary(summary, RUN)).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN its span is broken THEN there is no match', () => {
      const summary = summaryOf(COMMAND, { startTime: WINDOW.startTime, endTime: LAUNCHED_AT }, 0, []);

      expect(matchSummary(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a fitting summary whose task entry has a bad duration', () => {
    it('WHEN the entry ends before it starts THEN there is no match', () => {
      const backwards = taskEntry('web#build', { startTime: TASK_SPAN.endTime, endTime: TASK_SPAN.startTime }, 'MISS');
      const summary = summaryOf(COMMAND, WINDOW, 0, [backwards]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });

    it('WHEN the entry spans -1e308 to 1e308, an infinite duration, THEN there is no match', () => {
      const endless = taskEntry('web#build', { startTime: -1e308, endTime: 1e308 }, 'MISS');
      const summary = summaryOf(COMMAND, WINDOW, 0, [endless]);

      expect(matchSummary(summary, RUN)).toBeNull();
    });
  });

  describe('GIVEN a run of a task turbo records no entry for', () => {
    const umbrellaCommand = 'turbo run e2e-ci --filter=web';
    const fileEntry = taskEntry('web#e2e--a.spec.ts', TASK_SPAN, 'MISS');
    const umbrella: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e-ci', name: 'e2e-ci', kind: 'atom-umbrella' };

    it('WHEN an umbrella run is matched THEN there is no cache and the duration is the summary span', () => {
      const summary = summaryOf(umbrellaCommand, WINDOW, 0, [fileEntry]);

      expect(matchSummary(summary, { ...RUN, task: umbrella })).toStrictEqual({ cache: null, durationMs: 4000, interrupted: false });
    });

    it('WHEN the umbrella run attempted more tasks than ended THEN it matches as interrupted', () => {
      const summary = cutShort(summaryOf(umbrellaCommand, WINDOW, 0, [fileEntry]));

      expect(matchSummary(summary, { ...RUN, task: umbrella })).toStrictEqual(INTERRUPTED_MATCH);
    });

    it('WHEN the umbrella summary ends before it starts THEN there is no match', () => {
      const summary = summaryOf(umbrellaCommand, { startTime: WINDOW.startTime, endTime: LAUNCHED_AT }, 0, [fileEntry]);

      expect(matchSummary(summary, { ...RUN, task: umbrella })).toBeNull();
    });

    it('WHEN an aggregate run is matched THEN there is no cache and the duration is the summary span', () => {
      const task: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e-ci--all', name: 'e2e-ci--all', kind: 'atom-aggregate' };
      const summary = summaryOf('turbo run e2e-ci--all --filter=web', WINDOW, 0, [fileEntry]);

      expect(matchSummary(summary, { ...RUN, task })).toStrictEqual({ cache: null, durationMs: 4000, interrupted: false });
    });

    it('WHEN an atom file run is matched THEN it has its own entry, so the entry gives the data', () => {
      const task: TaskNode = { ...TASK_NODE_STUB, id: 'web#e2e--a.spec.ts', name: 'e2e--a.spec.ts', kind: 'atom-file' };
      const summary = summaryOf('turbo run e2e--a.spec.ts --filter=web', WINDOW, 0, [fileEntry]);

      expect(matchSummary(summary, { ...RUN, task })).toStrictEqual(OWN_MATCH);
    });
  });
});
