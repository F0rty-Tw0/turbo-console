import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../common/frame-clock.type.ts';
import type { DrawnGraph, GraphView } from '../common/graph-page.type.ts';
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
  readonly view: Pick<GraphView, 'setViewport' | 'fit'>;
};

/** After a hash's first draw: filters, inspection and the saved camera or a fit. */
export const restoreAfterDraw = (parts: DrawParts, saved: GraphViewState | null): void => {
  const { drawn, opening, frames, filtering, view } = parts;

  if (drawn === null) return;

  const camera = saved === opening ? null : saved;
  const plan = restorePlanOf(camera, drawn.hash);

  frames.arm();

  const visible = filtering.restore(saved, drawn, frames.receivedAt());

  filtering.inspection.mount(saved);

  if (plan.kind === 'restore') view.setViewport(plan.zoom, plan.pan);
  else view.fit();

  filtering.inspection.restore(saved, visible);
};

/** A same-hash state's graph: the shown one with the new records when their task counts changed, else the shown one itself. */
export const refreshedDrawn = (shown: DrawnGraph, packages: GraphPackage[]): DrawnGraph => {
  const isChanged = taskCountsDiffer(shown.infos, packages);
  const changed: DrawnGraph = { ...shown, infos: packages };
  const refreshed = isChanged ? changed : shown;

  return refreshed;
};
