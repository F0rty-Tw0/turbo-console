import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { ModelViews } from './model-views.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import type { ModelView } from '../common/model-view.type.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const SCRIPT_ONE: TaskNode = { ...TASK_NODE_STUB, id: 's1#lint', name: 'lint', isTurboTask: false };

const SCRIPT_TWO: TaskNode = { ...TASK_NODE_STUB, id: 's2#lint', name: 'lint', isTurboTask: false };

const SCRIPT_OF_TURBO_PACKAGE: TaskNode = { ...TASK_NODE_STUB, id: 'a#lint', name: 'lint', isTurboTask: false };

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return pkg;
};

const modelOf = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const TURBO = packageOf('a', [TASK_NODE_STUB, SCRIPT_OF_TURBO_PACKAGE]);

const MODEL = modelOf([TURBO, packageOf('s1', [SCRIPT_ONE]), packageOf('s2', [SCRIPT_TWO])]);

const namesOf = (view: ModelView): string[] => Array.from(view.packages.keys());

const live = (...ids: string[]): ReadonlySet<string> => new Set(ids);

describe('FEATURE: model views with scripts', () => {
  let views: ModelViews;

  beforeEach(() => {
    views = new ModelViews(resolveTool);
  });

  describe('GIVEN a model with scripts-only packages', () => {
    it('WHEN scripts are shown and hidden THEN each has its own view of the model', () => {
      const shown = views.of(MODEL, true, live());
      const hidden = views.of(MODEL, false, live());

      expect(namesOf(shown)).toStrictEqual(['a', 's1', 's2']);
      expect(namesOf(hidden)).toStrictEqual(['a']);
    });

    it('WHEN both are asked again THEN each answer is the same object', () => {
      const shown = views.of(MODEL, true, live());
      const hidden = views.of(MODEL, false, live());

      expect(views.of(MODEL, true, live())).toBe(shown);
      expect(views.of(MODEL, false, live())).toBe(hidden);
    });

    it('WHEN scripts are shown THEN live ids do not change the view', () => {
      const shown = views.of(MODEL, true, live());

      expect(views.of(MODEL, true, live('s1#lint'))).toBe(shown);
    });
  });

  describe('GIVEN scripts are hidden', () => {
    it('WHEN a script of a scripts-only package is live THEN the package is shown', () => {
      const view = views.of(MODEL, false, live('s1#lint'));

      expect(namesOf(view)).toStrictEqual(['a', 's1']);
    });

    it('WHEN the live set is empty again THEN the package is dropped', () => {
      views.of(MODEL, false, live('s1#lint'));

      const view = views.of(MODEL, false, live());

      expect(namesOf(view)).toStrictEqual(['a']);
    });

    it('WHEN the same key is asked again THEN the view is the same object', () => {
      const first = views.of(MODEL, false, live('s1#lint'));

      expect(views.of(MODEL, false, live('s1#lint'))).toBe(first);
    });

    it('WHEN a new set holds the same relevant ids in another order THEN it is a hit', () => {
      const first = views.of(MODEL, false, live('s2#lint', 's1#lint'));

      expect(views.of(MODEL, false, live('s1#lint', 's2#lint'))).toBe(first);
    });

    it('WHEN many live sets are asked THEN the packages of the model are read once for the key', () => {
      let reads = 0;
      const counted: WorkspaceModel = {
        ...MODEL,
        get packages(): PackageNode[] {
          reads += 1;

          return MODEL.packages;
        }
      };

      views.of(counted, false, live('s1#lint'));

      const afterFirst = reads;

      views.of(counted, false, live('s1#lint', 'gone#lint'));
      views.of(counted, false, live('s1#lint', 'other#lint'));

      expect(reads).toBe(afterFirst);
    });

    it('WHEN a live id belongs to a package with turbo tasks THEN the view is the hidden one', () => {
      const hidden = views.of(MODEL, false, live());

      expect(views.of(MODEL, false, live('a#lint'))).toBe(hidden);
    });

    it('WHEN a live id belongs to no package THEN the view is the hidden one', () => {
      const hidden = views.of(MODEL, false, live());

      expect(views.of(MODEL, false, live('gone#lint'))).toBe(hidden);
    });

    it('WHEN another live key comes THEN it replaces the earlier one', () => {
      const first = views.of(MODEL, false, live('s1#lint'));

      views.of(MODEL, false, live('s2#lint'));

      expect(views.of(MODEL, false, live('s1#lint'))).not.toBe(first);
    });

    it('WHEN another live key came and went THEN the hidden and shown views stay cached', () => {
      const hidden = views.of(MODEL, false, live());
      const shown = views.of(MODEL, true, live());

      views.of(MODEL, false, live('s1#lint'));
      views.of(MODEL, false, live('s2#lint'));

      expect(views.of(MODEL, false, live())).toBe(hidden);
      expect(views.of(MODEL, true, live())).toBe(shown);
    });
  });

  describe('GIVEN a scoped package whose bare label collides with a scripts-only package', () => {
    const scoped = packageOf('@acme/utils', [TASK_NODE_STUB]);
    const collision = modelOf([scoped, packageOf('utils', [SCRIPT_ONE])]);

    it('WHEN scripts are hidden THEN the scoped one reads its bare label', () => {
      const view = views.of(collision, false, live());

      expect(view.bareTexts.get('@acme/utils')).toBe('utils');
    });

    it('WHEN scripts are shown THEN the scoped one keeps its full name', () => {
      const view = views.of(collision, true, live());

      expect(view.bareTexts.get('@acme/utils')).toBe('@acme/utils');
    });
  });
});
