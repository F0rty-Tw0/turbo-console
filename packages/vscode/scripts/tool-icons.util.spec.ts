import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';
import { afterEach, describe, expect, it } from 'vitest';

import { MIT_LICENSE_TEXT } from './mit-license.const.ts';
import {
  createdOf,
  glyphIdOf,
  glyphLengthOf,
  glyphXMaxOf,
  glyphYMaxOf,
  modifiedOf,
  numGlyphsOf,
  unitsPerEmOf,
  viewOf
} from './test/utils/sfnt.spec.util.ts';
import { iconsOf, packageRootOf, versionOf } from './tool-icons-source.util.ts';
import { GLYPH_PADDING, buildToolIcons, paddedSvg } from './tool-icons.util.ts';
import { TOOLS } from '../src/tool/common/tool.const.ts';
import type { ToolGlyph, ToolSpec } from '../src/tool/common/tool.type.ts';

const FILE_NAMES = [
  'SIMPLE-ICONS-DISCLAIMER.md',
  'SIMPLE-ICONS-LICENSE.md',
  'TOOL-ICONS-NOTICE.md',
  'tool-icons.css',
  'tool-icons.ttf'
];
const UNIX_EPOCH_SINCE_1904 = 2082844800n;
const TRADEMARK_LINE =
  'All product names, logos and brands are property of their respective owners. Their use here identifies the tool a task runs and does not imply endorsement.';
const ANGULAR_ATTRIBUTION =
  '"Angular" logo by Google, from https://angular.dev/press-kit (via Simple Icons), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: single-colour version, converted to a font glyph.';
const STORYBOOK_ATTRIBUTION = '"Storybook" logo, Copyright (c) 2017 Storybooks (https://github.com/storybookjs/brand), MIT License';
const GLYPHS = TOOLS.map((tool) => tool.glyph).filter((glyph): glyph is ToolGlyph => glyph !== null);
const GLYPH_TOOLS = TOOLS.filter((tool) => tool.glyph !== null);
const PACKAGE_ROOT = packageRootOf();
const ICONS = await iconsOf();
const VITEST_SVG = await readFile(fileURLToPath(import.meta.resolve('simple-icons/icons/vitest.svg')), 'utf8');

const slugOf = (tool: ToolSpec): string => tool.glyph?.slug ?? '';

const sourceOf = (slug: string): string => ICONS.get(slug)?.source ?? '';

const missingFrom = (notice: string, tool: ToolSpec): string[] => {
  const slug = slugOf(tool);
  const texts = [tool.title, slug, sourceOf(slug)];
  const absent = texts.filter((text) => !notice.includes(text));

  return absent.map((text) => `${tool.id}: ${text}`);
};

const scratchDirs: string[] = [];

const freshDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'tc-tool-icons-'));

  scratchDirs.push(dir);

  return dir;
};

const builtDir = async (): Promise<string> => {
  const dir = await freshDir();

  await buildToolIcons(TOOLS, dir);

  return dir;
};

const ttfOf = async (dir: string): Promise<DataView> => {
  const bytes = await readFile(join(dir, 'tool-icons.ttf'));

  return viewOf(bytes);
};

const rowOf = (id: string, glyph: ToolGlyph): ToolSpec => {
  const row: ToolSpec = { id, title: id, bins: [id], glyph };

  return row;
};

const seededDir = async (): Promise<string> => {
  const dir = await freshDir();

  await writeFile(join(dir, 'sentinel'), 'kept');

  return dir;
};

const failureOf = async (row: ToolSpec): Promise<[unknown, string[]]> => {
  const dir = await seededDir();
  const failure = await buildToolIcons([row], dir).catch((error: unknown) => error);
  const files = await readdir(dir);

  return [failure, files];
};

