import { describe, expect, it } from 'vitest';

import { labelTurnDragOf } from './graph-label-turn.spec.util.ts';
import { lineThrough } from './graph-lines.spec.util.ts';
import type { ProbeRect } from '../../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeFolderLink } from '../../../src/graph/common/graph-probe.type.ts';
import type { LinkRead } from '../../common/graph-folder-links.type.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

/** The collapsed `apps` end of the line, 200 px left of the package end. */
const APPS_END: ViewportPoint = { x: 100, y: 100 };

const PKG_END: ViewportPoint = { x: 300, y: 100 };

/** The drag that turns the 200 px line from apps to 45 degrees up and right, its package end to (241.4, -41.4). */
const TURN_UP_RIGHT: ViewportPoint = { x: 100 + 200 * Math.SQRT1_2 - 300, y: 100 - 200 * Math.SQRT1_2 - 100 };

/** A 20 by 10 label box centred `dx`, `dy` from the line's midpoint at (200, 100). */
const labelAt = (dx: number, dy: number): ProbeRect => {
  const box: ProbeRect = { left: 200 + dx - 10, top: 100 + dy - 5, width: 20, height: 10 };

  return box;
};

const readOf = (link: ProbeFolderLink, points: ViewportPoint[]): LinkRead => {
  const line = lineThrough(link.source, link.target, points);
  const read: LinkRead = { links: [link], lines: [line], folders: [], nodes: [], zoom: 1 };

  return read;
};

const linkOf = (source: string, target: string, labelBox: ProbeRect): ProbeFolderLink => {
  const link: ProbeFolderLink = {
    source,
    target,
    count: 1,
    isDrawn: true,
    state: 'normal',
    curveStyle: 'bezier',
    zCompoundDepth: 'auto',
    labelBox
  };

  return link;
};

const roundedOf = (point: ViewportPoint): number[] => [Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10];

describe('FEATURE: labelTurnDragOf', () => {
  describe('GIVEN a label up and right of the line', () => {
    it('WHEN pkg is dragged THEN the line turns toward the label', () => {
      const read = readOf(linkOf('apps', 'pkg', labelAt(20, -20)), [APPS_END, PKG_END]);

      expect(roundedOf(labelTurnDragOf(read, 'pkg'))).toStrictEqual(roundedOf(TURN_UP_RIGHT));
    });
  });

  describe('GIVEN a label down and left of the line', () => {
    it('WHEN pkg is dragged THEN the line turns away from it, the shorter drag', () => {
      const read = readOf(linkOf('apps', 'pkg', labelAt(-20, 20)), [APPS_END, PKG_END]);

      expect(roundedOf(labelTurnDragOf(read, 'pkg'))).toStrictEqual(roundedOf(TURN_UP_RIGHT));
    });
  });

  describe('GIVEN the link runs from pkg to apps', () => {
    it('WHEN pkg is dragged THEN its first point is the end that moves', () => {
      const read = readOf(linkOf('pkg', 'apps', labelAt(20, -20)), [PKG_END, APPS_END]);

      expect(roundedOf(labelTurnDragOf(read, 'pkg'))).toStrictEqual(roundedOf(TURN_UP_RIGHT));
    });
  });

  describe('GIVEN no drawn link ends on the package', () => {
    it('WHEN asked THEN it throws', () => {
      const read = readOf(linkOf('apps', 'other', labelAt(20, -20)), [APPS_END, PKG_END]);

      expect(() => labelTurnDragOf(read, 'pkg')).toThrow('no drawn folder link ends on pkg');
    });
  });
});
