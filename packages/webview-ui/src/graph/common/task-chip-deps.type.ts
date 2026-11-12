import type { TextMeasure } from './graph-page.type.ts';

/** What the count chips of an umbrella are measured and drawn with: `chipMeasure` their text, `glyphs` whether they carry glyphs. */
export type TaskChipDeps = {
  readonly chipMeasure: TextMeasure;
  readonly glyphs: boolean;
};
