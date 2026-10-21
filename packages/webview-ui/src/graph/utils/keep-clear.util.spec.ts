import { describe, expect, it } from 'vitest';

import { anchorsOf, keepClearPanOf } from './keep-clear.util.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

const boxOf = (x1: number, x2: number): AnchorBox => {
  const box: AnchorBox = { x1, x2 };

  return box;
};

describe('FEATURE: keepClearPanOf', () => {
  describe('GIVEN an anchor box, the container width and the overlay edge', () => {
    it.each([
      { title: 'clear of the overlay', x1: 100, x2: 200, containerWidth: 800, overlayLeft: 520, expected: 0 },
      { title: 'right edge exactly at the margin line', x1: 400, x2: 504, containerWidth: 800, overlayLeft: 520, expected: 0 },
      { title: 'one pixel past the margin line', x1: 400, x2: 505, containerWidth: 800, overlayLeft: 520, expected: -1 },
      { title: 'partly under the overlay', x1: 450, x2: 600, containerWidth: 800, overlayLeft: 520, expected: -96 },
      { title: 'fully under the overlay', x1: 600, x2: 700, containerWidth: 800, overlayLeft: 520, expected: -196 },
      { title: 'too wide to fit (489 > 488)', x1: 100, x2: 589, containerWidth: 800, overlayLeft: 520, expected: 0 },
      { title: 'exactly fits (488)', x1: 100, x2: 588, containerWidth: 800, overlayLeft: 520, expected: -84 },
      { title: "beyond the container's right edge", x1: 850, x2: 900, containerWidth: 800, overlayLeft: 520, expected: -396 },
      { title: 'left of the view', x1: -300, x2: -100, containerWidth: 800, overlayLeft: 520, expected: 0 },
      { title: 'zero-width box', x1: 600, x2: 600, containerWidth: 800, overlayLeft: 520, expected: -96 },
      { title: 'fractional', x1: 400.25, x2: 520.5, containerWidth: 800, overlayLeft: 520, expected: -16.5 },
      {
        title: 'narrower container (699 wide, overlay at 419)',
        x1: 300,
        x2: 450,
        containerWidth: 699,
        overlayLeft: 419,
        expected: -47
      },
      {
        title: 'container narrower than the overlay edge: its width bounds the fit',
        x1: 150,
        x2: 550,
        containerWidth: 300,
        overlayLeft: 520,
        expected: 0
      }
    ])('WHEN $title THEN the pan is $expected', ({ x1, x2, containerWidth, overlayLeft, expected }) => {
      const box = boxOf(x1, x2);

      const pan = keepClearPanOf(box, containerWidth, overlayLeft);

      expect(pan).toBe(expected);
    });
  });
});

describe('FEATURE: anchorsOf', () => {
  describe('GIVEN an inspection', () => {
    it.each<[string, Inspection, string[]]>([
      ['none', { kind: 'none' }, []],
      ['a package', { kind: 'package', name: 'web' }, ['web']],
      ['a link', { kind: 'link', source: 'web', target: 'ui' }, ['web', 'ui']],
      ['a picking, nudged or not', { kind: 'picking', start: 'web', isNudged: true }, ['web']],
      ['a trace', { kind: 'trace', start: 'web', end: 'core' }, ['web', 'core']],
      [
        'a link between names like Object members',
        { kind: 'link', source: '__proto__', target: 'constructor' },
        ['__proto__', 'constructor']
      ]
    ])('WHEN it is %s THEN the anchors are %j', (_title, inspection, expected) => {
      const anchors = anchorsOf(inspection);

      expect(anchors).toStrictEqual(expected);
    });
  });
});
