import { beforeAll, describe, expect, it } from 'vitest';

import { importsOf } from './imports-of.util.ts';
import type { SourceImport } from '../common/import-scan.type.ts';
import { BOM_CODE, SOURCE_LINE_MAX } from '../common/source-text.const.ts';
import { GENERATED_BLOCK_IMPORTS } from '../test/common/generated-source.const.ts';
import { ONE_MIB } from '../test/common/source-size.const.ts';
import { SOURCE_IMPORT_STUB } from '../test/stubs/import-scan.stub.ts';
import { generatedBlocksOf, generatedSourceOf } from '../test/utils/generated-source.spec.util.ts';

type Kind = SourceImport['kind'];

type SitePlace = Partial<Pick<SourceImport, 'line' | 'specifier'>>;

const siteOf = (kind: Kind, isType: boolean, text: string, place: SitePlace = {}): SourceImport => {
  const site: SourceImport = { ...SOURCE_IMPORT_STUB, kind, isType, text, ...place };

  return site;
};

const staticOf = (specifier: string, line: number, text: string): SourceImport => siteOf('static', false, text, { specifier, line });

const rowsOf = (kind: Kind, isType: boolean, texts: string[]): [string, SourceImport[]][] =>
  texts.map((text) => [text, [siteOf(kind, isType, text)]]);

const noFormRows = (texts: string[]): [string, SourceImport[]][] => texts.map((text) => [text, []]);

const isOutsideItsBlock = (site: SourceImport, position: number): boolean => {
  const block = Math.floor(position / GENERATED_BLOCK_IMPORTS);
  const blockPattern = new RegExp(`^@acme/lib/b${block}(/|$)`);

  return !blockPattern.test(site.specifier);
};

const importA = "import a from 'A';";
const importB = "import b from 'B';";

