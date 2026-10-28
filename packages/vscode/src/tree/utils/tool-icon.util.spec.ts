import { describe, expect, it } from 'vitest';

import { themeFilesOf, toolIcon } from './tool-icon.util.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { TOOL_BY_BIN } from '../../tool/common/tool.const.ts';
import type { ToolMatch } from '../../tool/common/tool.type.ts';
import { CONTINUOUS_IDLE_ICON, IDLE_ICON } from '../common/icon.const.ts';
import type { TaskDisplay } from '../common/tree-row.type.ts';

const IDLE: TaskDisplay = { icon: IDLE_ICON, description: '', contextValue: 'turboTask' };

const matchOf = (bin: string): ToolMatch | null => {
  const tool = TOOL_BY_BIN.get(bin);

  if (tool === undefined) return null;

  const match: ToolMatch = { tool, via: [] };

  return match;
};

describe('FEATURE: tool icon and theme files of a task row', () => {
  describe('GIVEN an idle row on the wrench icon', () => {
    it('WHEN its tool has config files THEN themeFilesOf holds them', () => {
      const themed = themeFilesOf(IDLE, undefined, matchOf('vitest'));

      expect(themed).toStrictEqual({ themeFiles: ['vitest.config.ts', 'vitest.config.js'] });
    });

    it('WHEN its tool has none THEN themeFilesOf is empty', () => {
      const themed = themeFilesOf(IDLE, undefined, matchOf('storybook'));

      expect(themed).toStrictEqual({});
    });

    it('WHEN no tool matched THEN themeFilesOf is empty', () => {
      const themed = themeFilesOf(IDLE, undefined, null);

      expect(themed).toStrictEqual({});
    });

    it('WHEN its tool has a glyph THEN toolIcon is the glyph icon', () => {
      const icon = toolIcon(IDLE, undefined, matchOf('vitest'));

      expect(icon).toStrictEqual({ id: 'turbo-console-vitest', color: null });
    });

    it('WHEN its tool has no glyph THEN toolIcon keeps the wrench', () => {
      const icon = toolIcon(IDLE, undefined, matchOf('playwright'));

      expect(icon).toBe(IDLE_ICON);
    });
  });

  describe('GIVEN a row that is off the idle-wrench rung', () => {
    it('WHEN it has a run entry THEN themeFilesOf is empty and toolIcon keeps the row icon', () => {
      const themed = themeFilesOf(IDLE, RUN_ENTRY_STUB, matchOf('vitest'));
      const icon = toolIcon(IDLE, RUN_ENTRY_STUB, matchOf('vitest'));

      expect(themed).toStrictEqual({});
      expect(icon).toBe(IDLE_ICON);
    });

    it('WHEN it has a kind icon THEN themeFilesOf is empty and toolIcon keeps the kind icon', () => {
      const continuous: TaskDisplay = { ...IDLE, icon: CONTINUOUS_IDLE_ICON };

      const themed = themeFilesOf(continuous, undefined, matchOf('vitest'));
      const icon = toolIcon(continuous, undefined, matchOf('vitest'));

      expect(themed).toStrictEqual({});
      expect(icon).toBe(CONTINUOUS_IDLE_ICON);
    });
  });
});
