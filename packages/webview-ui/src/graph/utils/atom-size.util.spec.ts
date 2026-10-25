import { describe, expect, it } from 'vitest';

import { umbrellaSizeOf, widestCountsOf } from './atom-size.util.ts';
import { ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const sizer: NodeSizer = (text) => {
  const size: NodeSize = { width: text.length * 10, height: 32 };

  return size;
};

describe('FEATURE: umbrella size', () => {
  describe('GIVEN the widest counts text of a group', () => {
    it('WHEN it holds 200 files THEN it reads the files, cached and failed counts at that width', () => {
      expect(widestCountsOf(200)).toBe('200 files · 200 cached · 200 failed');
    });
  });

  describe('GIVEN a sizer that makes a character 10 px wide', () => {
    it('WHEN the counts text is wider than the name THEN the umbrella is that wide and one counts line taller', () => {
      const size = umbrellaSizeOf({ name: sizer, counts: sizer }, 'e2e-ci', 200);

      expect(size).toStrictEqual({ width: 350, height: 48 });
    });

    it('WHEN the name is wider than the counts text THEN the umbrella keeps the name width', () => {
      const size = umbrellaSizeOf({ name: sizer, counts: sizer }, 'a-very-long-umbrella-task-name-here', 1);

      expect(size.width).toBe(350);
    });
  });

  describe('GIVEN a name sizer and a counts sizer that measure differently', () => {
    it('WHEN the counts sizer is wider THEN the width and the counts line come from each its own sizer', () => {
      const name: NodeSizer = () => {
        const size: NodeSize = { width: 60, height: 30 };

        return size;
      };
      const counts: NodeSizer = () => {
        const size: NodeSize = { width: 90, height: 20 };

        return size;
      };

      const size = umbrellaSizeOf({ name, counts }, 'build', 2);

      expect(size).toStrictEqual({ width: 90, height: 30 + ATOM_COUNTS_LINE_PX });
    });

    it('WHEN the name sizer is wider THEN the height is the name sizer height plus one counts line', () => {
      const name: NodeSizer = () => {
        const size: NodeSize = { width: 120, height: 30 };

        return size;
      };
      const counts: NodeSizer = () => {
        const size: NodeSize = { width: 80, height: 20 };

        return size;
      };

      const size = umbrellaSizeOf({ name, counts }, 'build', 2);

      expect(size).toStrictEqual({ width: 120, height: 30 + ATOM_COUNTS_LINE_PX });
    });
  });
});
