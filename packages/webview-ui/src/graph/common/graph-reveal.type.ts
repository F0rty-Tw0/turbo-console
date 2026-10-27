import type { ControlsRowsHost } from './graph-controls.type.ts';
import type { DrawnGraph, GraphView } from './graph-page.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';

/** What a reveal asks of task mode: whether it owns the canvas, and the leave that hands it back. */
export type RevealTaskMode = {
  readonly isActive: () => boolean;
  readonly leave: () => void;
};

/** What a reveal asks of the package layouts: the checkbox's mode and whether a layout of it is in flight. */
export type RevealLayouts = {
  readonly isPlacing: () => boolean;
  readonly mode: () => LayoutGrouping;
};

export type RevealFolders = {
  readonly collapsed: () => ReadonlySet<string>;
  readonly expand: (folders: Iterable<string>) => void;
};

/** The controls a reveal edits, read at reveal time, and the collapsed folders it opens. */
type RevealFiltering = {
  readonly controls: Pick<ControlsRowsHost, 'mounted' | 'applied' | 'edit'>;
  readonly folders: RevealFolders;
};

export type RevealInspection = {
  readonly select: (name: string) => void;
};

/** What `PackageReveal` reads and drives: task mode, the package layouts and graph, the controls, the inspection and the camera. */
export type RevealDeps = {
  readonly tasks: RevealTaskMode;
  readonly layouts: RevealLayouts;
  /** The package graph shown or being laid out; `null` while none is. */
  readonly drawn: () => DrawnGraph | null;
  readonly filtering: RevealFiltering;
  readonly inspection: RevealInspection;
  readonly view: Pick<GraphView, 'viewport' | 'setViewport'>;
};
