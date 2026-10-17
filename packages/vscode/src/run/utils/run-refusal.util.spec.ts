import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { refusalOf } from './run-refusal.util.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { NOT_TURBO_FORCE_TEXT } from '../common/run.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, task: SCRIPT_TASK };

const UNSAFE_BUILD = "Turbo Console can't run a script named `build` safely.";

describe('FEATURE: run refusal', () => {
  describe('GIVEN a turbo task', () => {
    it('WHEN it is plain THEN nothing refuses it', () => {
      expect(refusalOf(RUN_REQUEST_STUB)).toBeNull();
    });

    it('WHEN it is forced THEN nothing refuses it', () => {
      expect(refusalOf({ ...RUN_REQUEST_STUB, force: true })).toBeNull();
    });

    it('WHEN its package dir is outside the root THEN nothing refuses it, as the script checks do not apply', () => {
      expect(refusalOf({ ...RUN_REQUEST_STUB, packageDir: '/x' })).toBeNull();
    });
  });

  describe('GIVEN a script', () => {
    it('WHEN its name is bare and its dir is in the root THEN nothing refuses it', () => {
      expect(refusalOf(SCRIPT)).toBeNull();
    });

    it('WHEN its dir is the root itself THEN nothing refuses it', () => {
      expect(refusalOf({ ...SCRIPT, packageDir: '/ws' })).toBeNull();
    });

    it('WHEN its name needs quoting THEN the unsafe text names it', () => {
      const task: TaskNode = { ...SCRIPT_TASK, name: 'a b' };

      expect(refusalOf({ ...SCRIPT, task })).toBe("Turbo Console can't run a script named `a b` safely.");
    });

    it('WHEN its dir is outside the root THEN the unsafe text names it', () => {
      expect(refusalOf({ ...SCRIPT, packageDir: '/x' })).toBe(UNSAFE_BUILD);
    });

    it.each<TaskNode['kind']>(['atom-umbrella', 'atom-aggregate', 'task'])(
      'WHEN its kind is %s and it has no command THEN the unsafe text names it, as bun would run a same-named file',
      (kind) => {
        const task: TaskNode = { ...SCRIPT_TASK, kind, command: null };

        expect(refusalOf({ ...SCRIPT, task })).toBe(UNSAFE_BUILD);
      }
    );

    it('WHEN its body is only whitespace THEN the unsafe text names it, as turbo keeps such a body', () => {
      const task: TaskNode = { ...SCRIPT_TASK, command: '   ' };

      expect(refusalOf({ ...SCRIPT, task })).toBe(UNSAFE_BUILD);
    });

    it('WHEN it is forced THEN the text says Run Without Cache only applies to turbo tasks', () => {
      expect(refusalOf({ ...SCRIPT, force: true })).toBe(NOT_TURBO_FORCE_TEXT);
    });

    it('WHEN it is forced and its dir is outside the root THEN the unsafe text wins', () => {
      expect(refusalOf({ ...SCRIPT, force: true, packageDir: '/x' })).toBe(UNSAFE_BUILD);
    });
  });
});
