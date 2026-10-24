import { FLOW_CYCLE_MS, FLOW_DASH_PX, FLOW_IDLE_MS } from '../common/flow.const.ts';
import type { FlowControl, GraphFlowDeps } from '../common/flow.type.ts';
import { drawFlow } from '../utils/flow-draw.util.ts';
import { flowPhaseOf, flowSegmentsOf } from '../utils/flow-geometry.util.ts';

/**
 * The flow overlay: while a task-mode highlight is on it redraws the highlighted edges' moving dashes once per frame,
 * from the camera and geometry of that frame, so Cytoscape never redraws for it. It idles `FLOW_IDLE_MS` after it starts
 * or the pointer last moved over the canvas; a pointer move never restarts it, the next highlight does. Under reduced
 * motion it never draws.
 */
export class GraphFlow implements FlowControl {
  private readonly deps: GraphFlowDeps;
  private readonly pen: CanvasRenderingContext2D | null;
  private color = '';
  private frameId: number | null = null;
  private idleId: number | null = null;

  public constructor(deps: GraphFlowDeps) {
    this.deps = deps;
    this.pen = deps.canvas.getContext('2d');
    deps.container.addEventListener('pointermove', (): void => this.moved());
  }

  public highlightChanged(isOn: boolean): void {
    const isReduced = this.deps.isReduced();
    const isAnimated = isOn && !isReduced;

    if (!isAnimated) {
      this.stop();

      return;
    }

    this.armIdle();

    if (this.frameId === null) this.schedule();
  }

  public moved(): void {
    if (this.frameId !== null) this.armIdle();
  }

  /** The camera moved: the dashes drawn for the old one go now, and the next frame draws at the new one. */
  public viewportChanged(): void {
    this.clear();
  }

  public stop(): void {
    if (this.frameId !== null) this.deps.cancelFrame(this.frameId);

    if (this.idleId !== null) this.deps.cancelAfter(this.idleId);

    this.frameId = null;
    this.idleId = null;
    this.clear();
  }

  public setColor(css: string): void {
    this.color = css;
  }

  private schedule(): void {
    this.frameId = this.deps.frame((): void => this.draw());
  }

  private draw(): void {
    const { edges, viewport, now } = this.deps;
    const { pan, zoom } = viewport();
    const segments = flowSegmentsOf(edges(), pan, zoom);
    const phasePx = flowPhaseOf(now(), FLOW_CYCLE_MS, 2 * FLOW_DASH_PX);

    this.clear();

    if (this.pen !== null) drawFlow(this.pen, segments, this.color, phasePx);

    this.schedule();
  }

  private armIdle(): void {
    if (this.idleId !== null) this.deps.cancelAfter(this.idleId);

    this.idleId = this.deps.after((): void => this.stop(), FLOW_IDLE_MS);
  }

  /** Clears the whole bitmap: the pen's device-pixel scale only makes the cleared box larger than the canvas. */
  private clear(): void {
    const { width, height } = this.deps.canvas;

    this.pen?.clearRect(0, 0, width, height);
  }
}
