/** The Codicon private-use character of each glyph a task or file node can show; `blank` holds the slot when there is no state. */
export const GLYPH_CODE_POINTS = {
  sync: '\uea77',
  pass: '\ueba4',
  error: '\uea87',
  'debug-stop': '\uead7',
  history: '\uea82',
  blank: '\uec03'
} as const;

/** How long page start waits for the codicon font before it draws plain labels. */
export const CODICON_WAIT_MS = 1000;

/** The font the glyph wait loads and the glyph sizer measures. */
export const CODICON_FONT = '13px codicon';

/** What the page logs once when the codicon font missed the wait, so task states show without glyphs. */
export const GLYPH_FALLBACK_WARNING = `graph page: the codicon font did not load in ${CODICON_WAIT_MS / 1000} s, so task states show without glyphs`;
