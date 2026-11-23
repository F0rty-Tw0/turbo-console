import type { ImportsViewModel } from './details-imports.type.ts';
import type { DetailsElements, ImportsDetails } from './details-view.type.ts';
import type { TaskModes } from './graph-task.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { ModuleSitesFound } from '../../bridge/common/graph-module-sites.type.ts';

type ModuleSitesScanning = { readonly kind: 'scanning'; readonly previous: ModuleSitesFound | null };

type ModuleSitesFailedState = { readonly kind: 'failed' };

type ModuleSitesFoundState = { readonly kind: 'found'; readonly result: ModuleSitesFound };

/** The sites lookup of one drawn end or link: a re-ask of the same `{from, to}` keeps the answer it shows as `previous`. */
export type ModuleSitesState = ModuleSitesScanning | ModuleSitesFailedState | ModuleSitesFoundState;

type ModuleDetailsEmpty = { readonly kind: 'empty' };

type ModuleDetailsLoading = { readonly kind: 'loading'; readonly packageName: string };

export type ModuleDetailsFile = {
  readonly kind: 'file';
  readonly id: string;
  readonly path: string;
  readonly imports: ImportsViewModel;
  readonly importedBy: ImportsViewModel;
};

export type ModuleDetailsStub = {
  readonly kind: 'stub';
  readonly id: string;
  readonly name: string;
  readonly importedBy: ImportsViewModel;
};

export type ModuleDetailsLink = { readonly kind: 'link'; readonly title: string; readonly imports: ImportsViewModel };

/** What the modules Details panel shows for the selection, before any element is drawn. */
export type ModuleDetailsView = ModuleDetailsEmpty | ModuleDetailsLoading | ModuleDetailsFile | ModuleDetailsStub | ModuleDetailsLink;

/** Which list of an end a Details block shows; a link's one block lists as `imports`. */
export type ModuleDetailsList = 'imports' | 'importedBy';

export type ModuleDetailsBlock = {
  readonly list: ModuleDetailsList;
  readonly details: ImportsDetails;
};

/**
 * One built module Details view: its root `section.details-view`, its heading and Focus button (`null` where the kind
 * draws none: Focus for a link, both for the empty and loading leads), and its imports blocks in draw order.
 */
export type ModuleDetailsElements = {
  readonly root: HTMLElement;
  readonly heading: HTMLHeadingElement | null;
  readonly focus: HTMLButtonElement | null;
  readonly blocks: ModuleDetailsBlock[];
};

/** The module Details builders, handed in because `domain-logic` may not import `ui`. */
export type ModuleDetailsViews = {
  readonly details: () => DetailsElements;
  readonly view: (view: ModuleDetailsView, isFocused: boolean) => ModuleDetailsElements;
};

/** What the module Details report: Clear selection, a list's Scan again, Focus on the shown end, a list's Show more. */
export type ModuleDetailsActions = {
  readonly onClear: () => void;
  readonly onScanAgain: () => void;
  readonly onFocus: (target: string) => void;
  readonly onFold: (list: ModuleDetailsList) => void;
};

/** What `GraphModuleDetails` mounts in, builds its views with, posts to, saves its open state to and reports to. */
export type ModuleDetailsDeps = {
  readonly page: Pick<
    PageElements,
    'body' | 'details' | 'clear' | 'detailsBar' | 'detailsSummary' | 'packagesMode' | 'modeGroup' | 'controls'
  >;
  readonly views: ModuleDetailsViews;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly modes: Pick<TaskModes, 'savePanels'>;
  /** The package on screen, for openImport; null while off. */
  readonly packageName: () => string | null;
  /** The package Details aside the Details bar goes back to; built with the first package graph, so maybe null. */
  readonly packageAside: () => HTMLElement | null;
  readonly actions: ModuleDetailsActions;
};

/**
 * Where keyboard focus sat in a shown module Details view: a row, a block's Show more or Scan again, the Focus button,
 * or anything else in the view, which the heading stands for. `list` names the block (`null` outside one) and `site`
 * the row's `site.key` (`null` off a row).
 */
export type ModuleDetailsFocusKey = {
  readonly part: 'row' | 'more' | 'scan' | 'focus' | 'heading';
  readonly list: ModuleDetailsList | null;
  readonly site: string | null;
};
