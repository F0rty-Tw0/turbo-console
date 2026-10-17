import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { ModelViews } from './model-views.ts';
import type { ToolLookup } from '../../tool/common/tool.type.ts';
import { toolOf } from '../../tool/utils/tool-of.util.ts';
import { toolLookupMock } from '../test/mocks/tool-lookup.mock.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewOf } from '../utils/model-view.util.ts';

const NO_LIVE: ReadonlySet<string> = new Set();

const VITEST_COMMAND = 'vitest run';

const NO_TOOL_COMMAND = 'echo done';

describe('FEATURE: model views per model', () => {
  describe('GIVEN a model', () => {
    let views: ModelViews;

    beforeEach(() => {
      views = new ModelViews(toolOf);
    });

    it('WHEN its view is asked for THEN it is the view of that model', () => {
      const view = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);

      expect(view).toStrictEqual(modelViewOf(WORKSPACE_MODEL_STUB, false, NO_LIVE));
    });

    it('WHEN its view is asked for twice THEN both answers are the same object', () => {
      const first = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);
      const second = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);

      expect(second).toBe(first);
    });

    it('WHEN another model object is asked for THEN it gets its own view', () => {
      const other: WorkspaceModel = { ...WORKSPACE_MODEL_STUB };
      const first = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);
      const second = views.of(other, false, NO_LIVE);

      expect(second).not.toBe(first);
    });
  });

  describe('GIVEN a tool lookup', () => {
    let lookup: ToolLookup;
    let views: ModelViews;

    beforeEach(() => {
      lookup = toolLookupMock();
      views = new ModelViews(lookup);
    });

    it('WHEN a command is asked for THEN its tool is the lookup answer', () => {
      const expected = toolOf(VITEST_COMMAND);

      const tool = views.toolOf(VITEST_COMMAND);

      expect(tool).toBe(expected);
    });

    it('WHEN a command with a tool and one without are each asked for twice THEN the lookup runs once per command', () => {
      views.toolOf(VITEST_COMMAND);
      views.toolOf(NO_TOOL_COMMAND);
      views.toolOf(VITEST_COMMAND);
      views.toolOf(NO_TOOL_COMMAND);

      expect(lookup).toHaveBeenCalledTimes(2);
    });

    it('WHEN no command is asked for THEN there is no tool', () => {
      const tool = views.toolOf(null);

      expect(tool).toBeNull();
    });

    it('WHEN no command is asked for THEN the lookup never runs', () => {
      views.toolOf(null);

      expect(lookup).not.toHaveBeenCalled();
    });
  });
});
