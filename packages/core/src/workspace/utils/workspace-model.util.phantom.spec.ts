import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel } from './workspace-model.util.ts';
import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import type { WorkspaceModel } from '../common/workspace-model.type.ts';
import { MODEL_SOURCE_STUB } from '../test/stubs/model-source.stub.ts';
import { configOf } from '../test/utils/config-ok.spec.util.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';
import { taskOf } from '../test/utils/model-task.spec.util.ts';

const COMMAND = 'node -e 0';

const PKG_B = graphPackage(
  'b',
  'packages/b',
  [],
  [graphTask('b#build', COMMAND, [], []), graphTask('b#deploy', null, [], ['b#build'])]
);

const build = (aDeploy: string[], root: GraphPackage | null): WorkspaceModel => {
  const pkgA = graphPackage('a', 'packages/a', [], [graphTask('a#deploy', COMMAND, [], aDeploy)]);
  const graph = packageGraph([pkgA, PKG_B], [], root);

  return buildWorkspaceModel(graph, [configOf({ '//#gen': 'defined' })], MODEL_SOURCE_STUB);
};

describe('FEATURE: workspace model phantom pass-through', () => {
  describe('GIVEN a#deploy → b#deploy (phantom) → b#build', () => {
    const model = build(['b#deploy'], null);

    it('WHEN built THEN a#deploy.dependencies is [b#build]', () => {
      expect(taskOf(model, 'a#deploy')?.dependencies).toStrictEqual(['b#build']);
    });

    it('WHEN built THEN b#deploy is no task', () => {
      expect(taskOf(model, 'b#deploy')).toBeUndefined();
    });
  });

  describe('GIVEN a#deploy → //#gen (a root phantom) → b#build', () => {
    const rootGen = graphTask('//#gen', null, [], ['b#build']);
    const root = graphPackage('//', '', [], [rootGen]);
    const model = build(['//#gen'], root);

    it('WHEN built THEN a#deploy.dependencies is [b#build]', () => {
      expect(taskOf(model, 'a#deploy')?.dependencies).toStrictEqual(['b#build']);
    });

    it('WHEN built THEN //#gen is no task of rootPackage', () => {
      expect(model.rootPackage?.tasks).toStrictEqual([]);
    });
  });

  describe('GIVEN a#self → a#p (phantom) → a#self', () => {
    const self = graphTask('a#self', COMMAND, [], ['a#p']);
    const phantom = graphTask('a#p', null, [], ['a#self']);
    const pkg = graphPackage('a', 'packages/a', [], [self, phantom]);
    const model = buildWorkspaceModel(packageGraph([pkg], []), [configOf({})], MODEL_SOURCE_STUB);

    it('WHEN built THEN a#self does not depend on itself', () => {
      expect(taskOf(model, 'a#self')?.dependencies).toStrictEqual([]);
    });
  });

  describe('GIVEN a#deploy → b#deploy (phantom) → //#fmt (a root task)', () => {
    const fmt = graphTask('//#fmt', COMMAND, [], []);
    const root = graphPackage('//', '', [], [fmt]);
    const pkgA = graphPackage('a', 'packages/a', [], [graphTask('a#deploy', COMMAND, [], ['b#deploy'])]);
    const pkgB = graphPackage('b', 'packages/b', [], [graphTask('b#deploy', null, [], ['//#fmt'])]);
    const model = buildWorkspaceModel(packageGraph([pkgA, pkgB], [], root), [configOf({ '//#fmt': 'defined' })], MODEL_SOURCE_STUB);

    it('WHEN built THEN a#deploy.dependencies is [//#fmt]', () => {
      expect(taskOf(model, 'a#deploy')?.dependencies).toStrictEqual(['//#fmt']);
    });
  });
});
