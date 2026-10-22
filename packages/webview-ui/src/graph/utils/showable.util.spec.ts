import { describe, expect, it } from 'vitest';

import { showableNamesOf } from './showable.util.ts';

type ShowableRow = {
  readonly title: string;
  readonly path: string[];
  readonly visible: ReadonlySet<string>;
  readonly canShow: (name: string) => boolean;
  readonly expected: string[];
};

const always = (): boolean => true;

const allButB = (name: string): boolean => name !== 'b';

describe('FEATURE: showableNamesOf', () => {
  describe('GIVEN a trace path, the visible set and a Show rule', () => {
    it.each<ShowableRow>([
      { title: 'a hidden middle package', path: ['a', 'b', 'c'], visible: new Set(['a', 'c']), canShow: always, expected: ['b'] },
      {
        title: 'a hidden middle package Show refuses',
        path: ['a', 'b', 'c'],
        visible: new Set(['a', 'c']),
        canShow: allButB,
        expected: []
      },
      { title: 'every path package visible', path: ['a', 'b'], visible: new Set(['a', 'b']), canShow: always, expected: [] },
      { title: 'an empty path', path: [], visible: new Set(), canShow: always, expected: [] },
      { title: 'a hidden `__proto__`', path: ['__proto__', 'x'], visible: new Set(['x']), canShow: always, expected: ['__proto__'] }
    ])('WHEN $title THEN the showable names are $expected', ({ path, visible, canShow, expected }) => {
      const showable = showableNamesOf(path, visible, canShow);

      expect([...showable]).toStrictEqual(expected);
    });
  });
});
