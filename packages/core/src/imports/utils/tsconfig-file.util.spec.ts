import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extendedPathsOf, tsconfigFileOf } from './tsconfig-file.util.ts';
import type { TsconfigFile } from '../common/tsconfig.type.ts';

type FileRow = {
  readonly label: string;
  readonly text: string;
  readonly expected: TsconfigFile | null;
};

type ExtendedRow = {
  readonly label: string;
  readonly entry: string;
  readonly expected: string[];
};

const DIR = resolve('/ws/pkg');

const fileWith = (patch: Partial<TsconfigFile>): TsconfigFile => {
  const file: TsconfigFile = { extends: [], paths: undefined, baseUrl: undefined, ...patch };

  return file;
};

const optionsText = (options: string): string => `{ "compilerOptions": { ${options} } }`;

const TWO_PATHS: Record<string, string[]> = { '@b/*': ['../b/src/*'], '@c': ['../c/index.ts'] };

const OK_PATHS: Record<string, string[]> = { '@ok': ['y'] };

const Z_PATHS: Record<string, string[]> = { '@a': ['z'] };

const nullRows: FileRow[] = [
  { label: 'a parse error', text: '{ "extends": }', expected: null },
  { label: 'an array root', text: '[1]', expected: null },
  { label: 'a string root', text: '"x"', expected: null },
  { label: 'an empty text', text: '', expected: null },
  { label: 'a non-object compilerOptions', text: '{ "compilerOptions": 5 }', expected: null }
];

const extendsRows: FileRow[] = [
  {
    label: 'comments and a trailing comma',
    text: '{ /* c */ "extends": "./b.json", // c\n }',
    expected: fileWith({ extends: ['./b.json'] })
  },
  {
    label: 'an extends array holding a number',
    text: '{ "extends": ["./a.json", 3, "./b.json"] }',
    expected: fileWith({ extends: ['./a.json', './b.json'] })
  },
  {
    label: 'trailing commas in an object and an array',
    text: '{ "extends": ["./a.json",], "compilerOptions": { "baseUrl": ".", }, }',
    expected: fileWith({ extends: ['./a.json'], baseUrl: '.' })
  },
  { label: 'a numeric extends', text: '{ "extends": 3 }', expected: fileWith({}) }
];

const pathsRows: FileRow[] = [
  {
    label: 'paths and baseUrl',
    text: optionsText('"paths": { "@b/*": ["../b/src/*"], "@c": ["../c/index.ts"] }, "baseUrl": "."'),
    expected: fileWith({ paths: TWO_PATHS, baseUrl: '.' })
  },
  {
    label: 'a key with two stars beside a valid key',
    text: optionsText('"paths": { "a/*/b/*": ["x"], "@ok": ["y"] }'),
    expected: fileWith({ paths: OK_PATHS })
  },
  {
    label: 'a target with two stars beside a valid target',
    text: optionsText('"paths": { "@a": ["x/*/y/*", "z"] }'),
    expected: fileWith({ paths: Z_PATHS })
  },
  {
    label: 'a key whose targets are a number and a two-star text',
    text: optionsText('"paths": { "@a": [3, "x/*/*"], "@ok": ["y"] }'),
    expected: fileWith({ paths: OK_PATHS })
  },
  {
    label: 'a key with an empty target list',
    text: optionsText('"paths": { "@a": [], "@ok": ["y"] }'),
    expected: fileWith({ paths: OK_PATHS })
  },
  {
    label: 'a key whose targets are not an array',
    text: optionsText('"paths": { "@a": "x", "@ok": ["y"] }'),
    expected: fileWith({ paths: OK_PATHS })
  },
  { label: 'paths set to null', text: optionsText('"paths": null'), expected: fileWith({ paths: null }) },
  { label: 'paths set to a string', text: optionsText('"paths": "x"'), expected: fileWith({}) },
  { label: 'paths set to an array', text: optionsText('"paths": []'), expected: fileWith({}) },
  { label: 'a numeric baseUrl', text: optionsText('"baseUrl": 3'), expected: fileWith({}) }
];

const extendedRows: ExtendedRow[] = [
  { label: 'a ./ path with .json', entry: './base.json', expected: [join(DIR, 'base.json')] },
  {
    label: 'a ../ path without .json',
    entry: '../../tsconfig.base',
    expected: [resolve(DIR, '../../tsconfig.base'), `${resolve(DIR, '../../tsconfig.base')}.json`]
  },
  { label: 'backslashes', entry: '..\\cfg\\base.json', expected: [resolve(DIR, '../cfg/base.json')] },
  { label: 'an absolute path', entry: resolve('/abs/base.json'), expected: [resolve('/abs/base.json')] },
  { label: 'a scoped package', entry: '@company/tsconfig/base.json', expected: [] },
  { label: 'a bare file name', entry: 'tsconfig.base.json', expected: [] },
  { label: 'a dot', entry: '.', expected: [] }
];

describe('FEATURE: read one tsconfig file', () => {
  describe('GIVEN a text that is not a usable config', () => {
    it.each(nullRows)('WHEN $label is parsed THEN the file is null', ({ text }) => {
      const file = tsconfigFileOf(text);

      expect(file).toBeNull();
    });

    it('WHEN the text is nested deeper than the stack allows THEN the file is null and nothing throws', () => {
      const text = '['.repeat(100_000);

      const file = tsconfigFileOf(text);

      expect(file).toBeNull();
    });
  });

  describe('GIVEN a config with an extends', () => {
    it.each(extendsRows)('WHEN $label is parsed THEN the file is $expected', ({ text, expected }) => {
      const file = tsconfigFileOf(text);

      expect(file).toStrictEqual(expected);
    });
  });

  describe('GIVEN a config with compilerOptions', () => {
    it.each(pathsRows)('WHEN $label is parsed THEN the file is $expected', ({ text, expected }) => {
      const file = tsconfigFileOf(text);

      expect(file).toStrictEqual(expected);
    });

    it('WHEN a key is __proto__ THEN it stays an own key with its target', () => {
      const text = optionsText('"paths": { "__proto__": ["x/*"] }');

      const paths = tsconfigFileOf(text)?.paths ?? {};

      expect(Object.hasOwn(paths, '__proto__')).toBe(true);
      expect(Object.entries(paths)).toStrictEqual([['__proto__', ['x/*']]]);
    });
  });

  describe('GIVEN an extends entry of a file in a dir', () => {
    it.each(extendedRows)('WHEN the entry is $label THEN the candidates are $expected', ({ entry, expected }) => {
      const candidates = extendedPathsOf(DIR, entry);

      expect(candidates).toStrictEqual(expected);
    });
  });
});
