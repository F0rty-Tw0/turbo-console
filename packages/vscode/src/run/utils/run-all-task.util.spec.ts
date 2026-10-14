import { describe, expect, it } from 'vitest';

import { runAllDefinitionOf, runAllKey, runAllKeyOf, runAllTaskDefinitionOf } from './run-all-task.util.ts';
import type { RunAllDefinition, RunAllLaunch, RunAllTaskDefinition } from '../common/run-all.type.ts';

const LAUNCH: RunAllLaunch = { root: '/ws', binaryPath: '/bin/turbo', taskName: 'build', affected: true };

const DEFINITION: RunAllDefinition = { root: '/ws', id: '*build', affected: true };

const TASK_DEFINITION: RunAllTaskDefinition = { type: 'turbo-console', ...DEFINITION };

describe('FEATURE: run all task identity', () => {
  describe('GIVEN a run all of build with --affected in /ws', () => {
    it('WHEN its task definition is built THEN it names the type, root, the star-prefixed id and affected', () => {
      const definition = runAllTaskDefinitionOf(LAUNCH);

      expect(definition).toStrictEqual(TASK_DEFINITION);
    });

    it('WHEN its task definition comes back on a task event THEN the event names that run all', () => {
      const definition = runAllTaskDefinitionOf(LAUNCH);

      const named = runAllDefinitionOf(definition);

      expect(named).toStrictEqual(DEFINITION);
    });

    it('WHEN its key is built from the request or from the definition THEN both are root, star id and affected split by NUL', () => {
      const fromRequest = runAllKey('/ws', 'build', true);
      const fromDefinition = runAllKeyOf(DEFINITION);

      expect(fromRequest).toBe('/ws\0*build\0true');
      expect(fromDefinition).toBe(fromRequest);
    });

    it('WHEN affected differs THEN the key differs', () => {
      const plain = runAllKey('/ws', 'build', false);

      expect(plain).not.toBe(runAllKey('/ws', 'build', true));
    });
  });

  describe('GIVEN a task event definition', () => {
    it('WHEN it holds other keys too THEN only the root, id and affected are kept', () => {
      const named = runAllDefinitionOf({ ...TASK_DEFINITION, launchedAt: 1000, extra: 'x' });

      expect(named).toStrictEqual(DEFINITION);
    });

    it.each<[string, Readonly<Record<string, unknown>>]>([
      ['of another task type', { ...TASK_DEFINITION, type: 'npm' }],
      ['with no root', { type: 'turbo-console', id: '*build', affected: false }],
      ['with a root that is not a string', { ...TASK_DEFINITION, root: 7 }],
      ['with an id that is not a string', { ...TASK_DEFINITION, id: null }],
      ['with an id of a single task run', { ...TASK_DEFINITION, id: 'a#build' }],
      ['with no affected', { type: 'turbo-console', root: '/ws', id: '*build' }],
      ['with an affected that is not a boolean', { ...TASK_DEFINITION, affected: 'true' }]
    ])('WHEN it is %s THEN it names no run all', (_name, definition) => {
      const named = runAllDefinitionOf(definition);

      expect(named).toBeNull();
    });
  });
});
