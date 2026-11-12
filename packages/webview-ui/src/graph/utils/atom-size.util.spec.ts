import { describe, expect, it } from 'vitest';

import { chipRowWidthOf, umbrellaSizeOf } from './atom-size.util.ts';
import {
  ATOM_CHIP_FONT_PX,
  ATOM_CHIP_GAP_PX,
  ATOM_CHIP_GLYPH_PX,
  ATOM_CHIP_HEIGHT_PX,
  ATOM_CHIP_PAD_PX,
  ATOM_COUNTS_LINE_PX
} from '../common/graph-atom.const.ts';
import type { NodeSizer, TextMeasure } from '../common/graph-page.type.ts';
import { NODE_FONT_SIZE } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const sizer: NodeSizer = (text) => {
  const size: NodeSize = { width: text.length * 10, height: 32 };

  return size;
};

const measure: TextMeasure = (text) => text.length * 7;

describe('FEATURE: umbrella size', () => {
  describe('GIVEN the chip constants', () => {
    it('THEN they match the spec values', () => {
      const sizes = [ATOM_CHIP_FONT_PX, ATOM_CHIP_PAD_PX, ATOM_CHIP_GAP_PX, ATOM_CHIP_GLYPH_PX];

      expect(ATOM_CHIP_HEIGHT_PX).toBe(ATOM_COUNTS_LINE_PX);
      expect(ATOM_CHIP_FONT_PX).toBe(NODE_FONT_SIZE - 2);
      expect(sizes).toStrictEqual([11, 6, 4, 12]);
    });
  });

  describe('GIVEN a measure that makes a character 7 px wide', () => {
    it('WHEN 10 files with glyphs THEN 3 chips (70 + 77 + 77) + 2 glyph slots (30) + 2 gaps (8) + side inset (24)', () => {
      expect(chipRowWidthOf(measure, 10, true)).toBe(286);
    });

    it('WHEN 10 files glyph-off THEN the same row without the 30 px of glyph slots', () => {
      expect(chipRowWidthOf(measure, 10, false)).toBe(256);
    });
  });

  describe('GIVEN umbrellaSizeOf', () => {
    it('WHEN the chip row is wider than the name THEN the umbrella is the row wide and one counts line taller', () => {
      const size = umbrellaSizeOf({ name: sizer, chips: measure, glyphs: true }, 'e2e-ci', 200);

      expect(size).toStrictEqual({ width: 307, height: 48 });
    });

    it('WHEN the name is wider than the row THEN the umbrella keeps the name width', () => {
      const size = umbrellaSizeOf({ name: sizer, chips: measure, glyphs: true }, 'a-very-long-umbrella-task-name-here', 1);

      expect(size.width).toBe(350);
    });

    it('WHEN the name sizer is 30 tall THEN the height is 30 + ATOM_COUNTS_LINE_PX', () => {
      const name: NodeSizer = () => {
        const size: NodeSize = { width: 60, height: 30 };

        return size;
      };
      const size = umbrellaSizeOf({ name, chips: measure, glyphs: false }, 'build', 10);

      expect(size).toStrictEqual({ width: 256, height: 46 });
    });
  });
});
