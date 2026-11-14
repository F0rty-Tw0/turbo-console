import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { clockedRunsOf } from './graph-tasks.util.ts';
import type { ProgressOwner, ProgressRecord } from '../../run/common/run-progress.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { recordOf } from '../../run/test/utils/run-progress.spec.util.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunSources } from '../common/graph.type.ts';

type ElapsedRow = {
  readonly given: string;
  readonly entries: RunEntry[];
  readonly records: ProgressRecord[];
  readonly persistentIds: string[];
  readonly wallNow: number;
  readonly runs: Record<string, string>;
  readonly elapsed: Record<string, number> | undefined;
};

const A: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };
const BUILD_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'ui#build', state: 'running', launchedAt: 1000 };
const DEV_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'ui#dev', name: 'dev', persistent: true };
const DEV_RUNNING: RunEntry = { ...BUILD_RUNNING, taskId: 'ui#dev', task: DEV_TASK };
const BUILD_PASSED: RunEntry = { ...BUILD_RUNNING, state: 'passed', endedAt: 1500, exitCode: 0 };
const BUILD_STOPPED: RunEntry = { ...BUILD_RUNNING, state: 'stopped', endedAt: 1100 };
const BUILD_FAILED_TO_START: RunEntry = { ...BUILD_RUNNING, state: 'failed-to-start', endedAt: 1100 };
const BUILD_IN_A = recordOf('ui#build', 'running', 1000, A);
const BUILD_PASSED_LINT: RunEntry = { ...BUILD_PASSED, taskId: 'ui#lint' };
const PROTOTYPE_IDS = ['__proto__', 'constructor'];

const runningEntryOf = (taskId: string): RunEntry => {
  const entry: RunEntry = { ...BUILD_RUNNING, taskId };

  return entry;
};

const sourcesOf = (entries: RunEntry[], records: ProgressRecord[], persistentIds: string[], wallNow: number): RunSources => {
  const get = (root: string, taskId: string): RunEntry | undefined =>
    entries.find((entry) => entry.root === root && entry.taskId === taskId);
  const recordsOf = (root: string, taskId: string): ProgressRecord[] =>
    records.filter((record) => record.owner.root === root && record.taskId === taskId);
  const sources: RunSources = { get, recordsOf, persistentIds: new Set(persistentIds), wallNow };

  return sources;
};

const BUILD_WORD_RUNNING = { 'ui#build': 'running' };
const BUILD_WORD_PASSED = { 'ui#build': 'passed' };
const BUILD_WORD_STOPPED = { 'ui#build': 'stopped' };
const BUILD_WORD_FAILED_TO_START = { 'ui#build': 'failed-to-start' };
const DEV_WORD_CONTINUOUS = { 'ui#dev': 'continuous' };
const BOTH_WORDS = { 'ui#build': 'running', 'ui#dev': 'continuous' };
const NO_WORDS = {};
const DEV_OWNED_BY_A = { 'ui#dev': 'a#build' };
const BUILD_64_S = { 'ui#build': 64_000 };
const BUILD_0_S = { 'ui#build': 0 };
const DEV_3723_S = { 'ui#dev': 3_723_000 };
const BUILD_LAUNCH = { 'ui#build': 1000 };

