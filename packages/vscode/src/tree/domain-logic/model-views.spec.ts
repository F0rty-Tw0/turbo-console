import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { ModelViews } from './model-views.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewOf } from '../utils/model-view.util.ts';

describe('FEATURE: model views per model', () => {
  describe('GIVEN a model', () => {
    let views: ModelViews;

    beforeEach(() => {
      views = new ModelViews();
    });

    it('WHEN its view is asked for THEN it is the view of that model', () => {
      const view = views.of(WORKSPACE_MODEL_STUB);

      expect(view).toStrictEqual(modelViewOf(WORKSPACE_MODEL_STUB));
    });

    it('WHEN its view is asked for twice THEN both answers are the same object', () => {
      const first = views.of(WORKSPACE_MODEL_STUB);
      const second = views.of(WORKSPACE_MODEL_STUB);

      expect(second).toBe(first);
    });

    it('WHEN another model object is asked for THEN it gets its own view', () => {
      const other: WorkspaceModel = { ...WORKSPACE_MODEL_STUB };
      const first = views.of(WORKSPACE_MODEL_STUB);
      const second = views.of(other);

      expect(second).not.toBe(first);
    });
  });
});
