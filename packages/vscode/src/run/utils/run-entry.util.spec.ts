import { describe, expect, it } from 'vitest';

import { runKeyOf, runningEntryOf } from './run-entry.util.ts';
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
      matching: false
    };

    expect(runningEntryOf(RUN_REQUEST_STUB, 1000)).toStrictEqual(expected);
  });
});
