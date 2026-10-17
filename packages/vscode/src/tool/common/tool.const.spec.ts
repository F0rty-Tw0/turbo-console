import { ICON_ID_PATTERN, TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { TOOLS, TOOL_BY_BIN } from './tool.const.ts';

const GLYPH_CHARS: [string, number][] = [
  ['angular', 0xe001],
  ['astro', 0xe002],
  ['biome', 0xe003],
  ['cypress', 0xe004],
  ['docker', 0xe005],
  ['esbuild', 0xe006],
  ['eslint', 0xe007],
  ['jest', 0xe008],
  ['mocha', 0xe009],
  ['next', 0xe00a],
  ['nuxt', 0xe00b],
  ['prettier', 0xe00c],
  ['rollup', 0xe00d],
  ['storybook', 0xe00e],
  ['svelte', 0xe00f],
  ['typescript', 0xe010],
  ['vite', 0xe011],
  ['vitest', 0xe012]
];

const GLYPH_SLUGS: [string, string][] = [
  ['angular', 'angular'],
  ['astro', 'astro'],
  ['biome', 'biome'],
  ['cypress', 'cypress'],
  ['docker', 'docker'],
  ['esbuild', 'esbuild'],
  ['eslint', 'eslint'],
  ['jest', 'jest'],
  ['mocha', 'mocha'],
  ['next', 'nextdotjs'],
  ['nuxt', 'nuxt'],
  ['prettier', 'prettier'],
  ['rollup', 'rollupdotjs'],
  ['storybook', 'storybook'],
  ['svelte', 'svelte'],
  ['typescript', 'typescript'],
  ['vite', 'vite'],
  ['vitest', 'vitest']
];

const ANGULAR_ATTRIBUTION =
  '"Angular" logo by Google, from https://angular.dev/press-kit (via Simple Icons), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: single-colour version, converted to a font glyph.';
const STORYBOOK_ATTRIBUTION = '"Storybook" logo, Copyright (c) 2017 Storybooks (https://github.com/storybookjs/brand), MIT License';

describe('FEATURE: tool table', () => {
  describe('GIVEN the table rows', () => {
    it('WHEN the ids are read THEN there are 19 unique ids', () => {
      const ids = TOOLS.map((tool) => tool.id);

      expect(ids).toHaveLength(19);
      expect(new Set(ids).size).toBe(19);
    });

    it('WHEN the bins are read THEN each is lower-case and none repeats across the table', () => {
      const bins = TOOLS.flatMap((tool) => tool.bins);

      expect(bins.every((bin) => bin === bin.toLowerCase())).toBe(true);
      expect(new Set(bins).size).toBe(bins.length);
    });

    it('WHEN the glyph code points are read THEN id and char match the pinned append-only list', () => {
      const glyphTools = TOOLS.filter((tool) => tool.glyph !== null);
      const chars = glyphTools.map((tool) => [tool.id, tool.glyph?.char]);

      expect(chars).toStrictEqual(GLYPH_CHARS);
    });

    it('WHEN the glyph slugs are read THEN id and slug match the pinned list', () => {
      const glyphTools = TOOLS.filter((tool) => tool.glyph !== null);
      const slugs = glyphTools.map((tool) => [tool.id, tool.glyph?.slug]);

      expect(slugs).toStrictEqual(GLYPH_SLUGS);
    });

    it('WHEN playwright is read THEN it has no glyph', () => {
      const playwright = TOOLS.find((tool) => tool.id === 'playwright');

      expect(playwright).toMatchObject({ title: 'Playwright', bins: ['playwright'], glyph: null });
    });

    it('WHEN the attributions are read THEN only angular and storybook carry the pinned text', () => {
      const pairs = TOOLS.map((tool) => [tool.id, tool.glyph?.attribution]);
      const attributions = pairs.filter(([, text]) => typeof text === 'string');

      expect(attributions).toStrictEqual([
        ['angular', ANGULAR_ATTRIBUTION],
        ['storybook', STORYBOOK_ATTRIBUTION]
      ]);
    });

    it('WHEN each glyph id is prefixed THEN it matches the webview icon-id pattern', () => {
      const ids = TOOLS.filter((tool) => tool.glyph !== null).map((tool) => TOOL_ICON_PREFIX + tool.id);

      expect(ids).toHaveLength(18);
      expect(ids.every((id) => ICON_ID_PATTERN.test(id))).toBe(true);
    });
  });

  describe('GIVEN the bin lookup', () => {
    it('WHEN it is read THEN it holds every bin and maps each to its row', () => {
      const binTotal = TOOLS.reduce((total, tool) => total + tool.bins.length, 0);

      expect(TOOL_BY_BIN.size).toBe(binTotal);
      expect(binTotal).toBe(25);
      TOOLS.forEach((tool) => tool.bins.forEach((bin) => expect(TOOL_BY_BIN.get(bin)).toBe(tool)));
    });
  });
});
