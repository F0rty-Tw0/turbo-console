import type { AtomChipsPort } from './atom-chips.type.ts';
import type { TextMeasure } from './graph-page.type.ts';

/** What the count chips of an umbrella are measured and drawn with: `chipMeasure` their text, `glyphs` whether they carry glyphs. */
export type TaskChipDeps = {
  readonly chipMeasure: TextMeasure;
  readonly glyphs: boolean;
};

/** The chip rows' layer and builder task mode hands the Atomizer groups. */
export type TaskChipsDeps = {
  readonly chips: AtomChipsPort;
};
