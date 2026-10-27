/** A Details aside and its `div.details-content`, which holds the shown view; the Details bar sits before it. */
export type DetailsElements = {
  readonly panel: HTMLElement;
  readonly content: HTMLElement;
};

/** `div.details-bar`: the selection summary and Clear selection, at the top of the mounted Details aside; `hidden` while nothing is selected. */
export type DetailsBarElements = {
  readonly bar: HTMLDivElement;
  readonly summary: HTMLElement;
  readonly clear: HTMLButtonElement;
};

/** The `data-view` of a view's root section. */
export type DetailsViewKind = 'empty' | 'package' | 'link' | 'picking' | 'trace' | 'folder';

/** Every view's root and title row; `close` always exists and is `hidden` while the panel is docked. */
export type DetailsViewBase = {
  readonly root: HTMLElement;
  readonly heading: HTMLHeadingElement;
  readonly close: HTMLButtonElement;
};

type EmptyParts = { readonly kind: 'empty' };

export type EmptyDetails = DetailsViewBase & EmptyParts;

/** A dependency or dependent row; `mark` is the hidden mark, `hidden` while the neighbour is visible. */
export type NeighbourItem = {
  readonly name: string;
  readonly pick: HTMLButtonElement;
  readonly explain: HTMLButtonElement;
  readonly mark: HTMLElement;
};

type PackageParts = {
  readonly kind: 'package';
  readonly openLabel: HTMLElement;
  readonly openDetails: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
  readonly exclude: HTMLButtonElement;
  readonly startTrace: HTMLButtonElement;
  /** Hidden for a package with no visible task. */
  readonly showTasks: HTMLButtonElement;
  readonly dependencies: NeighbourItem[];
  readonly dependents: NeighbourItem[];
};

export type PackageDetails = DetailsViewBase & PackageParts;

/** `explain` is the slot that holds the current `ExplainDetails.root`. */
type LinkParts = {
  readonly kind: 'link';
  readonly source: HTMLButtonElement;
  readonly target: HTMLButtonElement;
  readonly explain: HTMLElement;
};

export type LinkDetails = DetailsViewBase & LinkParts;

/** A candidate group; `empty` reads "None" or "No match" and is `hidden` while the list has items. */
export type PickingGroup = {
  readonly heading: HTMLElement;
  readonly list: HTMLUListElement;
  readonly empty: HTMLElement;
};

type PickingParts = {
  readonly kind: 'picking';
  readonly filter: HTMLInputElement;
  readonly groups: PickingGroup[];
  readonly cancel: HTMLButtonElement;
};

export type PickingDetails = DetailsViewBase & PickingParts;

type TraceParts = {
  readonly kind: 'trace';
  readonly lead: HTMLElement;
  readonly steps: HTMLOListElement;
  readonly clear: HTMLButtonElement;
  readonly swap: HTMLButtonElement;
};

export type TraceDetails = DetailsViewBase & TraceParts;

/** A folder's package row; `mark` is the hidden mark, `hidden` while the package is visible. */
export type FolderMemberItem = {
  readonly name: string;
  readonly pick: HTMLButtonElement;
  readonly mark: HTMLElement;
};

/** `toggle` reads Expand or Collapse, `focus` Focus folder or Clear focus. */
type FolderParts = {
  readonly kind: 'folder';
  readonly summary: HTMLElement;
  readonly toggle: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
  readonly exclude: HTMLButtonElement;
  readonly members: FolderMemberItem[];
};

export type FolderViewElements = DetailsViewBase & FolderParts;

export type ExcerptRowElements = {
  readonly row: HTMLElement;
  readonly number: HTMLElement;
  readonly text: HTMLElement;
};

export type ExplainEntry = {
  readonly label: HTMLElement;
  readonly rows: ExcerptRowElements[];
  readonly open: HTMLButtonElement;
};

/** The explain block of one `ExplainState`; parts a state does not draw are `null` or empty. */
export type ExplainDetails = {
  readonly root: HTMLElement;
  /** The file name in a found block's heading. */
  readonly file: HTMLElement | null;
  readonly text: HTMLElement | null;
  readonly entries: ExplainEntry[];
  readonly open: HTMLButtonElement | null;
};
