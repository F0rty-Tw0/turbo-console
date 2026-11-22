/** The modules bar under the toolbar (spec §7.4), built once by `buildModulesBar`; CSS shows it only in modules mode. */
export type ModulesBarElements = {
  /** `div#graph-modules-bar`. */
  readonly bar: HTMLElement;
  readonly back: HTMLButtonElement;
  /** "Modules of <package>". */
  readonly title: HTMLElement;
  readonly refresh: HTMLButtonElement;
  /** The counts line; its `title` attribute holds the external, assets and self counts. */
  readonly status: HTMLElement;
  /** The partial, failed or empty scan's text with Retry; hidden when there is none. */
  readonly banner: HTMLElement;
  readonly bannerText: HTMLElement;
  /** Shown only with the failed banner. */
  readonly retry: HTMLButtonElement;
  /** `MODULE_SLOW_TEXT`, hidden unless more than `MODULE_SHOWN_CAP` leaves are drawn. */
  readonly slow: HTMLElement;
  readonly types: HTMLInputElement;
  readonly tests: HTMLInputElement;
  readonly lazies: HTMLInputElement;
  readonly reset: HTMLButtonElement;
};
