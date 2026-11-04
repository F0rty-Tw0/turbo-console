import type { RunLogEvent, TaskOutcome } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunProgress } from './run-progress.ts';
import type { DependenciesOf, ProgressOwner, ProgressRecord } from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';
import { SEEN_UI } from '../test/common/run-progress.const.ts';
import { DEPENDENCIES_STUB, PROGRESS_OWNER_STUB } from '../test/stubs/run-progress.stub.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';
import { dependenciesOfMap, progressChangesOf, recordOf } from '../test/utils/run-progress.spec.util.ts';

const OWNER_1: ProgressOwner = PROGRESS_OWNER_STUB;

const OWNER_2: ProgressOwner = { ...OWNER_1, launchedAt: 5000 };

const OWNER_3: ProgressOwner = { ...OWNER_1, launchedAt: 9000 };

const OTHER: ProgressOwner = { root: '/ws', taskId: 'admin#build', launchedAt: 1200 };

const OTHER_ROOT: ProgressOwner = { root: '/other', taskId: 'web#build', launchedAt: 1500 };

const DEPENDENCIES: DependenciesOf = dependenciesOfMap(DEPENDENCIES_STUB);

const SEEN_TOKENS: RunLogEvent = { kind: 'seen', taskId: 'tokens#build' };

const SEEN_DOCS: RunLogEvent = { kind: 'seen', taskId: 'docs#build' };

const CACHED_UI: RunLogEvent = { kind: 'cacheHit', taskId: 'ui#build' };

const OUTCOMES: TaskOutcome[] = [
  { taskId: 'tokens#build', state: 'passed' },
  { taskId: 'ui#build', state: 'passed' },
  { taskId: 'web#build', state: 'passed' }
];

const UI_PASSED: TaskOutcome[] = [{ taskId: 'ui#build', state: 'passed' }];

const UNENDED: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'web#build' };

const ENDED: RunEntry = { ...UNENDED, state: 'passed', endedAt: 3000, exitCode: 0, outcomes: OUTCOMES };

const ENDED_EMPTY: RunEntry = { ...ENDED, outcomes: [] };

const RERUN_ENDED: RunEntry = { ...ENDED, launchedAt: 5000, endedAt: 7000 };

const OTHER_ENDED: RunEntry = { ...ENDED, taskId: 'admin#build', launchedAt: 1200, outcomes: UI_PASSED };

const OTHER_ROOT_ENDED: RunEntry = { ...ENDED, root: '/other', launchedAt: 1500 };