describe('FEATURE: finding import forms in a source', () => {
  describe('GIVEN a static import', () => {
    const plainRows = rowsOf('static', false, [
      "import x from 'S'",
      "import {a} from 'S'",
      "import * as n from 'S'",
      "import x, {a} from 'S'",
      "import 'S'",
      "import {type A, b} from 'S'",
      "import x, {type A} from 'S'",
      "import type from 'S'",
      "import {} from 'S'"
    ]);
    const typeRows = rowsOf('static', true, [
      "import type {A} from 'S'",
      "import type A from 'S'",
      "import {type A, type B} from 'S'"
    ]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the sites are %j', (source, expected) => {
      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });
  });

  describe('GIVEN a re-export', () => {
    const plainRows = rowsOf('reexport', false, [
      "export {a} from 'S'",
      "export * from 'S'",
      "export * as n from 'S'",
      "export {type A, b} from 'S'",
      "export {} from 'S'"
    ]);
    const typeRows = rowsOf('reexport', true, [
      "export type {A} from 'S'",
      "export type * from 'S'",
      "export type * as n from 'S'",
      "export {type A, type B} from 'S'"
    ]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the sites are %j', (source, expected) => {
      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });
  });

  describe('GIVEN a dynamic import', () => {
    const plainRows = rowsOf('dynamic', false, [
      "import('S')",
      'import(`S`)',
      "import('S', { with: { type: 'json' } })",
      "await import('S')",
      "let x: import('S').T"
    ]);
    const typeRows = rowsOf('dynamic', true, ["type T = typeof import('S')", "type T = typeof import('S').T"]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the sites are %j', (source, expected) => {
      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it("WHEN typeof import('S') spans lines THEN the line is the import keyword's", () => {
      const source = "type T = typeof\n  import('S')";
      const expected = [siteOf('dynamic', true, "  import('S')", { line: 1 })];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });
  });

  describe('GIVEN a require form', () => {
    const plainRows = rowsOf('require', false, [
      "require('S')",
      "import x = require('S')",
      "export import x = require('S')",
      "[...require('S')]"
    ]);
    const typeRows = rowsOf('require', true, ["import type x = require('S')"]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the sites are %j', (source, expected) => {
      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });
  });

  describe('GIVEN text that is no import form', () => {
    const rows = noFormRows([
      "declare module 'S' {}",
      '/// <reference types="S" />',
      "vi.mock('S')",
      "jest.mock('S')",
      "require.resolve('S')",
      "new URL('S', import.meta.url)",
      'import(variable)',
      'import(`${x}`)',
      "// import 'S'",
      '"import \'S\'"',
      "`import 'S'`",
      "foo.require('S')",
      "x.import('S')",
      "x?.import('S')",
      'export const a = 1',
      'import x from variable'
    ]);

    it.each(rows)('WHEN %j is scanned THEN the sites are %j', (source, expected) => {
      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });
  });

  describe('GIVEN a source with several forms', () => {
    it('WHEN it spans lines THEN each site carries its own line and text in text order', () => {
      const source = "import a from 'A'\nconst b = 1\nexport * from 'B'\r\nconst c = require('C')";
      const expected = [
        staticOf('A', 0, "import a from 'A'"),
        siteOf('reexport', false, "export * from 'B'", { specifier: 'B', line: 2 }),
        siteOf('require', false, "const c = require('C')", { specifier: 'C', line: 3 })
      ];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN a dynamic import follows an import statement THEN both are found', () => {
      const source = "import a from 'A'; import('B')";

      const specifiers = importsOf(source).map((site) => site.specifier);

      expect(specifiers).toStrictEqual(['A', 'B']);
    });
  });

  describe('GIVEN a lexer edge around an import', () => {
    it.each([
      ['a regex holding a quote', `const r = /'/;\n${importA}`],
      ['a division after a paren', `const n = (a) / 2;\n${importA}`],
      ['a JSX text holding an apostrophe', `const el = <p>Don't</p>;\n${importA}`]
    ])('WHEN %s precedes the import THEN one static site is found on line 1', (_name, source) => {
      const expected = [staticOf('A', 1, importA)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN a regex follows a closing brace THEN one static site is found on line 2', () => {
      const source = `if (x) {}\n/'/.test(s);\n${importA}`;
      const expected = [staticOf('A', 2, importA)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN a template substitution holds import() THEN one dynamic site is found on line 0', () => {
      const source = "const t = `x ${import('S')} y`;";
      const expected = [siteOf('dynamic', false, source)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it.each([
      ['CRLF', '\r\n'],
      ['a lone CR', '\r']
    ])('WHEN lines are split by %s THEN lines are 0 and 1 and texts have no CR', (_name, breaker) => {
      const source = `${importA}${breaker}${importB}`;
      const expected = [staticOf('A', 0, importA), staticOf('B', 1, importB)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN the source starts with a BOM THEN the site is on line 0 and its text has no BOM', () => {
      const source = `${String.fromCodePoint(BOM_CODE)}${importA}`;
      const expected = [staticOf('A', 0, importA)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN the source starts with a hashbang THEN one site is found on line 1', () => {
      const source = `#!/usr/bin/env node\n${importA}`;
      const expected = [staticOf('A', 1, importA)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN a named import spans lines THEN the site is on line 0 with text of its first line', () => {
      const source = "import {\n  a,\n  b,\n} from 'A';";
      const expected = [staticOf('A', 0, 'import {')];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN two forms share a line THEN both sites are on line 0 in order', () => {
      const source = `${importA} ${importB}`;
      const expected = [staticOf('A', 0, source), staticOf('B', 0, source)];

      const sites = importsOf(source);

      expect(sites).toStrictEqual(expected);
    });

    it('WHEN the line is longer than the cap THEN the text is cut to the cap', () => {
      const source = `${importA} //${'x'.repeat(1200)}`;

      const textLengths = importsOf(source).map((site) => site.text.length);

      expect(textLengths).toStrictEqual([SOURCE_LINE_MAX]);
    });
  });

  describe('GIVEN a generated 1 MiB source', () => {
    let sites: SourceImport[] = [];

    beforeAll(() => {
      sites = importsOf(generatedSourceOf(ONE_MIB));
    });

    it('WHEN it is scanned THEN every block yields its counted forms', () => {
      const expected = generatedBlocksOf(ONE_MIB) * GENERATED_BLOCK_IMPORTS;

      expect(sites).toHaveLength(expected);
    });

    it('WHEN it is scanned THEN each site specifier names the block its position falls in', () => {
      const wrongSites = sites.filter(isOutsideItsBlock);

      expect(wrongSites).toStrictEqual([]);
    });
  });
});
