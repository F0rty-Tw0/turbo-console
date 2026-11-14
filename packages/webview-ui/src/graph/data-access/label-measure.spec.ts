import { describe, expect, it, vi } from 'vitest';

import { boxTitleSizerOf, cardSizerOf, labelSizer, packageTitleSizer, slotSizer, taskSizerOf } from './label-measure.ts';
import { CARD_CLOCK_SAMPLES, CARD_STATE_WORDS } from '../common/graph-card.const.ts';
import { GLYPH_CODE_POINTS, PACKAGE_GLYPH } from '../common/graph-glyph.const.ts';
import type { TextMeasure } from '../common/graph-page.type.ts';
import { nodeSizeOf } from '../utils/node-size.util.ts';

const MEASURED_WIDTH = 40;
const GLYPH_MEASURED_WIDTH = 90;

const measureOf = (): ReturnType<typeof vi.fn<TextMeasure>> => vi.fn<TextMeasure>((): number => MEASURED_WIDTH);

const glyphMeasureOf = (): ReturnType<typeof vi.fn<TextMeasure>> => vi.fn<TextMeasure>((): number => GLYPH_MEASURED_WIDTH);

describe('FEATURE: label-measure', () => {
  describe('GIVEN a measure that records its text and returns 40', () => {
    it('WHEN the slot sizer sizes build THEN it measures the blank glyph, a space and the name', () => {
      const measure = measureOf();

      slotSizer(measure)('build');

      expect(measure).toHaveBeenCalledExactlyOnceWith('\uec03 build');
    });

    it('WHEN the slot sizer sizes build THEN it returns the node size of the measured width', () => {
      const size = slotSizer(measureOf())('build');

      expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
    });

    it('WHEN the package title sizer sizes web THEN it measures the package glyph, a space and the name', () => {
      const measure = measureOf();

      packageTitleSizer(measure)('web');

      expect(measure).toHaveBeenCalledExactlyOnceWith(`${PACKAGE_GLYPH} web`);
    });

    it('WHEN the package title sizer sizes web THEN it returns the node size of the measured width', () => {
      const size = packageTitleSizer(measureOf())('web');

      expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
    });

    it('WHEN the label sizer sizes build THEN it measures the bare name', () => {
      const measure = measureOf();

      labelSizer(measure)('build');

      expect(measure).toHaveBeenCalledExactlyOnceWith('build');
    });

    it('WHEN the label sizer sizes build THEN it returns the node size of the measured width', () => {
      const size = labelSizer(measureOf())('build');

      expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
    });
  });

  describe('GIVEN a plain measure of 40 and a codicon measure of 90', () => {
    describe('AND the page draws glyphs', () => {
      it('WHEN the task sizer sizes build THEN it measures the blank glyph slot in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        taskSizerOf(true, measureOf(), glyphMeasure)('build');

        expect(glyphMeasure).toHaveBeenCalledExactlyOnceWith(`${GLYPH_CODE_POINTS.blank} build`);
      });

      it('WHEN the task sizer sizes build THEN it returns the node size of the codicon width', () => {
        const size = taskSizerOf(true, measureOf(), glyphMeasureOf())('build');

        expect(size).toStrictEqual(nodeSizeOf(GLYPH_MEASURED_WIDTH));
      });

      it('WHEN the box title sizer sizes web THEN it measures the package glyph and the name in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        boxTitleSizerOf(true, measureOf(), glyphMeasure)('web');

        expect(glyphMeasure).toHaveBeenCalledExactlyOnceWith(`${PACKAGE_GLYPH} web`);
      });

      it('WHEN the box title sizer sizes web THEN it returns the node size of the codicon width', () => {
        const size = boxTitleSizerOf(true, measureOf(), glyphMeasureOf())('web');

        expect(size).toStrictEqual(nodeSizeOf(GLYPH_MEASURED_WIDTH));
      });
    });

    describe('AND the page draws no glyphs', () => {
      it('WHEN the task sizer sizes build THEN it returns the node size of the bare label', () => {
        const size = taskSizerOf(false, measureOf(), glyphMeasureOf())('build');

        expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
      });

      it('WHEN the task sizer sizes build THEN it never measures in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        taskSizerOf(false, measureOf(), glyphMeasure)('build');

        expect(glyphMeasure).not.toHaveBeenCalled();
      });

      it('WHEN the box title sizer sizes web THEN it returns the node size of the bare name', () => {
        const size = boxTitleSizerOf(false, measureOf(), glyphMeasureOf())('web');

        expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
      });

      it('WHEN the box title sizer sizes web THEN it never measures in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        boxTitleSizerOf(false, measureOf(), glyphMeasure)('web');

        expect(glyphMeasure).not.toHaveBeenCalled();
      });
    });
  });

  describe('FEATURE: cardSizerOf', () => {
    const lengthMeasureOf = (perChar: number): ReturnType<typeof vi.fn<TextMeasure>> =>
      vi.fn<TextMeasure>((text: string): number => text.length * perChar);

    it.each([
      { glyphs: true, name: 'build', plain: 7, glyph: 9, width: 180, kills: 'short name floors at CARD_MIN_WIDTH' },
      {
        glyphs: true,
        name: 'a'.repeat(40),
        plain: 7,
        glyph: 9,
        width: 402,
        kills: 'wide name uses the glyph measure of blank, space and name, plus padding'
      },
      { glyphs: false, name: 'a'.repeat(40), plain: 7, glyph: 9, width: 304, kills: 'no glyphs: bare name, plain bold measure' },
      { glyphs: false, name: 'build', plain: 12, glyph: 9, width: 264, kills: 'widest clock sample sets the width' },
      {
        glyphs: true,
        name: 'build',
        plain: 12,
        glyph: 9,
        width: 264,
        kills: 'sample measured with the plain bold measure, not the glyph one'
      },
      { glyphs: false, name: 'build', plain: 8, glyph: 9, width: 184, kills: 'both 20-character clock samples measured' }
    ])(
      'GIVEN glyphs $glyphs, name length $name.length, P $plain, G $glyph WHEN sized THEN $width x 60 ($kills)',
      ({ glyphs, name, plain, glyph, width }) => {
        const size = cardSizerOf(glyphs, lengthMeasureOf(plain), lengthMeasureOf(glyph))(name);

        expect(size).toStrictEqual({ width, height: 60 });
      }
    );

    it('GIVEN no glyphs WHEN sized THEN it never measures in the glyph font', () => {
      const boldGlyphMeasure = vi.fn<TextMeasure>((): number => {
        throw new Error('glyph measure called');
      });

      expect(() => cardSizerOf(false, lengthMeasureOf(7), boldGlyphMeasure)('build')).not.toThrow();
    });

    it('GIVEN a measure that throws WHEN the sizer is built THEN it does not throw until a name is sized', () => {
      const broken = vi.fn<TextMeasure>((): number => {
        throw new Error('measure broken');
      });

      expect(() => cardSizerOf(true, broken, broken)).not.toThrow();
      expect(() => cardSizerOf(true, broken, broken)('build')).toThrow('measure broken');
    });

    it('GIVEN a built sizer WHEN it sizes two names THEN the state words were measured once, on the first sizing', () => {
      const boldMeasure = lengthMeasureOf(7);
      const sizeOf = cardSizerOf(false, boldMeasure, lengthMeasureOf(9));

      sizeOf('build');
      sizeOf('test');

      const stateCalls = boldMeasure.mock.calls.filter(([text]) => CARD_STATE_WORDS.includes(text));

      expect(stateCalls).toHaveLength(CARD_STATE_WORDS.length);
    });

    it('GIVEN a built sizer WHEN it sizes two names THEN the clock samples were measured once, on the first sizing', () => {
      const boldMeasure = lengthMeasureOf(7);
      const sizeOf = cardSizerOf(false, boldMeasure, lengthMeasureOf(9));

      sizeOf('build');
      sizeOf('test');

      const sampleCalls = boldMeasure.mock.calls.filter(([text]) => CARD_CLOCK_SAMPLES.includes(text));

      expect(sampleCalls).toHaveLength(CARD_CLOCK_SAMPLES.length);
    });

    it('GIVEN only Failed to start measures wide WHEN build is sized THEN the widest state word still sets the width', () => {
      const keyedMeasure = vi.fn<TextMeasure>((text: string): number => (text === 'Failed to start' ? 200 : 10));

      expect(cardSizerOf(false, keyedMeasure, lengthMeasureOf(9))('build')).toStrictEqual({ width: 224, height: 60 });
    });
  });
});
