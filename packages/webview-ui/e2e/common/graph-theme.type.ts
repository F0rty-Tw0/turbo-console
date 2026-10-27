type CssVars = Readonly<Record<string, string>>;

/** Cytoscape-resolved colours as `rgb(r, g, b)`; compared with whitespace stripped. */
export type ExpectedThemeColors = {
  readonly fill: string;
  readonly label: string;
  readonly frame: string;
  readonly edge: string;
  readonly selected: string;
  /** A selected node's fill: the list's active selection, or the editor background in a theme without one. */
  readonly selectedFill: string;
};

export type ThemeStub = {
  readonly bodyClass: string;
  readonly vars: CssVars;
  readonly expected: ExpectedThemeColors;
};

/** The names the in-page theme switch clears, then the variables and body class it sets. */
export type ThemeSwitch = {
  readonly names: string[];
  readonly theme: ThemeStub;
};

/** The label texts to measure in the page's font family at `font` (weight and size, as in `bold 13px`). */
export type LabelFontInput = {
  readonly texts: string[];
  readonly font: string;
};
