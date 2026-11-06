import { describe, expect, it } from 'vitest';

import { importsOf } from './imports-of.util.ts';
import type { SourceImport } from '../common/import-scan.type.ts';
import { BOM_CODE, SOURCE_LINE_MAX } from '../common/source-text.const.ts';
import { GENERATED_BLOCK_IMPORTS } from '../test/common/generated-source.const.ts';
import { generatedBlocksOf, generatedSourceOf } from '../test/utils/generated-source.spec.util.ts';

const MIB = 1_048_576;

const staticOf = (specifier: string, line: number, text: string): SourceImport => {
  const site: SourceImport = { specifier, kind: 'static', isType: false, line, text };

  return site;
};

const importA = "import a from 'A';";
const importB = "import b from 'B';";

describe('FEATURE: finding import forms across lexer edges', () => {
  describe('GIVEN a quote or slash that could derail the lexer before an import', () => {
    it.each([
      ['a regex holding a quote', `const r = /'/;\n${importA}`],
      ['a division after a paren', `const n = (a) / 2;\n${importA}`],
      ['a JSX text holding an apostrophe', `const el = <p>Don't</p>;\n${importA}`]
    ])('WHEN %s precedes the import THEN one static site is found on line 1', (_name, source) => {
      expect(importsOf(source)).toStrictEqual([staticOf('A', 1, importA)]);
    });

    it('WHEN a regex follows a closing brace THEN one static site is found on line 2', () => {
      const source = `if (x) {}\n/'/.test(s);\n${importA}`;

      expect(importsOf(source)).toStrictEqual([staticOf('A', 2, importA)]);
    });

    it('WHEN a template substitution holds import() THEN one dynamic site is found on line 0', () => {
      const source = "const t = `x ${import('S')} y`;";

      const expected: SourceImport = { specifier: 'S', kind: 'dynamic', isType: false, line: 0, text: source };

      expect(importsOf(source)).toStrictEqual([expected]);
    });
  });

  describe('GIVEN line breaks and a leading mark', () => {
    it.each([
      ['CRLF', '\r\n'],
      ['a lone CR', '\r']
    ])('WHEN lines are split by %s THEN lines are 0 and 1 and texts have no CR', (_name, breaker) => {
      const source = `${importA}${breaker}${importB}`;

      expect(importsOf(source)).toStrictEqual([staticOf('A', 0, importA), staticOf('B', 1, importB)]);
    });

    it('WHEN the source starts with a BOM THEN the site is on line 0 and its text has no BOM', () => {
      const source = `${String.fromCodePoint(BOM_CODE)}${importA}`;

      expect(importsOf(source)).toStrictEqual([staticOf('A', 0, importA)]);
    });

    it('WHEN the source starts with a hashbang THEN one site is found on line 1', () => {
      const source = `#!/usr/bin/env node\n${importA}`;

      expect(importsOf(source)).toStrictEqual([staticOf('A', 1, importA)]);
    });
  });

  describe('GIVEN an import that spans or shares lines', () => {
    it('WHEN a named import spans lines THEN the site is on line 0 with text of its first line', () => {
      const source = "import {\n  a,\n  b,\n} from 'A';";

      expect(importsOf(source)).toStrictEqual([staticOf('A', 0, 'import {')]);
    });

    it('WHEN two forms share a line THEN both sites are on line 0 in order', () => {
      const source = `${importA} ${importB}`;

      expect(importsOf(source)).toStrictEqual([staticOf('A', 0, source), staticOf('B', 0, source)]);
    });

    it('WHEN the line is longer than the cap THEN the text is cut to the cap', () => {
      const source = `${importA} //${'x'.repeat(1200)}`;

      const sites = importsOf(source);

      expect(sites.map((site) => site.text.length)).toStrictEqual([SOURCE_LINE_MAX]);
    });
  });

  describe('GIVEN a generated 1 MiB source', () => {
    const sites = importsOf(generatedSourceOf(MIB));

    it('WHEN it is scanned THEN every block yields its counted forms', () => {
      expect(sites).toHaveLength(generatedBlocksOf(MIB) * GENERATED_BLOCK_IMPORTS);
    });

    it('WHEN it is scanned THEN each site specifier names the block its position falls in', () => {
      const wrongSites = sites.filter((site, position) => {
        const block = Math.floor(position / GENERATED_BLOCK_IMPORTS);
        const expected = new RegExp(`^@acme/lib/b${block}(/|$)`);

        return !expected.test(site.specifier);
      });

      expect(wrongSites).toStrictEqual([]);
    });
  });
});
