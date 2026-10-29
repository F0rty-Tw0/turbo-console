import { describe, expect, it } from 'vitest';

import { collapsedIdOf, folderIdOf } from './folder-id.util.ts';
import { anchorsOf, joinedBoxOf, keepClearNamesOf, keepClearPanOf } from './keep-clear.util.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

type KeepClearNamesRow = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly ghostNodes: string[];
  readonly expected: string[];
};

const TRACE: Inspection = { kind: 'trace', start: 'web', end: 'base' };

const PICKING: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const PACKAGE: Inspection = { kind: 'package', name: 'web' };

const LINK: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const NONE: Inspection = { kind: 'none' };

const boxOf = (x1: number, x2: number): AnchorBox => {
  const box: AnchorBox = { x1, x2 };

  return box;
};

const FOLDER: Inspection = { kind: 'folder', folder: 'apps' };

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
      ['a folder', { kind: 'folder', folder: 'apps' }, [folderIdOf('apps'), collapsedIdOf('apps')]],
      ['a bundle', { kind: 'bundle', source: 'docs', target: collapsedIdOf('packages') }, ['docs', collapsedIdOf('packages')]],
      ['the root folder', { kind: 'folder', folder: '' }, ['\u0001', '\u0002']],
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

describe('FEATURE: keepClearNamesOf', () => {
  describe('GIVEN an inspection and the ghost nodes drawn for it', () => {
    it.each<KeepClearNamesRow>([
      { title: 'a trace with one ghost', inspection: TRACE, ghostNodes: ['core'], expected: ['web', 'base', 'core'] },
      { title: 'a trace with no ghost', inspection: TRACE, ghostNodes: [], expected: ['web', 'base'] },
      {
        title: 'a trace with ghosts named like Object members',
        inspection: TRACE,
        ghostNodes: ['__proto__', 'constructor'],
        expected: ['web', 'base', '__proto__', 'constructor']
      },
      {
        title: 'a trace whose ghosts repeat an end',
        inspection: TRACE,
        ghostNodes: ['base', 'core', 'core'],
        expected: ['web', 'base', 'core']
      },
      { title: 'a package with stray ghosts', inspection: PACKAGE, ghostNodes: ['core'], expected: ['web'] },
      {
        title: 'a link with stray ghosts',
        inspection: LINK,
        ghostNodes: ['core'],
        expected: ['web', 'ui']
      },
      { title: 'a picking with stray ghosts', inspection: PICKING, ghostNodes: ['core'], expected: ['web'] },
      {
        title: 'a folder with stray ghosts',
        inspection: FOLDER,
        ghostNodes: ['x'],
        expected: [folderIdOf('apps'), collapsedIdOf('apps')]
      },
      { title: 'none with stray ghosts', inspection: NONE, ghostNodes: ['core'], expected: [] }
    ])('WHEN it is $title THEN the names kept clear are $expected', ({ inspection, ghostNodes, expected }) => {
      const names = keepClearNamesOf(inspection, ghostNodes);

      expect(names).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: joinedBoxOf', () => {
  describe('GIVEN an anchor box and a button box', () => {
    it.each<[string, AnchorBox | null, AnchorBox | null, AnchorBox | null]>([
      ['both set: the union span', boxOf(10, 50), boxOf(48, 72), boxOf(10, 72)],
      ['the button spans wider on the left', boxOf(40, 50), boxOf(10, 45), boxOf(10, 50)],
      ['no anchor: the button', null, boxOf(48, 72), boxOf(48, 72)],
      ['no button: the anchor', boxOf(10, 50), null, boxOf(10, 50)],
      ['neither', null, null, null]
    ])('WHEN %s THEN the joined box is the expected one', (_title, anchor, button, expected) => {
      const joined = joinedBoxOf(anchor, button);

      expect(joined).toStrictEqual(expected);
    });
  });
});
