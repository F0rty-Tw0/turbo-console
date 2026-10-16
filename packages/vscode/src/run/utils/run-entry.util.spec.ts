import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { runKeyOf, runningEntryOf } from './run-entry.util.ts';
import { PACKAGE_MANAGER_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunEntry } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

describe('FEATURE: run key', () => {
  it('GIVEN a root and a task id WHEN keyed THEN they are joined by a NUL', () => {
    expect(runKeyOf('/ws', 'a#build')).toBe('/ws\0a#build');
  });

  it('GIVEN a root ending where another task id starts WHEN keyed THEN the keys differ', () => {
    expect(runKeyOf('/ws/a', 'b')).not.toBe(runKeyOf('/ws', 'a/b'));
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
});
