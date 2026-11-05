import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it, vi } from 'vitest';

import { persistentIdsOf, runsMessageOf } from './graph-tasks.util.ts';
import type { ProgressOwner, ProgressRecord } from '../../run/common/run-progress.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { recordOf } from '../../run/test/utils/run-progress.spec.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunSources } from '../common/graph.type.ts';

type MergeRow = {
  readonly given: string;
  readonly own: RunEntry | undefined;
  readonly records: ProgressRecord[];
  readonly word: string;
  readonly owner: string | undefined;
};

const A: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };

const B: ProgressOwner = { root: '/ws', taskId: 'b#build', launchedAt: 1100 };

const RUNNING_IN_A = recordOf('ui#build', 'running', 1000, A);

const RUNNING_IN_B = recordOf('ui#build', 'running', 1100, B);

const PASSED_IN_B = recordOf('ui#build', 'passed', 1200, B);

const FAILED_IN_A_AT_1300 = recordOf('ui#build', 'failed', 1300, A);

const OWN_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'ui#build', state: 'running', launchedAt: 1000 };

const OWN_PASSED_AT_1500: RunEntry = { ...OWN_RUNNING, state: 'passed', endedAt: 1500, exitCode: 0 };

const OWN_PASSED_AT_1100: RunEntry = { ...OWN_RUNNING, state: 'passed', endedAt: 1100, exitCode: 0 };

const OWN_FAILED_TO_START: RunEntry = { ...OWN_RUNNING, state: 'failed-to-start', endedAt: 1100 };

const OWN_STOPPED: RunEntry = { ...OWN_RUNNING, state: 'stopped', endedAt: 1100 };

const DEV_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'ui#dev', name: 'dev', persistent: true };

const OWN_DEV_RUNNING: RunEntry = { ...OWN_RUNNING, taskId: 'ui#dev', task: DEV_TASK };

const OWN_DEV_PASSED: RunEntry = { ...OWN_DEV_RUNNING, state: 'passed', endedAt: 1500, exitCode: 0 };

const RUNNING_DEV_IN_A = recordOf('ui#dev', 'running', 1000, A);

const BUILD_RUNNING = { 'ui#build': 'running' };

const BUILD_PASSED = { 'ui#build': 'passed' };

const BUILD_OWNED_BY_A = { 'ui#build': 'a#build' };

const DEV_CONTINUOUS = { 'ui#dev': 'continuous' };

const DEV_PASSED = { 'ui#dev': 'passed' };

const DEV_OWNED_BY_A = { 'ui#dev': 'a#build' };

const LISTED_IDS = ['b#x', 'a#x', 'c#x'];

const PROTOTYPE_IDS = ['__proto__', 'constructor'];

const MERGE_ROWS: MergeRow[] = [
  { given: 'no own run and a run in a#build', own: undefined, records: [RUNNING_IN_A], word: 'running', owner: 'a#build' },
  {
    given: 'no own run, a run in a#build and a pass in b#build',
    own: undefined,
    records: [RUNNING_IN_A, PASSED_IN_B],
    word: 'running',
    owner: 'a#build'
  },
  {
    given: 'no own run and runs in both owners',
    own: undefined,
    records: [RUNNING_IN_A, RUNNING_IN_B],
    word: 'running',
    owner: 'b#build'
  },
  { given: 'an own run that runs and a run in a#build', own: OWN_RUNNING, records: [RUNNING_IN_A], word: 'running', owner: undefined },
  {
    given: 'an own run that runs at 1000 and a newer run in b#build',
    own: OWN_RUNNING,
    records: [RUNNING_IN_B],
    word: 'running',
    owner: undefined
  },
  {
    given: 'an own run passed at 1500 and a run in a#build',
    own: OWN_PASSED_AT_1500,
    records: [RUNNING_IN_A],
    word: 'running',
    owner: 'a#build'
  },
  {
    given: 'an own run passed at 1500 and a failure in a#build at 1300',
    own: OWN_PASSED_AT_1500,
    records: [FAILED_IN_A_AT_1300],
    word: 'passed',
    owner: undefined
  },
  {
    given: 'an own run passed at 1100 and a failure in a#build at 1300',
    own: OWN_PASSED_AT_1100,
    records: [FAILED_IN_A_AT_1300],
    word: 'failed',
    owner: undefined
  },
  { given: 'an own run that failed to start', own: OWN_FAILED_TO_START, records: [], word: 'failed-to-start', owner: undefined },
  { given: 'an own run that stopped', own: OWN_STOPPED, records: [], word: 'stopped', owner: undefined }
];

const sourcesOf = (entries: RunEntry[], records: ProgressRecord[], persistentIds: string[] = []): RunSources => {
  const get = (root: string, taskId: string): RunEntry | undefined =>
    entries.find((entry) => entry.root === root && entry.taskId === taskId);
  const recordsOf = (root: string, taskId: string): ProgressRecord[] =>
    records.filter((record) => record.owner.root === root && record.taskId === taskId);
  const sources: RunSources = { get, recordsOf, persistentIds: new Set(persistentIds) };

  return sources;
};

const ownEntriesOf = (own: RunEntry | undefined): RunEntry[] => {
  if (own === undefined) return [];

  return [own];
};

const passedEntryOf = (taskId: string): RunEntry => {
  const entry: RunEntry = { ...OWN_PASSED_AT_1500, taskId };

  return entry;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks };

  return node;
};

const taskNamed = (id: string, isPersistent: boolean): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id, name: id.slice(id.indexOf('#') + 1), persistent: isPersistent };

  return task;
};

