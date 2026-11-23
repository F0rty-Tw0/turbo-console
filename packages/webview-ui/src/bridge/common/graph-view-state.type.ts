import type { Position } from './graph-state.type.ts';

/** A saved link: the package it leaves and the package it enters. */
export type GraphLinkRef = { readonly source: string; readonly target: string };

/** A saved trace: the package it starts at and the package it ends at. */
export type GraphTraceRef = { readonly start: string; readonly end: string };

type PackageFocus = { readonly kind: 'package'; readonly name: string };

type FolderFocus = { readonly kind: 'folder'; readonly folder: string };

/** What the controls narrow the graph to: one package and its neighbours (within the filters' depth), or the packages of one folder (`''` is the root folder). */
export type GraphFocus = PackageFocus | FolderFocus;

/** Which graph the page draws: the package graph, the task graph or one package's module graph. */
export type GraphViewMode = 'packages' | 'tasks' | 'modules';

/** What task mode keeps: the chosen task ids, whether the cap is lifted, the Dependents depth, the selection, the search, the camera and the key of its last layout. */
export type TaskViewState = {
  readonly chosen: string[];
  readonly capLifted: boolean;
  readonly depth: number;
  readonly selected: string | null;
  readonly search: string;
  readonly zoom: number;
  readonly pan: Position;
  /**
   * Whether the camera is where a fit left it, so a restore fits the container it lands in; an old save reads `false`. With
   * no layout key it also says how the pending layout draws: `true` fits it (a regroup), `false` opens it.
   */
  readonly fitted: boolean;
  readonly layoutKey: string;
};

/** The modules camera; the bridge restates `Viewport` so it imports nothing from `graph/`. */
export type ModulesCamera = { readonly zoom: number; readonly pan: Position };

/** A selected file or stub card: `'file:<path>'` or `'pkg:<name>'`, never a folder (C4). */
type ModuleNodeSelection = { readonly kind: 'node'; readonly id: string };

/** A selected link between two drawn end ids, importer → imported. */
type ModuleLinkSelection = { readonly kind: 'link'; readonly source: string; readonly target: string };

/** What the modules view has selected: a file or stub card, or a link between two drawn ends. */
export type ModuleSelection = ModuleNodeSelection | ModuleLinkSelection;

/** Which kinds of module the modules graph draws. */
export type ModulesShown = { readonly types: boolean; readonly tests: boolean; readonly lazies: boolean };

/**
 * The saved modules view (spec §7.1): `expanded` lists folder paths, never the root; `null` means not set up yet, so the
 * first Shown applies `defaultExpandedOf`. `camera: null` fits on the first Shown. `selected` and `focus` read `null` and
 * `depth` reads `DEFAULT_DEPTH` from an old save; `focus` holds only a `'file:'` or `'pkg:'` id.
 */
export type ModulesViewState = {
  readonly packageName: string;
  readonly expanded: string[] | null;
  readonly shown: ModulesShown;
  readonly camera: ModulesCamera | null;
  readonly selected: ModuleSelection | null;
  readonly focus: string | null;
  /** `MIN_DEPTH..MAX_DEPTH`; out of range reads `DEFAULT_DEPTH`. */
  readonly depth: number;
};

/** Panel widths in px: the preferred pair when saved, the drawn pair when painted. */
export type PanelWidths = { readonly controls: number; readonly details: number };

/** What the graph page keeps in the webview state: the camera, the selection, the controls panel and the inspection for one graph hash. */
export type GraphViewState = {
  readonly hash: string;
  readonly zoom: number;
  readonly pan: Position;
  /** Whether the camera is where a fit left it, so a restore fits the container it lands in; an old save reads `false`. */
  readonly fitted: boolean;
  readonly selected: string | null;
  readonly controlsOpen: boolean;
  readonly search: string;
  readonly depth: number;
  readonly hidden: string[];
  readonly focus: GraphFocus | null;
  readonly tags: string[];
  /** Whether the details panel is open; one state for both layouts, docked and overlay. */
  readonly detailsOpen: boolean;
  readonly link: GraphLinkRef | null;
  readonly trace: GraphTraceRef | null;
  /** The inspected folder key (`''` is the root folder); a folder inspection saves it. */
  readonly folder: string | null;
  /** Whether the page is grouped by folder; carried across a hash change. */
  readonly grouped: boolean;
  /** The collapsed folder keys; kept while the page is flat and carried across a hash change minus the folders the new hash lacks. */
  readonly collapsed: string[];
  /** Which graph the page draws; an old save reads `'packages'`. */
  readonly mode: GraphViewMode;
  /** The last task view; kept across package saves and hash changes, `null` until task mode saves one. */
  readonly task: TaskViewState | null;
  /** The last modules view; kept across package and task saves, `null` until modules mode saves one. */
  readonly modules: ModulesViewState | null;
  /** The panel widths the user chose, once per page; `null` until a drag, key or reset saves them. */
  readonly panelWidths: PanelWidths | null;
};

/** The view state the package graph saves: everything but the mode, the task view, the modules view and the panel widths, which `ViewStateModes` adds. */
export type PackageViewState = Omit<GraphViewState, 'mode' | 'task' | 'modules' | 'panelWidths'>;
