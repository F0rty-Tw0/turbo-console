import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { DrawnGraph, GraphView } from '../common/graph-page.type.ts';
import { labelsOf } from '../utils/package-label.util.ts';
import { taskCountsDiffer } from '../utils/task-counts.util.ts';
import { restorePlanOf } from '../utils/view-restore.util.ts';

type RestoredInspection = {
  readonly mount: (saved: GraphViewState | null) => void;
  readonly restore: (saved: GraphViewState | null, visible: ReadonlySet<string>) => void;
};

type RestoredFiltering = {
  readonly restore: (saved: GraphViewState | null, graph: DrawnGraph, at: number) => ReadonlySet<string>;
  readonly inspection: RestoredInspection;
};

/** What a first draw restores into: the graph drawn, the opening state that must not move the camera, and the page parts. */
type DrawParts = {
  readonly drawn: DrawnGraph | null;
  readonly opening: GraphViewState | null;
  readonly frames: Pick<FrameClock, 'arm' | 'receivedAt'>;
  readonly filtering: RestoredFiltering;
  readonly view: Pick<GraphView, 'setLabels' | 'setViewport' | 'fit'>;
};

/** The Controls panel, which swaps in the relabelled graph itself. */
type ControlsRelabel = {
  readonly relabel: (graph: DrawnGraph) => void;
};

/** What a same-hash relabel writes: the canvas labels and the Controls rows. */
type RelabelParts = {
  readonly view: Pick<GraphView, 'setLabels'>;
  readonly controls: ControlsRelabel;
};

/** After a hash's first draw: the package labels, filters, inspection and the saved camera or a fit. */
export const restoreAfterDraw = (parts: DrawParts, saved: GraphViewState | null): void => {
  const { drawn, opening, frames, filtering, view } = parts;

  if (drawn === null) return;

  view.setLabels(drawn.labels);

  const camera = saved === opening ? null : saved;
  const plan = restorePlanOf(camera, drawn.hash);

  frames.arm();

  const visible = filtering.restore(saved, drawn, frames.receivedAt());

  filtering.inspection.mount(saved);

  if (plan.kind === 'restore') view.setViewport(plan.zoom, plan.pan);
  else view.fit();

  filtering.inspection.restore(saved, visible);
};

/**
 * A same-hash state's graph: the shown one with the new records and labels when their task counts or `scopeShown`
 * changed, else the shown one itself.
 */
export const refreshedDrawn = (shown: DrawnGraph, state: GraphReady): DrawnGraph => {
  const { packages, scopeShown } = state;
  const isRecounted = taskCountsDiffer(shown.infos, packages);
  const isRescoped = shown.scopeShown !== scopeShown;

  if (!isRecounted && !isRescoped) return shown;

  const labels = labelsOf(packages, scopeShown);
  const changed: DrawnGraph = { ...shown, infos: packages, scopeShown, labels };

  return changed;
};

/**
 * A changed same-hash graph repaints its labels in place: the canvas nodes, then the Controls rows once mounted (a state
 * arriving during the first layout leaves them to `build`). No layout, fit or post.
 */
export const relabel = (parts: RelabelParts, graph: DrawnGraph): void => {
  const { view, controls } = parts;

  view.setLabels(graph.labels);
  controls.relabel(graph);
};
