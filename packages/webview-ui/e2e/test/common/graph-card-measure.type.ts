/** What the page measures: the glyph slot and `name` at bold, in the font list the card sizer measures with. */
export type BoldRow = {
  readonly name: string;
  readonly isGlyphed: boolean;
  readonly blank: string;
  readonly px: number;
};

/** The glyphs to measure at bold weight, in the codicon font, and the px size the same glyphs are measured at in the body font alone. */
export type BoldGlyphs = {
  readonly font: string;
  readonly glyphs: string[];
  readonly px: number;
};

/** The bold advances of a set of glyphs: in the codicon font, and in the body font family alone, where no font has them. */
export type BoldGlyphWidths = {
  readonly codicon: number[];
  readonly body: number[];
};

/** A font and the text `document.fonts.check` asks about. */
export type FontCheck = {
  readonly font: string;
  readonly text: string;
};
