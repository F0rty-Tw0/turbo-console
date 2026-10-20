import { describe, expect, it } from 'vitest';

import { rootLabelOf } from './root-label.util.ts';

const ROOT = '/work/my-app';

const OBJECT_NAME = { name: 'x' };

type NameRow = { readonly title: string; readonly name: unknown; readonly expected: string };

const NAMES: NameRow[] = [
  { title: 'a plain name', name: 'single-app', expected: 'single-app' },
  { title: 'a scoped name', name: '@acme/app', expected: '@acme/app' },
  { title: 'missing', name: undefined, expected: 'my-app' },
  { title: 'null', name: null, expected: 'my-app' },
  { title: 'a number', name: 42, expected: 'my-app' },
  { title: 'an array', name: ['x'], expected: 'my-app' },
  { title: 'an object', name: OBJECT_NAME, expected: 'my-app' },
  { title: 'empty', name: '', expected: 'my-app' },
  { title: 'whitespace only', name: '  \t ', expected: 'my-app' },
  { title: 'only control and ANSI characters', name: '\u0000\u001B[31m\u0007', expected: 'my-app' },
  { title: 'control and bidi characters inside', name: 'sin\u0000gle\n-app‮', expected: 'single-app' },
  { title: 'a 10 kB string', name: 'x'.repeat(10_000), expected: 'x'.repeat(214) }
];

describe('FEATURE: root label', () => {
  describe('GIVEN a root package.json name of any shape', () => {
    it.each(NAMES)('WHEN the name is $title THEN the label is $expected', ({ name, expected }) => {
      expect(rootLabelOf(name, ROOT)).toBe(expected);
    });
  });

  describe('GIVEN a root with no usable name', () => {
    it('WHEN the root ends in a separator THEN the folder name is still the fallback', () => {
      expect(rootLabelOf(undefined, '/work/my-app/')).toBe('my-app');
    });

    it('WHEN the root has no folder name THEN the label is //', () => {
      expect(rootLabelOf(undefined, '/')).toBe('//');
    });
  });
});
