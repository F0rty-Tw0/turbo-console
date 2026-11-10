import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { predictionBatchOf } from './prediction-request.util.ts';
import { buildModelOf, predictionModelOf, turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: predictionBatchOf', () => {
  describe('GIVEN requested tasks', () => {
    it('WHEN one package has two requested tasks THEN one request with its sorted names, its filter, singlePackage false', () => {
      const model = predictionModelOf({ '@fx/a': [turboTaskOf('@fx/a', 'lint'), turboTaskOf('@fx/a', 'build')] });

      const request = { tasks: ['build', 'lint'], packages: ['@fx/a'], singlePackage: false };

      expect(predictionBatchOf(model, ['@fx/a'])).toStrictEqual({
        request,
        requested: new Map([
          ['@fx/a#build', '@fx/a'],
          ['@fx/a#lint', '@fx/a']
        ])
      });
    });

    it('WHEN two packages have {build, lint} and {build, test} THEN tasks is the union [build, lint, test] and requested holds all four ids', () => {
      const model = predictionModelOf({
        '@fx/a': [turboTaskOf('@fx/a', 'build'), turboTaskOf('@fx/a', 'lint')],
        '@fx/b': [turboTaskOf('@fx/b', 'build'), turboTaskOf('@fx/b', 'test')]
      });

      const request = { tasks: ['build', 'lint', 'test'], packages: ['@fx/a', '@fx/b'], singlePackage: false };
      const requested = new Map([
        ['@fx/a#build', '@fx/a'],
        ['@fx/a#lint', '@fx/a'],
        ['@fx/b#build', '@fx/b'],
        ['@fx/b#test', '@fx/b']
      ]);

      expect(predictionBatchOf(model, ['@fx/a', '@fx/b'])).toStrictEqual({ request, requested });
    });

    it('WHEN an Atomizer umbrella is a turbo task THEN it is requested', () => {
      const umbrella = turboTaskOf('@fx/a', 'e2e-ci', { kind: 'atom-umbrella' });
      const model = predictionModelOf({ '@fx/a': [umbrella] });

      expect(predictionBatchOf(model, ['@fx/a'])?.requested.get('@fx/a#e2e-ci')).toBe('@fx/a');
    });
  });

  describe('GIVEN a task that is not requested', () => {
    const patches: [string, Partial<TaskNode>][] = [
      ['an Atomizer file task', { kind: 'atom-file' }],
      ['a task with no command', { command: null }],
      ['a persistent task', { persistent: true }],
      ['a script no turbo config defines', { isTurboTask: false }]
    ];

    it.each(patches)('WHEN the only task is %s THEN the result is null', (_name, patch) => {
      const model = predictionModelOf({ '@fx/a': [turboTaskOf('@fx/a', 'build', patch)] });

      expect(predictionBatchOf(model, ['@fx/a'])).toBeNull();
    });
  });

  describe('GIVEN package names', () => {
    it('WHEN one named package has no requested task THEN it is left out of packages but the other stays', () => {
      const model = predictionModelOf({
        '@fx/a': [turboTaskOf('@fx/a', 'build', { persistent: true })],
        '@fx/b': [turboTaskOf('@fx/b', 'build')]
      });

      expect(predictionBatchOf(model, ['@fx/a', '@fx/b'])?.request.packages).toStrictEqual(['@fx/b']);
    });

    it('WHEN a named package is not in the model THEN it is ignored', () => {
      const model = buildModelOf(['@fx/a']);

      expect(predictionBatchOf(model, ['@fx/missing', '@fx/a'])?.request.packages).toStrictEqual(['@fx/a']);
    });

    it('WHEN the model is a single package (name "//", task "//#check") THEN singlePackage is true and the id maps to "//"', () => {
      const model = predictionModelOf({ '//': [turboTaskOf('//', 'check')] }, true);

      const request = { tasks: ['check'], packages: ['//'], singlePackage: true };

      expect(predictionBatchOf(model, ['//'])).toStrictEqual({
        request,
        requested: new Map([['//#check', '//']])
      });
    });
  });
});