describe('FEATURE: run progress store (spec D8)', () => {
  let now: number;
  let progress: RunProgress;

  beforeEach(() => {
    now = 0;
    progress = new RunProgress((): number => now);
  });

  describe('GIVEN no begin', () => {
    it('WHEN an event arrives THEN nothing is recorded', () => {
      progress.event(OWNER_1, SEEN_UI);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual([]);
    });

    it('WHEN an event arrives THEN nothing fires', () => {
      const changes = progressChangesOf(progress);

      progress.event(OWNER_1, SEEN_UI);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN a settle arrives THEN nothing is recorded', () => {
      progress.settle(OWNER_1, ENDED);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual([]);
    });

    it('WHEN a settle arrives THEN nothing fires', () => {
      const changes = progressChangesOf(progress);

      progress.settle(OWNER_1, ENDED);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN a run begins THEN nothing fires', () => {
      const changes = progressChangesOf(progress);

      progress.begin(OWNER_1, DEPENDENCIES);

      expect(changes).toStrictEqual([]);
    });
  });

  describe('GIVEN a begun run of web#build', () => {
    beforeEach(() => {
      progress.begin(OWNER_1, DEPENDENCIES);
    });

    it('WHEN ui#build prints at 2000 THEN it has one running record stamped 2000', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'running', 2000)];

      now = 2000;

      progress.event(OWNER_1, SEEN_UI);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN ui#build prints THEN one change fires for /ws', () => {
      const changes = progressChangesOf(progress);

      progress.event(OWNER_1, SEEN_UI);

      expect(changes).toStrictEqual(['/ws']);
    });

    it('WHEN ui#build prints a second line THEN nothing more fires (a chatty task costs no change)', () => {
      progress.event(OWNER_1, SEEN_UI);
      const changes = progressChangesOf(progress);

      progress.event(OWNER_1, SEEN_UI);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN the run settles with three outcomes THEN exactly one change fires', () => {
      progress.event(OWNER_1, SEEN_UI);
      const changes = progressChangesOf(progress);

      progress.settle(OWNER_1, ENDED);

      expect(changes).toStrictEqual(['/ws']);
    });

    it('WHEN a settle comes before its entry ended THEN nothing fires', () => {
      const changes = progressChangesOf(progress);

      progress.settle(OWNER_1, UNENDED);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN a line arrives after the settle THEN nothing is recorded', () => {
      progress.settle(OWNER_1, ENDED);

      progress.event(OWNER_1, SEEN_DOCS);

      const records = progress.recordsOf('/ws', 'docs#build');

      expect(records).toStrictEqual([]);
    });

    it('WHEN a line arrives after the settle THEN nothing fires', () => {
      progress.settle(OWNER_1, ENDED);
      const changes = progressChangesOf(progress);

      progress.event(OWNER_1, SEEN_DOCS);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN it is begun again with the same launch THEN its records stay', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'running', 2000)];

      now = 2000;
      progress.event(OWNER_1, SEEN_UI);

      progress.begin(OWNER_1, DEPENDENCIES);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });
  });

  describe('GIVEN settled runs of web#build and admin#build under /ws and of web#build under /other, all with records', () => {
    beforeEach(() => {
      progress.begin(OWNER_1, DEPENDENCIES);
      progress.settle(OWNER_1, ENDED);
      progress.begin(OTHER, DEPENDENCIES);
      progress.settle(OTHER, OTHER_ENDED);
      progress.begin(OTHER_ROOT, DEPENDENCIES);
      progress.settle(OTHER_ROOT, OTHER_ROOT_ENDED);
    });

    it('WHEN web#build begins again under /ws THEN the records of /other stay', () => {
      const expected: ProgressRecord[] = [recordOf('tokens#build', 'passed', 3000, OTHER_ROOT)];

      progress.begin(OWNER_2, DEPENDENCIES);

      const records = progress.recordsOf('/other', 'tokens#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN web#build begins again THEN the previous records of web#build under /ws are gone', () => {
      progress.begin(OWNER_2, DEPENDENCIES);

      const records = progress.recordsOf('/ws', 'tokens#build');

      expect(records).toStrictEqual([]);
    });

    it('WHEN web#build begins again THEN one change fires for /ws', () => {
      const changes = progressChangesOf(progress);

      progress.begin(OWNER_2, DEPENDENCIES);

      expect(changes).toStrictEqual(['/ws']);
    });

    it('WHEN web#build begins again THEN the records of admin#build stay', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'passed', 3000, OTHER)];

      progress.begin(OWNER_2, DEPENDENCIES);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });
  });

  describe('GIVEN a settled run of web#build with no records', () => {
    it('WHEN web#build begins again THEN nothing fires', () => {
      progress.begin(OWNER_1, DEPENDENCIES);
      progress.settle(OWNER_1, ENDED_EMPTY);
      const changes = progressChangesOf(progress);

      progress.begin(OWNER_2, DEPENDENCIES);

      expect(changes).toStrictEqual([]);
    });
  });

  describe('GIVEN an unsettled run of web#build with ui#build running (its join pending)', () => {
    beforeEach(() => {
      progress.begin(OWNER_1, DEPENDENCIES);
      now = 2000;
      progress.event(OWNER_1, SEEN_UI);
    });

    it('WHEN web#build begins again THEN the previous records stay', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'running', 2000)];

      progress.begin(OWNER_2, DEPENDENCIES);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN web#build begins again and the previous run then settles THEN its records are settled', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'passed', 3000)];

      progress.begin(OWNER_2, DEPENDENCIES);

      progress.settle(OWNER_1, ENDED);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN the rerun records ui#build, both runs settle and web#build begins a third time THEN the records of both are gone', () => {
      progress.begin(OWNER_2, DEPENDENCIES);
      now = 6000;
      progress.event(OWNER_2, SEEN_UI);
      progress.settle(OWNER_1, ENDED);
      progress.settle(OWNER_2, RERUN_ENDED);

      progress.begin(OWNER_3, DEPENDENCIES);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual([]);
    });
  });

  describe('GIVEN a passed ui#build and a running tokens#build in two runs under /ws, and a running tokens#build under /other', () => {
    const visibleIds = new Set(['ui#build']);

    beforeEach(() => {
      progress.begin(OWNER_1, DEPENDENCIES);
      progress.begin(OTHER, DEPENDENCIES);
      progress.begin(OTHER_ROOT, DEPENDENCIES);
      now = 2000;
      progress.event(OWNER_1, CACHED_UI);
      progress.event(OWNER_1, SEEN_TOKENS);
      progress.event(OTHER, SEEN_TOKENS);
      progress.event(OTHER_ROOT, SEEN_TOKENS);
    });

    it('WHEN /ws is pruned to { ui#build } THEN the running tokens#build records are gone under /ws', () => {
      progress.prune('/ws', visibleIds);

      const records = progress.recordsOf('/ws', 'tokens#build');

      expect(records).toStrictEqual([]);
    });

    it('WHEN /ws is pruned to { ui#build } THEN the passed ui#build stays under /ws', () => {
      const expected: ProgressRecord[] = [recordOf('ui#build', 'passed', 2000)];

      progress.prune('/ws', visibleIds);

      const records = progress.recordsOf('/ws', 'ui#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN /ws is pruned to { ui#build } THEN /other keeps its tokens#build', () => {
      const expected: ProgressRecord[] = [recordOf('tokens#build', 'running', 2000, OTHER_ROOT)];

      progress.prune('/ws', visibleIds);

      const records = progress.recordsOf('/other', 'tokens#build');

      expect(records).toStrictEqual(expected);
    });

    it('WHEN /ws is pruned to { ui#build } THEN one change fires for /ws', () => {
      const changes = progressChangesOf(progress);

      progress.prune('/ws', visibleIds);

      expect(changes).toStrictEqual(['/ws']);
    });

    it('WHEN /ws is pruned with every id still visible THEN nothing fires', () => {
      const allIds = new Set(['ui#build', 'tokens#build']);
      const changes = progressChangesOf(progress);

      progress.prune('/ws', allIds);

      expect(changes).toStrictEqual([]);
    });
  });

  describe('GIVEN a settled run of web#build with tokens#build passed', () => {
    it('WHEN /ws is pruned to { ui#build } THEN its tokens#build is gone', () => {
      const visibleIds = new Set(['ui#build']);

      progress.begin(OWNER_1, DEPENDENCIES);
      progress.settle(OWNER_1, ENDED);

      progress.prune('/ws', visibleIds);

      const records = progress.recordsOf('/ws', 'tokens#build');

      expect(records).toStrictEqual([]);
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN an event changes a record THEN it is not called', () => {
      const calls: string[] = [];

      progress.begin(OWNER_1, DEPENDENCIES);
      const unsubscribe = progress.onDidChange((root): number => calls.push(root));

      unsubscribe();

      progress.event(OWNER_1, SEEN_UI);

      expect(calls).toStrictEqual([]);
    });
  });
});
