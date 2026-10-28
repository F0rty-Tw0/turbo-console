import { ICON_ID_PATTERN, TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { FALLBACK_TOOL_BY_BIN, TOOLS, TOOL_BY_BIN } from './tool.const.ts';
import type { ToolSpec } from './tool.type.ts';

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
  ['vitest', 0xe012],
  ['node', 0xe013],
  ['npm', 0xe014]
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
  ['vitest', 'vitest'],
  ['node', 'nodedotjs'],
  ['npm', 'npm']
];

const ANGULAR_ATTRIBUTION =
  '"Angular" logo by Google, from https://angular.dev/press-kit (via Simple Icons), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: single-colour version, converted to a font glyph.';
const STORYBOOK_ATTRIBUTION = '"Storybook" logo, Copyright (c) 2017 Storybooks (https://github.com/storybookjs/brand), MIT License';

const CONFIG_FILES: [string, string[]][] = [
  ['angular', ['angular.json']],
  ['astro', ['astro.config.mjs', 'astro.config.ts']],
  ['biome', ['biome.json']],
  ['cypress', ['cypress.config.ts', 'cypress.config.js']],
  ['docker', ['docker-compose.yml', 'compose.yaml', 'dockerfile']],
  ['esbuild', ['esbuild.config.js', 'esbuild.config.mjs', 'esbuild.config.ts']],
  ['eslint', ['eslint.config.js', 'eslint.config.mjs', '.eslintrc.json']],
  ['jest', ['jest.config.ts', 'jest.config.js']],
  ['mocha', ['.mocharc.json']],
  ['next', ['next.config.js', 'next.config.mjs', 'next.config.ts']],
  ['nuxt', ['nuxt.config.ts']],
  ['prettier', ['.prettierrc', 'prettier.config.js']],
  ['rollup', ['rollup.config.js', 'rollup.config.mjs']],
  ['storybook', []],
  ['svelte', ['svelte.config.js']],
  ['typescript', ['tsconfig.json']],
  ['vite', ['vite.config.ts', 'vite.config.js']],
  ['vitest', ['vitest.config.ts', 'vitest.config.js']],
  ['playwright', ['playwright.config.ts', 'playwright.config.js']],
  ['node', []],
  ['npm', []]
];

describe('FEATURE: tool table', () => {
  describe('GIVEN the table rows', () => {
    it('WHEN the ids are read THEN there are 21 unique ids', () => {
      const ids = TOOLS.map((tool) => tool.id);

      expect(ids).toHaveLength(21);
      expect(new Set(ids).size).toBe(21);
    });

    it('WHEN the bins are read THEN each is lower-case letters, digits and dashes, and none repeats across the table', () => {
      const bins = TOOLS.flatMap((tool) => tool.bins);

      expect(bins.every((bin) => /^[a-z0-9-]+$/.test(bin))).toBe(true);
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

    it('WHEN the glyph slugs are read THEN each is lower-case letters and digits only, so it is safe in a package path', () => {
      const glyphTools = TOOLS.filter((tool) => tool.glyph !== null);
      const slugs = glyphTools.map((tool) => tool.glyph?.slug ?? '');
      const unsafe = slugs.filter((slug) => !/^[a-z0-9]+$/.test(slug));

      expect(slugs).toHaveLength(20);
      expect(unsafe).toStrictEqual([]);
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

      expect(ids).toHaveLength(20);
      expect(ids.every((id) => ICON_ID_PATTERN.test(id))).toBe(true);
    });
  });

  describe('GIVEN the config file names', () => {
    it('WHEN every tool is read THEN its configFiles are the pinned names in priority order', () => {
      const pairs = TOOLS.map((tool) => [tool.id, tool.configFiles]);

      expect(pairs).toStrictEqual(CONFIG_FILES);
    });

    it('WHEN the names are read THEN each is lower-case, so it matches a theme key whatever its case', () => {
      const names = TOOLS.flatMap((tool) => tool.configFiles);
      const mixed = names.filter((name) => name !== name.toLowerCase());

      expect(mixed).toStrictEqual([]);
    });
  });

  describe('GIVEN the bin lookups', () => {
    it('WHEN they are read THEN together they hold every bin and map each to its row', () => {
      const binTotal = TOOLS.reduce((total, tool) => total + tool.bins.length, 0);
      const lookupOf = (bin: string): ToolSpec | undefined => TOOL_BY_BIN.get(bin) ?? FALLBACK_TOOL_BY_BIN.get(bin);

      expect(TOOL_BY_BIN.size + FALLBACK_TOOL_BY_BIN.size).toBe(binTotal);
      expect(binTotal).toBe(27);
      TOOLS.forEach((tool) => tool.bins.forEach((bin) => expect(lookupOf(bin)).toBe(tool)));
    });

    it('WHEN the fallback lookup is read THEN it holds only node and npm', () => {
      const entries = [...FALLBACK_TOOL_BY_BIN];
      const fallbacks = entries.map(([bin, tool]) => [bin, tool.id, tool.title]);

      expect(fallbacks).toStrictEqual([
        ['node', 'node', 'Node.js'],
        ['npm', 'npm', 'npm']
      ]);
    });
  });
});
