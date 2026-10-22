import type { CanvasShown } from '../common/graph-inspection.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import { ghostMarksOf } from '../utils/ghost-marks.util.ts';
import { litOf } from '../utils/inspection-parts.util.ts';
import { paintOf } from '../utils/paint.util.ts';

const isSamePicking = (previous: Inspection, next: Inspection): boolean => {
  return previous.kind === 'picking' && next.kind === 'picking' && previous.start === next.start;
};

/**
 * The inspection on the canvas: the paint, a trace's hidden path packages as ghosts and, while picking, the
 * candidates the panel's filter leaves lit.
 */
export class InspectionCanvas {
  private readonly view: GraphView;
  private shown: CanvasShown | null = null;
  private filterText = '';
  private ghosts: string[] = [];

  public constructor(view: GraphView) {
    this.view = view;
  }

  /**
   * Paints `shown` and draws its ghosts, after the visible set it was built for (`setVisible` hides a ghost again);
   * the filter text survives only another picking from the same start that is no rebuild.
   */
  public draw(shown: CanvasShown, isRebuild: boolean): void {
    const previous = this.shown?.inspection ?? NO_INSPECTION;
    const isSameStart = isSamePicking(previous, shown.inspection);
    const ghosts = ghostMarksOf(shown.trace, shown.visible);

    if (isRebuild || !isSameStart) this.filterText = '';

    this.shown = shown;
    this.ghosts = ghosts.nodes;
    this.paint(shown);
    this.view.setGhosts(ghosts, shown.visible);
  }

  /** The picking filter changed: only the lights follow, as the panel updated its own lists. */
  public filter(text: string): void {
    this.filterText = text;

    if (this.shown !== null) this.paint(this.shown);
  }

  /** Forgets what was drawn, for a page about to show another graph or none. */
  public reset(): void {
    this.shown = null;
    this.ghosts = [];
  }

  /** The hidden path packages drawn as ghosts by the latest draw. */
  public ghostNodes(): string[] {
    return this.ghosts;
  }

  /** An empty filter lights every path candidate. */
  private paint(shown: CanvasShown): void {
    const lit = litOf(shown.candidates, shown.drawn.infos, this.filterText);
    const paint = paintOf(shown.inspection, shown.drawn.edges, shown.trace, lit);

    this.view.paint(paint);
  }
}
