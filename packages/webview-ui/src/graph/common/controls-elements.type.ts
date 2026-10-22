/** One package row of the list: its show checkbox, name button and focus button. */
export type ControlsRow = {
  readonly name: string;
  readonly line: HTMLElement;
  readonly check: HTMLInputElement;
  readonly pick: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
};

/** One folder of the list: its header line, group checkbox, Expand or Collapse button and Focus button, then its rows in list order. */
export type ControlsGroup = {
  readonly folder: string;
  readonly line: HTMLElement;
  readonly check: HTMLInputElement;
  /** The header's Expand or Collapse button; `hidden` while the page is flat. */
  readonly toggle: HTMLButtonElement;
  /** The header's Focus or Clear focus button; `hidden` while the page is flat. */
  readonly focus: HTMLButtonElement;
  readonly rows: ControlsRow[];
};

/** The controls panel's elements, built once per graph hash by `buildControls`. */
export type ControlsElements = {
  /** `aside#graph-controls`. */
  readonly panel: HTMLElement;
  readonly search: HTMLInputElement;
  readonly depth: HTMLInputElement;
  /** The Group by folder checkbox, unchecked until `restore` or a click. */
  readonly grouping: HTMLInputElement;
  /** One checkbox per tag; empty when no package has tags, and then the panel has no tag fieldset. */
  readonly tags: Map<string, HTMLInputElement>;
  /** Dimmed with `aria-disabled`, never `disabled`, so it stays a Tab stop. */
  readonly showAll: HTMLButtonElement;
  /** The count line: `role=status`, `aria-live=polite`. */
  readonly count: HTMLElement;
  /** `role=grid`: group headers and package rows, in list order. */
  readonly list: HTMLElement;
  readonly groups: ControlsGroup[];
};
