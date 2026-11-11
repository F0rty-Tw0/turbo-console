import type { RunExtras, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { runOptionsLineOf } from './run-options-line.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const entryOf = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };
const FULL: RunExtras = {
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '4',
  passThrough: ['--watch', '--port=3000']
};
const ONLY: RunExtras = { only: true };
const EMPTY_ARGS: RunExtras = { passThrough: [] };
const KEEP_GOING: RunExtras = { continueMode: 'dependencies-successful' };
const CONCURRENT: RunExtras = { concurrency: '50%' };
const WATCH: RunExtras = { passThrough: ['--watch'] };
const SCRIPT_ARGS: RunExtras = { passThrough: ['--watch', '--port=3000'] };

describe('FEATURE: run options tooltip line', () => {
  describe('GIVEN an entry', () => {
    it.each<[string, Partial<RunEntry>, string | null]>([
      ['no extras', {}, null],
      ['force only (Run Without Cache)', { force: true }, null],
      ['empty extras', { extras: {} }, null],
      ['force with an empty pass-through', { force: true, extras: EMPTY_ARGS }, null],
      ['only', { extras: ONLY }, 'Options: --only'],
      ['force and only', { force: true, extras: ONLY }, 'Options: --force --only'],
      ['keep going', { extras: KEEP_GOING }, 'Options: --continue=dependencies-successful'],
      ['concurrency', { extras: CONCURRENT }, 'Options: --concurrency=50%'],
      ['pass-through', { extras: WATCH }, 'Options: -- --watch'],
      [
        'everything',
        { force: true, extras: FULL },
        'Options: --force --only --continue=dependencies-successful --concurrency=4 -- --watch --port=3000'
      ],
      ['a script with args', { task: SCRIPT_TASK, extras: SCRIPT_ARGS }, 'Arguments: --watch --port=3000'],
      ['a script with no args', { task: SCRIPT_TASK }, null],
      ['a script whose extras hold only another field', { task: SCRIPT_TASK, extras: ONLY }, null]
    ])('WHEN it has $0 THEN the line is $2', (_name, overrides, expected) => {
      expect(runOptionsLineOf(entryOf(overrides))).toBe(expected);
    });
  });
});
