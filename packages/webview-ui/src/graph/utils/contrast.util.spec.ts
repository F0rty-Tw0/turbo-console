import { describe, expect, it } from 'vitest';

import { contrastRatioOf, dimmedOpacityOf, opaqueColourOf } from './contrast.util.ts';

describe('FEATURE: contrastRatioOf', () => {
  it.each([
    ['#ffffff', '#000000', 21],
    ['#000000', '#ffffff', 21],
    ['#000000', '#000000', 1],
    ['#fff', 'rgb(0, 0, 0)', 21],
    ['#ffffff80', 'rgba(0, 0, 0, 0.5)', 21]
  ])('GIVEN %s and %s WHEN the ratio is read THEN it is %d, the alpha not counted', (first, second, ratio) => {
    expect(contrastRatioOf(first, second)).toBe(ratio);
  });

  it('GIVEN a value that is not a colour WHEN the ratio is read THEN it is 1, no contrast', () => {
    expect(contrastRatioOf('not-a-colour', '#ffffff')).toBe(1);
  });
});

describe('FEATURE: dimmedOpacityOf', () => {
  /**
   * Oracles worked out apart from the source: white over black reads 3.01:1 at 0.35 and 3.66 at 0.4; `#6fc3df` over
   * black 3.13 at 0.5 and 3.60 at 0.55; black over white 2.85 at 0.4 and 3.35 at 0.45; half-alpha white over black
   * 3.01 at 0.7 (0.35 in all) and 3.32 at 0.75; `#222222` never reaches 3.3; an alpha of 1.5 counts as 1.
   */
  it.each([
    ['#000000', ['#ffffff'], 0.4],
    ['#000000', ['#ffffff', '#6fc3df'], 0.55],
    ['#ffffff', ['#000000'], 0.45],
    ['#000000', ['rgba(255, 255, 255, 0.5)'], 0.75],
    ['#000000', ['#222222'], 0.8],
    ['#000000', ['rgba(255, 255, 255, 1.5)'], 0.4],
    ['#000000', [], 0.25]
  ])('GIVEN %s behind %j WHEN the opacity is chosen THEN it is %d', (background, foregrounds, opacity) => {
    expect(dimmedOpacityOf(background, foregrounds)).toBe(opacity);
  });

  it.each([
    ['#000000', ['not-a-colour']],
    ['#000000', ['#ffffff', 'rgb(1, 2)']],
    ['transparent', ['#ffffff']]
  ])('GIVEN %s behind %j, one not a colour, WHEN the opacity is chosen THEN it is 0.25', (background, foregrounds) => {
    expect(dimmedOpacityOf(background, foregrounds)).toBe(0.25);
  });
});

describe('FEATURE: opaqueColourOf', () => {
  describe('GIVEN a colour with alpha over an opaque background', () => {
    it.each([
      ['#FFFFFF22', '#121314', 'rgb(50, 50, 51)'],
      ['#00000025', '#ffffff', 'rgb(218, 218, 218)'],
      ['rgba(255, 255, 255, 0.13)', '#121314', 'rgb(49, 50, 51)'],
      ['rgba(255, 255, 255, 1.5)', '#121314', 'rgb(255, 255, 255)'],
      ['rgba(255, 255, 255, -0.5)', '#121314', 'rgb(18, 19, 20)']
    ])('WHEN %s is laid over %s THEN it is %s', (colour, background, expected) => {
      expect(opaqueColourOf(colour, background)).toBe(expected);
    });
  });

  describe('GIVEN a colour the blend keeps', () => {
    it.each([
      ['an opaque colour', '#04395e', '#121314'],
      ['a colour that does not parse', 'not-a-colour', '#121314'],
      ['a background that does not parse', '#FFFFFF22', 'not-a-colour']
    ])('WHEN %s is laid over the background THEN it is kept as given', (_, colour, background) => {
      expect(opaqueColourOf(colour, background)).toBe(colour);
    });
  });
});
