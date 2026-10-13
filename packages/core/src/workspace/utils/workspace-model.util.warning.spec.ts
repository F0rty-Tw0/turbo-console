import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel, withWarning } from './workspace-model.util.ts';
import { configError, manyErrors } from '../test/utils/config-error.spec.util.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';

const GRAPH = packageGraph([graphPackage('b', 'packages/b', [], [])], []);

const PARSE_ERROR = configError('packages/a/turbo.jsonc');

describe('FEATURE: workspace model warning added after the build', () => {
  describe('GIVEN a model built with more warnings than the cap', () => {
    const configs = manyErrors(101);
    const model = buildWorkspaceModel(GRAPH, configs, '2.11.7', '/repo');

    it('WHEN a warning is added THEN it counts toward the cap and the overflow line stays last', () => {
      const sortedErrors = manyErrors(99).toReversed();
      const expected = sortedErrors.map((config) => `${config.path}: ${config.error}`);

      const warned = withWarning(model, GRAPH, configs, 'cache: x');

      expect(warned.warnings).toStrictEqual(['cache: x', ...expected, 'warnings: 2 more not shown']);
    });
  });

  describe('GIVEN a model built with one config warning', () => {
    const model = buildWorkspaceModel(GRAPH, [PARSE_ERROR], '2.11.7', '/repo');

    it('WHEN a warning holding a newline is added THEN it is made plain and sorted with the config one', () => {
      const warned = withWarning(model, GRAPH, [PARSE_ERROR], 'cache: a\nb');

      expect(warned.warnings).toStrictEqual(['cache: ab', 'packages/a/turbo.jsonc: InvalidSymbol at 3']);
    });

    it('WHEN a warning is added THEN every other field is unchanged', () => {
      const warned = withWarning(model, GRAPH, [PARSE_ERROR], 'cache: x');

      const rest = { ...warned, warnings: model.warnings };

      expect(rest).toStrictEqual(model);
    });
  });
});
