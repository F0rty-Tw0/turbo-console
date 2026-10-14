import { describe, expect, it } from 'vitest';

import { isTaskOf, runEventOf, taskDefinitionOf } from './run-event.util.ts';
import type { RunDefinition, RunEvent, RunTaskDefinition } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const DEFINITION: RunTaskDefinition = { type: 'turbo-console', root: '/ws', id: 'build', launchedAt: 1000 };

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const EVENT: RunEvent = { definition: RUN, launchedAt: 1000 };

describe('FEATURE: run task definitions', () => {
  describe('GIVEN a run request launched at 1000', () => {
    it('WHEN its task definition is built THEN it names the type, root, task id and launch token', () => {
      const definition = taskDefinitionOf(RUN_REQUEST_STUB, 1000);

      expect(definition).toStrictEqual(DEFINITION);
    });

    it('WHEN its task definition comes back on a task event THEN the event names that run', () => {
      const definition = taskDefinitionOf(RUN_REQUEST_STUB, 1000);

      const event = runEventOf(definition);

      expect(event).toStrictEqual(EVENT);
    });
  });

  describe('GIVEN a task event definition', () => {
    it('WHEN it holds other keys too THEN only the root, id and launch token are kept', () => {
      const definition = { ...DEFINITION, affected: false, extra: 'x' };

      const event = runEventOf(definition);

      expect(event).toStrictEqual(EVENT);
    });

    it.each<[string, Readonly<Record<string, unknown>>]>([
      ['of another task type', { ...DEFINITION, type: 'npm' }],
      ['with no root', { type: 'turbo-console', id: 'build', launchedAt: 1000 }],
      ['with a root that is not a string', { ...DEFINITION, root: 7 }],
      ['with no task id', { type: 'turbo-console', root: '/ws', launchedAt: 1000 }],
      ['with a task id that is not a string', { ...DEFINITION, id: null }],
      ['with no launch token (a run all task, or a task VS Code rebuilt itself)', { type: 'turbo-console', root: '/ws', id: 'build' }],
      ['with a launch token that is not a number', { ...DEFINITION, launchedAt: '1000' }]
    ])('WHEN it is %s THEN it names no run', (_name, definition) => {
      const event = runEventOf(definition);

      expect(event).toBeNull();
    });
  });

  describe('GIVEN the definition of a task VS Code is running and the run of build in /ws', () => {
    it.each<[string, Readonly<Record<string, unknown>>]>([
      ['that task, launched by this window', DEFINITION],
      ['that task with no launch token (Rerun Last Task, a reconnect)', { type: 'turbo-console', root: '/ws', id: 'build' }]
    ])('WHEN it is %s THEN it is a task of that run', (_name, definition) => {
      const isSame = isTaskOf(definition, RUN);

      expect(isSame).toBe(true);
    });

    it.each<[string, Readonly<Record<string, unknown>>]>([
      ['of another task type', { ...DEFINITION, type: 'npm' }],
      ['in another root', { ...DEFINITION, root: '/other' }],
      ['of another task id', { ...DEFINITION, id: 'a#test' }],
      ['a run all task of the same name', { ...DEFINITION, id: '*build' }]
    ])('WHEN it is %s THEN it is not a task of that run', (_name, definition) => {
      const isSame = isTaskOf(definition, RUN);

      expect(isSame).toBe(false);
    });
  });
});
