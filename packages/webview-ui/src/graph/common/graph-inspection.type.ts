import type { DetailsViews } from './details.type.ts';
import type { FolderScene } from './folder-scene.type.ts';
import type { DetailsContext, ShownInspection } from './graph-details.type.ts';
import type { ControlsViewFields, DrawnGraph, GraphView, PageElements, ViewStateSaver } from './graph-page.type.ts';
import type { Inspection, InspectionInput, LinkInspection } from './inspection.type.ts';
import type { TraceCandidates, TraceResult } from './trace.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/** What a same-hash state does: relabel the shown package in place, and ask again for the shown link's entry (`null`: none). */
export type SameHashPlan = {
  readonly isUpdate: boolean;
  readonly reask: LinkInspection | null;
};

/** What an input does: the next inspection, the package the camera centres, and whether the keep-clear pan follows. */
export type InputPlan = {
  readonly next: Inspection;
  readonly centre: string | null;
  readonly isKeepClear: boolean;
};

/** What the canvas draws for an inspection: the graph and visible set it was built for, its trace and its candidates. */
export type CanvasShown = {
  readonly inspection: Inspection;
  readonly drawn: DrawnGraph;
  readonly visible: ReadonlySet<string>;
  readonly trace: TraceResult | null;
  readonly candidates: TraceCandidates | null;
};

/** What showing an inspection builds: the details view and its context, what the canvas draws, and the status text. */
export type ShownParts = {
  readonly details: ShownInspection;
  readonly context: DetailsContext;
  readonly canvas: CanvasShown;
  readonly status: string;
};

/** What a save writes besides the camera and the controls: the inspection and whether Details is open. */
export type InspectionSave = {
  readonly inspection: Inspection;
  readonly detailsOpen: boolean;
};

/** The folder hooks the inspection canvas runs: the scene its paint covers and the folder pass after its ghosts. */
export type CanvasFolders = {
  readonly scene: () => FolderScene | null;
  readonly show: () => void;
};

/** The collapsed folders as the inspection reaches into them: the scene, expanding some, and Enter's toggle. */
export type InspectionFolders = {
  readonly scene: () => FolderScene | null;
  readonly expand: (folders: Iterable<string>) => void;
  readonly toggle: (folder: string) => void;
};

export type GraphInspectionDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly view: GraphView;
  readonly saver: ViewStateSaver;
  readonly now: () => number;
  /** The details view builders, handed in because `domain-logic` may not import `ui`. */
  readonly views: DetailsViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The graph shown or being laid out; `null` while the page shows no graph. */
  readonly drawn: () => DrawnGraph | null;
  /** The package names the controls leave visible. */
  readonly visible: () => ReadonlySet<string>;
  /** The focused package, `null` with no focus. */
  readonly focus: () => string | null;
  /** The focused folder, `null` with no folder focus. */
  readonly focusedFolder: () => string | null;
  /** The controls fields every save carries along. */
  readonly controls: () => ControlsViewFields;
  /** The inspected package changed or was forgotten; `null` for none. */
  readonly onSelected: (name: string | null) => void;
  readonly onFocusOn: (name: string) => void;
  readonly onExclude: (name: string) => void;
  readonly onShow: (name: string) => void;
  /** Whether "Show" can re-tick `name` alone to draw it again. */
  readonly canShow: (name: string) => boolean;
  readonly onFocusFolder: (folder: string) => void;
  /** Clears a folder focus only. */
  readonly onClearFocus: () => void;
  readonly onExcludeFolder: (folder: string) => void;
  readonly onShowFolder: (folder: string) => void;
  /** The checkbox's mode and the mode on screen are both grouped, so a folder tap may act. */
  readonly canAct: () => boolean;
  readonly folders: CanvasFolders & InspectionFolders;
};

/** What the keep-clear pan reads: the canvas, the page's container, the details aside, the inspection and its drawn ghosts. */
export type KeepClearDeps = {
  readonly view: GraphView;
  readonly page: PageElements;
  /** The details panel while it overlays the canvas. */
  readonly aside: HTMLElement;
  readonly inspection: Inspection;
  readonly ghostNodes: string[];
};

/** What the details panel, `Clear selection` and the container's keys ask of `GraphInspection`. */
export type InspectionActions = {
  readonly input: (input: InspectionInput) => void;
  /** Each keystroke in the picking filter box. */
  readonly filter: (text: string) => void;
  readonly openDetailsOf: (name: string) => void;
  /** Enter on the graph container. */
  readonly enter: () => void;
  readonly save: () => void;
  readonly keepClear: () => void;
};