const ROWS: ElapsedRow[] = [
  {
    given: 'an own run launched at 1000 read at 65000',
    entries: [BUILD_RUNNING],
    records: [],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_RUNNING,
    elapsed: BUILD_64_S
  },
  {
    given: 'a persistent own run launched at 1000 read at 3724000',
    entries: [DEV_RUNNING],
    records: [],
    persistentIds: ['ui#dev'],
    wallNow: 3_724_000,
    runs: DEV_WORD_CONTINUOUS,
    elapsed: DEV_3723_S
  },
  {
    given: 'an own run and a run in a#build that also runs it',
    entries: [BUILD_RUNNING],
    records: [BUILD_IN_A],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_RUNNING,
    elapsed: BUILD_64_S
  },
  {
    given: 'an own run launched after the wall clock (a clock jump)',
    entries: [BUILD_RUNNING],
    records: [],
    persistentIds: [],
    wallNow: 500,
    runs: BUILD_WORD_RUNNING,
    elapsed: BUILD_0_S
  },
  {
    given: 'no own run and a run in a#build (owned)',
    entries: [],
    records: [BUILD_IN_A],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_RUNNING,
    elapsed: undefined
  },
  {
    given: 'an own run passed and a run in a#build (owned)',
    entries: [BUILD_PASSED],
    records: [BUILD_IN_A],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_RUNNING,
    elapsed: undefined
  },
  {
    given: 'an own run passed',
    entries: [BUILD_PASSED],
    records: [],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_PASSED,
    elapsed: undefined
  },
  {
    given: 'an own run stopped',
    entries: [BUILD_STOPPED],
    records: [],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_STOPPED,
    elapsed: undefined
  },
  {
    given: 'an own run that failed to start',
    entries: [BUILD_FAILED_TO_START],
    records: [],
    persistentIds: [],
    wallNow: 65_000,
    runs: BUILD_WORD_FAILED_TO_START,
    elapsed: undefined
  },
  { given: 'no run at all', entries: [], records: [], persistentIds: [], wallNow: 65_000, runs: NO_WORDS, elapsed: undefined }
];

describe('FEATURE: the elapsed key of the runs message (spec §2, D1, D3)', () => {
  describe('GIVEN ui#build and ui#dev listed', () => {
    it.each(ROWS)(
      'WHEN the message is built over $given THEN elapsed is $elapsed',
      ({ entries, records, persistentIds, wallNow, runs, elapsed }) => {
        const sources = sourcesOf(entries, records, persistentIds, wallNow);

        const { message } = clockedRunsOf('/ws', ['ui#build', 'ui#dev'], sources);

        expect(message.runs).toStrictEqual(runs);
        expect(message.elapsed).toStrictEqual(elapsed);
      }
    );

    it.each(ROWS.filter((row) => row.elapsed === undefined))('WHEN built over $given THEN the message has no elapsed key', (row) => {
      const { message } = clockedRunsOf(
        '/ws',
        ['ui#build', 'ui#dev'],
        sourcesOf(row.entries, row.records, row.persistentIds, row.wallNow)
      );

      expect(message).not.toHaveProperty('elapsed');
    });
  });

  describe('GIVEN one own run and one owned id', () => {
    it('WHEN the message is built THEN elapsed names the own run only and nothing else changes', () => {
      const records = [recordOf('ui#dev', 'running', 1000, A)];
      const sources = sourcesOf([BUILD_RUNNING], records, ['ui#dev'], 65_000);

      const { message } = clockedRunsOf('/ws', ['ui#build', 'ui#dev'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: BOTH_WORDS, owners: DEV_OWNED_BY_A, elapsed: BUILD_64_S });
    });

    it('WHEN the runs are clocked THEN the launches name the own run only, with its launchedAt', () => {
      const records = [recordOf('ui#dev', 'running', 1000, A)];
      const sources = sourcesOf([BUILD_RUNNING, BUILD_PASSED_LINT], records, ['ui#dev'], 65_000);

      const { launches } = clockedRunsOf('/ws', ['ui#build', 'ui#dev', 'ui#lint'], sources);

      expect(launches).toStrictEqual(BUILD_LAUNCH);
    });
  });

  describe('GIVEN own runs of ids named like Object.prototype members', () => {
    it('WHEN the runs are clocked THEN each launch is an own key', () => {
      const entries = PROTOTYPE_IDS.map(runningEntryOf);

      const { launches } = clockedRunsOf('/ws', PROTOTYPE_IDS, sourcesOf(entries, [], [], 65_000));

      expect(Object.keys(launches)).toStrictEqual(PROTOTYPE_IDS);
      expect(Object.getPrototypeOf(launches)).toBe(Object.prototype);
    });
  });

  describe('GIVEN an own run of an id that is not listed', () => {
    it('WHEN the message is built THEN elapsed does not name it', () => {
      const ghost: RunEntry = { ...BUILD_RUNNING, taskId: 'ghost#build' };

      const { message } = clockedRunsOf('/ws', ['ui#build'], sourcesOf([ghost], [], [], 65_000));

      expect(message).not.toHaveProperty('elapsed');
    });
  });
});