describe('FEATURE: the runs message of a graph (spec D9, D11, §5.2)', () => {
  describe('GIVEN ui#build listed', () => {
    it('WHEN no own run and no record names it THEN runs has no ui#build key', () => {
      const sources = sourcesOf([], []);

      const message = runsMessageOf('/ws', ['ui#build'], sources);

      expect(message.runs).not.toHaveProperty('ui#build');
    });

    it.each(MERGE_ROWS)(
      'WHEN the message is built over $given THEN the word is $word and the owner is $owner',
      ({ own, records, word, owner }) => {
        const sources = sourcesOf(ownEntriesOf(own), records);

        const message = runsMessageOf('/ws', ['ui#build'], sources);

        expect(message.runs['ui#build']).toBe(word);
        expect(message.owners?.['ui#build']).toBe(owner);
      }
    );
  });

  describe('GIVEN a persistent task ui#dev', () => {
    it('WHEN its own run runs THEN its word is continuous and it has no owner', () => {
      const sources = sourcesOf([OWN_DEV_RUNNING], []);

      const message = runsMessageOf('/ws', ['ui#dev'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: DEV_CONTINUOUS });
    });

    it('WHEN it runs under a#build THEN its word is continuous and its owner is a#build', () => {
      const sources = sourcesOf([], [RUNNING_DEV_IN_A], ['ui#dev']);

      const message = runsMessageOf('/ws', ['ui#dev'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: DEV_CONTINUOUS, owners: DEV_OWNED_BY_A });
    });

    it('WHEN its own run passed THEN its word is passed', () => {
      const sources = sourcesOf([OWN_DEV_PASSED], [], ['ui#dev']);

      const message = runsMessageOf('/ws', ['ui#dev'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: DEV_PASSED });
    });
  });

  describe('GIVEN ids with their own runs only', () => {
    it('WHEN no id has an owner THEN the message has no owners key', () => {
      const sources = sourcesOf([OWN_PASSED_AT_1500], []);

      const message = runsMessageOf('/ws', ['ui#build'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: BUILD_PASSED });
      expect(message).not.toHaveProperty('owners');
    });

    it('WHEN the ids are in listing order THEN the runs keys keep that order', () => {
      const entries = LISTED_IDS.map(passedEntryOf);
      const sources = sourcesOf(entries, []);

      const message = runsMessageOf('/ws', LISTED_IDS, sources);

      expect(Object.keys(message.runs)).toStrictEqual(['b#x', 'a#x', 'c#x']);
    });
  });

  describe('GIVEN listed ids named like Object.prototype members', () => {
    it('WHEN a#build runs them THEN each is an own key of runs and of owners and no prototype changes', () => {
      const records = PROTOTYPE_IDS.map((id) => recordOf(id, 'running', 1000, A));
      const sources = sourcesOf([], records);

      const message = runsMessageOf('/ws', PROTOTYPE_IDS, sources);

      expect(Object.entries(message.owners ?? {})).toStrictEqual([
        ['__proto__', 'a#build'],
        ['constructor', 'a#build']
      ]);
      expect(Object.keys(message.runs)).toStrictEqual(PROTOTYPE_IDS);
      expect(Object.getPrototypeOf(message.owners)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(message.runs)).toBe(Object.prototype);
    });
  });

  describe('GIVEN a record of an id that is not listed', () => {
    it('WHEN the message is built THEN neither map names it', () => {
      const ghost = recordOf('ghost#build', 'running', 1000, A);
      const sources = sourcesOf([], [RUNNING_IN_A, ghost]);

      const message = runsMessageOf('/ws', ['ui#build'], sources);

      expect(message).toStrictEqual({ type: 'runs', runs: BUILD_RUNNING, owners: BUILD_OWNED_BY_A });
    });
  });

  describe('GIVEN lookups for the runs and for the records', () => {
    it('WHEN the message is built for /ws THEN both are called with /ws and the id', () => {
      const get = vi.fn((): RunEntry | undefined => undefined);
      const recordsOf = vi.fn((): ProgressRecord[] => []);
      const sources: RunSources = { get, recordsOf, persistentIds: new Set() };

      runsMessageOf('/ws', ['ui#build'], sources);

      expect(recordsOf.mock.calls).toStrictEqual([['/ws', 'ui#build']]);
      expect(get.mock.calls).toStrictEqual([['/ws', 'ui#build']]);
    });
  });
});

describe('FEATURE: persistent ids of a model', () => {
  it('GIVEN web#dev persistent and web#build not WHEN taken THEN only web#dev', () => {
    const web = packageOf('web', [taskNamed('web#build', false), taskNamed('web#dev', true)]);
    const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [web] };

    const ids = persistentIdsOf(model);

    expect([...ids]).toStrictEqual(['web#dev']);
  });

  it('GIVEN a persistent root task //#dev WHEN taken THEN //#dev is among them', () => {
    const rootPackage = packageOf('//', [taskNamed('//#dev', true)]);
    const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [], rootPackage };

    const ids = persistentIdsOf(model);

    expect([...ids]).toStrictEqual(['//#dev']);
  });

  it('GIVEN a persistent atom file WHEN taken THEN it is not listed', () => {
    const persistentFile = taskNamed('web#f', true);
    const file: TaskNode = { ...persistentFile, kind: 'atom-file' };
    const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [packageOf('web', [file])] };

    const ids = persistentIdsOf(model);

    expect(ids.size).toBe(0);
  });
});
