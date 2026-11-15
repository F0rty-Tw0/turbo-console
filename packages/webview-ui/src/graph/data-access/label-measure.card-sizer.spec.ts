import { describe, expect, it, vi } from 'vitest';

import { cardSizerOf } from './label-measure.ts';
import { CARD_CLOCK_SAMPLES, CARD_STATE_WORDS } from '../common/graph-card.const.ts';
import type { TextMeasure } from '../common/graph-page.type.ts';

describe('FEATURE: cardSizerOf', () => {
  const lengthMeasureOf = (perChar: number): ReturnType<typeof vi.fn<TextMeasure>> =>
    vi.fn<TextMeasure>((text: string): number => text.length * perChar);

  describe.each([
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
  ])('GIVEN glyphs $glyphs, name length $name.length, P $plain, G $glyph', ({ glyphs, name, plain, glyph, width, kills }) => {
    it(`WHEN sized THEN ${width} x 60 (${kills})`, () => {
      const size = cardSizerOf(glyphs, lengthMeasureOf(plain), lengthMeasureOf(glyph))(name);

      expect(size).toStrictEqual({ width, height: 60 });
    });
  });

  describe('GIVEN no glyphs', () => {
    it('WHEN sized THEN it never measures in the glyph font', () => {
      const boldGlyphMeasure = vi.fn<TextMeasure>((): number => {
        throw new Error('glyph measure called');
      });

      expect(() => cardSizerOf(false, lengthMeasureOf(7), boldGlyphMeasure)('build')).not.toThrow();
    });
  });

  describe('GIVEN a measure that throws', () => {
    it('WHEN the sizer is built THEN it does not throw until a name is sized', () => {
      const broken = vi.fn<TextMeasure>((): number => {
        throw new Error('measure broken');
      });

      expect(() => cardSizerOf(true, broken, broken)).not.toThrow();
      expect(() => cardSizerOf(true, broken, broken)('build')).toThrow('measure broken');
    });
  });

  describe('GIVEN a built sizer', () => {
    it('WHEN it sizes two names THEN the state words were measured once, on the first sizing', () => {
      const boldMeasure = lengthMeasureOf(7);
      const sizeOf = cardSizerOf(false, boldMeasure, lengthMeasureOf(9));

      sizeOf('build');
      sizeOf('test');

      const stateCalls = boldMeasure.mock.calls.filter(([text]) => CARD_STATE_WORDS.includes(text));

      expect(stateCalls).toHaveLength(CARD_STATE_WORDS.length);
    });

    it('WHEN it sizes two names THEN the clock samples were measured once, on the first sizing', () => {
      const boldMeasure = lengthMeasureOf(7);
      const sizeOf = cardSizerOf(false, boldMeasure, lengthMeasureOf(9));

      sizeOf('build');
      sizeOf('test');

      const sampleCalls = boldMeasure.mock.calls.filter(([text]) => CARD_CLOCK_SAMPLES.includes(text));

      expect(sampleCalls).toHaveLength(CARD_CLOCK_SAMPLES.length);
    });
  });

  describe('GIVEN only Failed to start measures wide', () => {
    it('WHEN build is sized THEN the widest state word still sets the width', () => {
      const keyedMeasure = vi.fn<TextMeasure>((text: string): number => (text === 'Failed to start' ? 200 : 10));

      expect(cardSizerOf(false, keyedMeasure, lengthMeasureOf(9))('build')).toStrictEqual({ width: 224, height: 60 });
    });
  });
});
