import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import type { ModuleLayoutDeps, ModuleRedraw } from '../common/module-mode.type.ts';
import type { ModuleScene, ModuleSceneView } from '../common/module-scene.type.ts';
import { elkModuleGraphOf } from '../utils/elk-module-graph.util.ts';
import { moduleSceneOf } from '../utils/module-scene.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

/** The runner key of a view: its package, expansion and shown kinds, so a toggle lays out afresh. */
const layoutKeyOf = (view: ModulesViewState): string => {
  const drawn = { expanded: view.expanded, shown: view.shown };

  return `modules:${view.packageName}:${JSON.stringify(drawn)}`;
};

const sceneViewOf = (view: ModulesViewState): ModuleSceneView => {
  const sceneView: ModuleSceneView = { expanded: view.expanded ?? [], shown: view.shown };

  return sceneView;
};

/**
 * The modules graph's layout (spec §7.4): builds the scene, lays it out on the shared runner (latest call wins, and a
 * `clear` drops the run in flight), shows it and places the camera as `redraw` says. A draw that throws while it is
 * still the one asked for last empties the canvas and goes to `onFailure`; one a newer draw or a `clear` overtook is dropped.
 */
export class GraphModuleLayout {
  private readonly deps: ModuleLayoutDeps;
  private drawn: ModuleScene | null = null;
  private ticket = 0;

  public constructor(deps: ModuleLayoutDeps) {
    this.deps = deps;
  }

  public async draw(found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw): Promise<void> {
    this.ticket += 1;

    const { ticket } = this;

    try {
      await this.layOut(found, view, redraw, ticket);
    } catch (error: unknown) {
      if (ticket !== this.ticket) return;

      this.clear();
      this.deps.onFailure(error);
    }
  }

  /** The scene on screen; `null` before the first draw and after `clear`. */
  public scene(): ModuleScene | null {
    return this.drawn;
  }

  /** Empties the canvas and drops the run in flight, so it lands on nothing. */
  public clear(): void {
    this.ticket += 1;
    this.drawn = null;
    this.deps.view.modules.clear();
  }

  /** Builds the scene and lays it out; a run that lands after `ticket` was overtaken, or that the runner dropped, shows nothing. */
  private async layOut(found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw, ticket: number): Promise<void> {
    const tree = moduleTreeOf(found.files);
    const scene = moduleSceneOf(tree, found, sceneViewOf(view));
    const graph = elkModuleGraphOf(scene, this.deps.measures);
    const key = layoutKeyOf(view);
    const result = await this.deps.runner.run(key, graph);
    const isOvertaken = ticket !== this.ticket;

    if (result === null || isOvertaken) return;

    this.place(scene, result, view, redraw);
  }

  /**
   * Shows the scene, then the graph view with its engine notice, then the camera, then arms the frame clock, as the task
   * layout does. The graph view replaces a "Layout failed" message, so a Refresh or Retry that draws recovers the page.
   */
  private place(scene: ModuleScene, result: LayoutResult, view: ModulesViewState, redraw: ModuleRedraw): void {
    const { modules } = this.deps.view;
    const before = this.anchorCentreOf(redraw);

    modules.show({ scene, positions: result.positions, routes: result.routes, measures: this.deps.measures });
    this.drawn = scene;
    this.deps.showGraph(result.engine === 'fallback');
    this.placeCamera(view, redraw, before);
    this.deps.frames.arm();
  }

  /** `first`: the saved camera, else open; `keep`: as it is; `anchor`: the folder's centre stays put; `fit`: a fit. */
  private placeCamera(view: ModulesViewState, redraw: ModuleRedraw, before: Position | null): void {
    const { camera } = view;

    switch (redraw.kind) {
      case 'first':
        if (camera === null) this.deps.view.open();
        else this.deps.view.setViewport(camera.zoom, camera.pan);
        break;
      case 'keep':
        break;
      case 'anchor':
        this.anchor(redraw.id, before);
        break;
      case 'fit':
        this.deps.view.fit();
        break;
    }
  }

  /** The anchored folder's centre on screen before the redraw; `null` for any other redraw. */
  private anchorCentreOf(redraw: ModuleRedraw): Position | null {
    if (redraw.kind !== 'anchor') return null;

    return this.deps.view.modules.renderedCentre(redraw.id);
  }

  /** Pans by how far `id` moved on screen, so a toggled folder stays under the pointer. */
  private anchor(id: string, before: Position | null): void {
    const { view } = this.deps;
    const after = view.modules.renderedCentre(id);

    if (before === null || after === null) return;

    const { zoom, pan } = view.viewport();
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const shifted: Position = { x: pan.x - dx, y: pan.y - dy };

    view.setViewport(zoom, shifted);
  }
}
