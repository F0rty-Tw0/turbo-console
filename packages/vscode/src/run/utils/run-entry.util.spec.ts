import type { RunExtras, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { progressKeyOf, runKeyOf, runningEntryOf } from './run-entry.util.ts';
import { PACKAGE_MANAGER_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { ProgressOwner } from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';
import { PROGRESS_OWNER_STUB } from '../test/stubs/run-progress.stub.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

describe('FEATURE: run key', () => {
  it('GIVEN a root and a task id WHEN keyed THEN they are joined by a NUL', () => {
    expect(runKeyOf('/ws', 'a#build')).toBe('/ws\0a#build');
  });

  it('GIVEN a root ending where another task id starts WHEN keyed THEN the keys differ', () => {
    expect(runKeyOf('/ws/a', 'b')).not.toBe(runKeyOf('/ws', 'a/b'));
  });

  describe('GIVEN two launches of one task and a copy of the first', () => {
    it('WHEN keyed by progress key THEN they give two keys', () => {
      const rerun: ProgressOwner = { ...PROGRESS_OWNER_STUB, launchedAt: 5000 };
      const copy: ProgressOwner = { ...PROGRESS_OWNER_STUB };
      const owners = [PROGRESS_OWNER_STUB, rerun, copy];

      const keys = new Set(owners.map(progressKeyOf));

      expect(keys.size).toBe(2);
    });
  });
});

describe('FEATURE: running entry of a request', () => {
  it('GIVEN a request launched at 1000 WHEN its entry is made THEN it is running with nothing known of its process', () => {
    const expected: RunEntry = {
      root: '/ws',
      taskId: 'build',
      packageName: 'a',
      task: RUN_REQUEST_STUB.task,
      state: 'running',
      launchedAt: 1000,
      processStartedAt: null,
      endedAt: null,
      exitCode: null,
      stopRequested: false,
      match: null,
      matching: false,
      outcomes: null,
      force: false,
      packageManager: null
    };

    expect(runningEntryOf(RUN_REQUEST_STUB, 1000)).toStrictEqual(expected);
  });

  it('GIVEN a script request WHEN its entry is made THEN the entry names the package manager', () => {
    const task: TaskNode = { ...RUN_REQUEST_STUB.task, isTurboTask: false };

    const entry = runningEntryOf({ ...RUN_REQUEST_STUB, task }, 1000);

    expect(entry.packageManager).toStrictEqual(PACKAGE_MANAGER_STUB);
  });

  it('GIVEN a forced request WHEN its entry is made THEN the entry is forced too', () => {
    const entry = runningEntryOf({ ...RUN_REQUEST_STUB, force: true }, 1000);

    expect(entry.force).toBe(true);
  });

  describe('GIVEN run extras', () => {
    const EXTRAS: RunExtras = {
      only: true,
      continueMode: 'dependencies-successful',
      concurrency: '4',
      passThrough: ['--watch', '--port=3000']
    };

    it('WHEN a request with extras makes its entry THEN the entry carries those extras', () => {
      const entry = runningEntryOf({ ...RUN_REQUEST_STUB, extras: EXTRAS }, 1000);

      expect(entry.extras).toStrictEqual(EXTRAS);
    });

    it('WHEN a request with no extras makes its entry THEN the entry has no extras key at all', () => {
      const entry = runningEntryOf(RUN_REQUEST_STUB, 1000);

      expect(Object.keys(entry)).not.toContain('extras');
    });

    it('WHEN a forced request with extras makes its entry THEN force and extras are both kept', () => {
      const extras: RunExtras = { only: true };

      const entry = runningEntryOf({ ...RUN_REQUEST_STUB, force: true, extras }, 1000);

      expect(entry).toMatchObject({ force: true, extras });
    });
  });
});
