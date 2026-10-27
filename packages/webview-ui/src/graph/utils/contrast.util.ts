import { isRgba, rgbaOf } from './colour-parse.util.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { Rgba } from '../common/theme-colors.type.ts';

/** The 3:1 WCAG floor for non-text contrast, with a margin for anti-aliasing and rounding. */
const DIMMED_MIN_RATIO = 3.3;

/** 0.25 to 0.8 in 0.05 steps, built from hundredths so no step drifts off its two places. */
const DIMMED_STEPS = Array.from({ length: 12 }, (_, step: number): number => (25 + step * 5) / 100);

const DIMMED_MAX = 0.8;

const linearOf = (channel: number): number => {
  if (channel <= 0.04045) return channel / 12.92;

  const lifted = (channel + 0.055) / 1.055;

  return lifted ** 2.4;
};

const luminanceOf = ([red, green, blue]: Rgba): number => 0.2126 * linearOf(red) + 0.7152 * linearOf(green) + 0.0722 * linearOf(blue);

/** The WCAG ratio of two opaque colours, to two places. */
const ratioOf = (first: Rgba, second: Rgba): number => {
  const firstLuminance = luminanceOf(first);
  const secondLuminance = luminanceOf(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return Math.round(ratio * 100) / 100;
};

/** `foreground` drawn at `opacity`, its own alpha clamped to 0 to 1 included, over the opaque `background`. */
const blendOf = (foreground: Rgba, background: Rgba, opacity: number): Rgba => {
  const ownAlpha = Math.min(Math.max(foreground[3], 0), 1);
  const alpha = opacity * ownAlpha;
  const mix = (index: 0 | 1 | 2): number => alpha * foreground[index] + (1 - alpha) * background[index];
  const blended: Rgba = [mix(0), mix(1), mix(2), 1];

  return blended;
};

const byteOf = (unit: number): number => Math.round(unit * 255);

/**
 * `colour` laid over the opaque `background` as an opaque `rgb()`, since Cytoscape drops a fill's own alpha; an opaque
 * colour, or a pair that does not parse, is kept as given.
 */
export const opaqueColourOf = (colour: string, background: string): string => {
  const foreground = rgbaOf(colour);
  const base = rgbaOf(background);

  if (foreground === null || base === null || foreground[3] === 1) return colour;

  const blended = blendOf(foreground, base, 1);
  const bytes = blended.slice(0, 3).map(byteOf);

  return `rgb(${bytes.join(', ')})`;
};

/**
 * The WCAG contrast ratio of two colours (`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`), 1 to 21 to two places,
 * alpha not counted; 1, no contrast, when either does not parse.
 */
export const contrastRatioOf = (first: string, second: string): number => {
  const firstRgba = rgbaOf(first);
  const secondRgba = rgbaOf(second);

  if (firstRgba === null || secondRgba === null) return 1;

  return ratioOf(firstRgba, secondRgba);
};

/**
 * The opacity a dimmed element takes: the smallest 0.05 step from 0.25 at which every foreground, blended over
 * `background`, reads at least 3.3:1 against it; 0.8 when none does, so a dimmed element still reads dimmed; 0.25 when
 * a colour does not parse.
 */
export const dimmedOpacityOf = (background: string, foregrounds: string[]): number => {
  const base = rgbaOf(background);
  const parsed = foregrounds.map(rgbaOf);
  const colours = parsed.filter(isRgba);

  if (base === null || colours.length < foregrounds.length) return FALLBACK_COLORS.dimmedOpacity;

  const readsAt = (opacity: number): boolean => {
    const reads = (colour: Rgba): boolean => {
      const blended = blendOf(colour, base, opacity);

      return ratioOf(blended, base) >= DIMMED_MIN_RATIO;
    };

    return colours.every(reads);
  };
  const lowest = DIMMED_STEPS.find(readsAt);

  return lowest ?? DIMMED_MAX;
};
