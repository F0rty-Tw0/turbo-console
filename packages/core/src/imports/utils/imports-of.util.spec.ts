import { describe, expect, it } from 'vitest';

import { importsOf } from './imports-of.util.ts';
import type { SourceImport } from '../common/import-scan.type.ts';

type Kind = SourceImport['kind'];

const siteOf = (kind: Kind, isType: boolean, text: string, line = 0): SourceImport => {
  const site: SourceImport = { specifier: 'S', kind, isType, line, text };

  return site;
};

const rowOf = (kind: Kind, isType: boolean, text: string): [string, string, SourceImport[]] => {
  const sites = [siteOf(kind, isType, text)];

  return [text, text, sites];
};

const staticRows = (isType: boolean, texts: string[]): [string, string, SourceImport[]][] =>
  texts.map((text) => rowOf('static', isType, text));

const reexportRows = (isType: boolean, texts: string[]): [string, string, SourceImport[]][] =>
  texts.map((text) => rowOf('reexport', isType, text));

const dynamicRows = (isType: boolean, texts: string[]): [string, string, SourceImport[]][] =>
  texts.map((text) => rowOf('dynamic', isType, text));

const noFormRows = (texts: string[]): [string, string, SourceImport[]][] => texts.map((text) => [text, text, []]);

describe('FEATURE: finding import forms in a source', () => {
  describe('GIVEN a static import', () => {
    const plainRows = staticRows(false, [
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
    const typeRows = staticRows(true, ["import type {A} from 'S'", "import type A from 'S'", "import {type A, type B} from 'S'"]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the site is %j', (_name, source, expected) => {
      expect(importsOf(source)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a re-export', () => {
    const plainRows = reexportRows(false, [
      "export {a} from 'S'",
      "export * from 'S'",
      "export * as n from 'S'",
      "export {type A, b} from 'S'",
      "export {} from 'S'"
    ]);
    const typeRows = reexportRows(true, [
      "export type {A} from 'S'",
      "export type * from 'S'",
      "export type * as n from 'S'",
      "export {type A, type B} from 'S'"
    ]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the site is %j', (_name, source, expected) => {
      expect(importsOf(source)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a dynamic import', () => {
    const plainRows = dynamicRows(false, [
      "import('S')",
      'import(`S`)',
      "import('S', { with: { type: 'json' } })",
      "await import('S')",
      "let x: import('S').T"
    ]);
    const typeRows = dynamicRows(true, ["type T = typeof import('S')", "type T = typeof import('S').T"]);
    const rows = [...plainRows, ...typeRows];

    it.each(rows)('WHEN %j is scanned THEN the site is %j', (_name, source, expected) => {
      expect(importsOf(source)).toStrictEqual(expected);
    });

    it("WHEN typeof import('S') spans lines THEN the line is the import keyword's", () => {
      const source = "type T = typeof\n  import('S')";

      expect(importsOf(source)).toStrictEqual([siteOf('dynamic', true, "  import('S')", 1)]);
    });
  });

  describe('GIVEN a require form', () => {
    it.each([
      rowOf('require', false, "require('S')"),
      rowOf('require', false, "import x = require('S')"),
      rowOf('require', false, "export import x = require('S')"),
      rowOf('require', false, "[...require('S')]"),
      rowOf('require', true, "import type x = require('S')")
    ])('WHEN %j is scanned THEN the site is %j', (_name, source, expected) => {
      expect(importsOf(source)).toStrictEqual(expected);
    });
  });

  describe('GIVEN text that is no import form', () => {
    it.each(
      noFormRows([
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
      ])
    )('WHEN %j is scanned THEN no site is found', (_name, source, expected) => {
      expect(importsOf(source)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a source with several forms', () => {
    it('WHEN it spans lines THEN each site carries its own line and text in text order', () => {
      const source = "import a from 'A'\nconst b = 1\nexport * from 'B'\r\nconst c = require('C')";

      const sites = importsOf(source);

      const staticSite = siteOf('static', false, "import a from 'A'");
      const reexportSite = siteOf('reexport', false, "export * from 'B'", 2);
      const requireSite = siteOf('require', false, "const c = require('C')", 3);

      expect(sites).toStrictEqual([
        { ...staticSite, specifier: 'A' },
        { ...reexportSite, specifier: 'B' },
        { ...requireSite, specifier: 'C' }
      ]);
    });

    it('WHEN import x = require is scanned THEN its tokens are consumed and one site is found', () => {
      expect(importsOf("import x = require('S')")).toHaveLength(1);
    });

    it('WHEN a dynamic import follows an import statement THEN both are found', () => {
      const source = "import a from 'A'; import('B')";

      const specifiers = importsOf(source).map((site) => site.specifier);

      expect(specifiers).toStrictEqual(['A', 'B']);
    });
  });
});
