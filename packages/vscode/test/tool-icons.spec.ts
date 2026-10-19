import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';
import { object, record, string, unknown } from 'zod/mini';

import { TOOLS } from '../src/tool/common/tool.const.ts';
import type { ToolSpec } from '../src/tool/common/tool.type.ts';

const FONT_PATH = './dist/webview/details/tool-icons.ttf';

const manifestSchema = object({ contributes: object({ icons: record(string(), unknown()) }) });

const MANIFEST_TEXT = readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8');

const { icons: ICONS } = manifestSchema.parse(JSON.parse(MANIFEST_TEXT)).contributes;

const entryOf = (tool: ToolSpec): [string, unknown][] => {
  if (tool.glyph === null) return [];

  const fontCharacter = `\\${tool.glyph.char.toString(16).toUpperCase()}`;
  const location = { fontPath: FONT_PATH, fontCharacter };
  const definition = { description: tool.title, default: location };

  return [[`${TOOL_ICON_PREFIX}${tool.id}`, definition]];
};

const EXPECTED_ENTRIES = TOOLS.flatMap(entryOf);

describe('FEATURE: contributes.icons', () => {
  describe('GIVEN the tool table', () => {
    it('WHEN the manifest icons are read THEN they equal one entry per glyph tool', () => {
      const expected = Object.fromEntries(EXPECTED_ENTRIES);

      expect(ICONS).toStrictEqual(expected);
    });

    it('WHEN the manifest icon ids are read THEN they follow the table order', () => {
      const expectedIds = EXPECTED_ENTRIES.map(([id]) => id);

      expect(Object.keys(ICONS)).toStrictEqual(expectedIds);
    });
  });
});