afterEach(async () => {
  await Promise.all(scratchDirs.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe('FEATURE: buildToolIcons', () => {
  describe('GIVEN the real tool table', () => {
    it('WHEN it builds THEN the directory holds exactly the five files', async () => {
      const dir = await builtDir();

      const files = await readdir(dir);

      expect(files.toSorted()).toStrictEqual(FILE_NAMES);
    });

    it('WHEN the TTF is read THEN it has 1000 units per em and at least 18 glyphs', async () => {
      const view = await ttfOf(await builtDir());

      expect(unitsPerEmOf(view)).toBe(1000);
      expect(numGlyphsOf(view)).toBeGreaterThanOrEqual(18);
    });

    it('WHEN each code point is looked up in the cmap THEN it maps to a glyph with an outline', async () => {
      const view = await ttfOf(await builtDir());

      const ids = GLYPHS.map((glyph) => glyphIdOf(view, glyph.char));
      const lengths = ids.map((id) => glyphLengthOf(view, id));

      expect(ids.every((id) => id !== 0)).toBe(true);
      expect(lengths.every((length) => length > 0)).toBe(true);
    });

    it('WHEN the 18 code points are looked up THEN they map to 18 distinct glyphs', async () => {
      const view = await ttfOf(await builtDir());

      const ids = GLYPHS.map((glyph) => glyphIdOf(view, glyph.char));

      expect(GLYPHS).toHaveLength(18);
      expect(new Set(ids).size).toBe(18);
    });

    it('WHEN the glyph headers are read THEN no glyph reaches the padded edge of the em', async () => {
      const view = await ttfOf(await builtDir());
      const inset = (1000 * GLYPH_PADDING) / (24 + 2 * GLYPH_PADDING);

      const ids = GLYPHS.map((glyph) => glyphIdOf(view, glyph.char));
      const extents = ids.flatMap((id) => [glyphXMaxOf(view, id), glyphYMaxOf(view, id)]);

      expect(Math.max(...extents)).toBeLessThan(1000 - inset / 2);
    });

    it('WHEN the head table is read THEN created and modified are the Unix epoch', async () => {
      const view = await ttfOf(await builtDir());

      expect(createdOf(view)).toBe(UNIX_EPOCH_SINCE_1904);
      expect(modifiedOf(view)).toBe(UNIX_EPOCH_SINCE_1904);
    });

    it('WHEN it builds twice THEN the two TTFs are byte-identical', async () => {
      const first = await readFile(join(await builtDir(), 'tool-icons.ttf'));
      const second = await readFile(join(await builtDir(), 'tool-icons.ttf'));

      expect(Buffer.compare(first, second)).toBe(0);
    });

    it('WHEN the CSS is read THEN it has one font-face and one rule per glyph with its code point', async () => {
      const css = await readFile(join(await builtDir(), 'tool-icons.css'), 'utf8');

      const faces = css.match(/@font-face/g) ?? [];
      const rules = GLYPH_TOOLS.map((tool) => `.codicon-${TOOL_ICON_PREFIX}${tool.id}:before {`);
      const contents = GLYPHS.map((glyph) => `content: '\\${glyph.char.toString(16)}';`);

      expect(faces).toHaveLength(1);
      expect(css).toContain("src: url('tool-icons.ttf') format('truetype');");
      expect(rules.every((rule) => css.includes(rule))).toBe(true);
      expect(contents.every((content) => css.includes(content))).toBe(true);
      expect(css.match(/:before \{/g)).toHaveLength(18);
    });
  });

  describe('GIVEN the notice of the real tool table', () => {
    it('WHEN it is read THEN it names the installed Simple Icons version and the two credited licences', async () => {
      const notice = await readFile(join(await builtDir(), 'TOOL-ICONS-NOTICE.md'), 'utf8');
      const version = await versionOf(PACKAGE_ROOT);

      expect(notice).toContain(`built from Simple Icons ${version} (CC0-1.0`);
      expect(notice).toContain('Licence: CC-BY-4.0');
      expect(notice).toContain('Licence: MIT');
    });

    it('WHEN it is read THEN every glyph tool is named with its slug and source', async () => {
      const notice = await readFile(join(await builtDir(), 'TOOL-ICONS-NOTICE.md'), 'utf8');

      const missing = GLYPH_TOOLS.flatMap((tool) => missingFrom(notice, tool));

      expect(missing).toStrictEqual([]);
    });

    it('WHEN it is read THEN it holds both attributions, the MIT text once after Storybook and the trademark line', async () => {
      const notice = await readFile(join(await builtDir(), 'TOOL-ICONS-NOTICE.md'), 'utf8');

      expect(notice).toContain(ANGULAR_ATTRIBUTION);
      expect(notice).toContain(STORYBOOK_ATTRIBUTION);
      expect(notice.split(MIT_LICENSE_TEXT)).toHaveLength(2);
      expect(notice.indexOf(MIT_LICENSE_TEXT)).toBeGreaterThan(notice.indexOf(STORYBOOK_ATTRIBUTION));
      expect(notice).toContain(TRADEMARK_LINE);
    });

    it('WHEN the licence files are read THEN they are byte-equal to the package copies', async () => {
      const dir = await builtDir();

      const license = await readFile(join(dir, 'SIMPLE-ICONS-LICENSE.md'));
      const disclaimer = await readFile(join(dir, 'SIMPLE-ICONS-DISCLAIMER.md'));

      expect(license.equals(await readFile(join(PACKAGE_ROOT, 'LICENSE.md')))).toBe(true);
      expect(disclaimer.equals(await readFile(join(PACKAGE_ROOT, 'DISCLAIMER.md')))).toBe(true);
    });
  });

  describe('GIVEN a row the build must refuse', () => {
    it('WHEN the slug is not an icon THEN it rejects naming the tool and writes nothing', async () => {
      const row = rowOf('ghost', { slug: 'no-such-icon-x', char: 0xe0f0, attribution: null });

      const [failure, files] = await failureOf(row);

      expect(failure).toStrictEqual(new Error('ghost: icon no-such-icon-x is missing from Simple Icons'));
      expect(files).toStrictEqual(['sentinel']);
    });

    it('WHEN the icon licence is not allowed THEN it rejects naming the licence and writes nothing', async () => {
      const row = rowOf('vue', { slug: 'vuedotjs', char: 0xe0f1, attribution: null });

      const [failure, files] = await failureOf(row);

      expect(failure).toStrictEqual(new Error('vue: licence CC-BY-NC-SA-4.0 is not allowed'));
      expect(files).toStrictEqual(['sentinel']);
    });

    it('WHEN a CC-BY icon has no attribution THEN it rejects naming the attribution and writes nothing', async () => {
      const row = rowOf('angular', { slug: 'angular', char: 0xe001, attribution: null });

      const [failure, files] = await failureOf(row);

      expect(failure).toStrictEqual(new Error('angular: licence CC-BY-4.0 needs an attribution'));
      expect(files).toStrictEqual(['sentinel']);
    });
  });
});

describe('FEATURE: paddedSvg', () => {
  describe('GIVEN the real vitest svg', () => {
    it('WHEN it is padded THEN only the viewBox widens by the padding on every side', () => {
      const size = 24 + 2 * GLYPH_PADDING;
      const widened = `viewBox="${-GLYPH_PADDING} ${-GLYPH_PADDING} ${size} ${size}"`;

      const padded = paddedSvg(VITEST_SVG, GLYPH_PADDING);

      expect(padded).toBe(VITEST_SVG.replace('viewBox="0 0 24 24"', widened));
    });
  });

  describe('GIVEN a viewBox other than 0 0 24 24', () => {
    it('WHEN it is padded THEN a 16 by 16 box throws', () => {
      const svg = '<svg viewBox="0 0 16 16"><path d="M0 0"/></svg>';

      expect(() => paddedSvg(svg, GLYPH_PADDING)).toThrow('0 0 24 24');
    });

    it('WHEN it is padded THEN an svg without a viewBox throws', () => {
      const svg = '<svg><path d="M0 0"/></svg>';

      expect(() => paddedSvg(svg, GLYPH_PADDING)).toThrow('0 0 24 24');
    });
  });
});
