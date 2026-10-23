import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { wireToolbar } from './graph-toolbar-actions.ts';
import { viewHandlersOf } from './graph-view-handlers.ts';
import type { GraphController, GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';

/** Routes the host's messages and the view's events; the package side shows the states and draws the graph. */
class GraphPageController {
  public readonly view: GraphView;

  private readonly deps: GraphControllerDeps;
  private readonly frames: GraphFrames;
  private readonly packages: GraphPackageSide;

  public constructor(deps: GraphControllerDeps) {
    const { bridge, page } = deps;
    const frames = new GraphFrames(deps.now);
    const handlers = viewHandlersOf({
      frames,
      filtering: () => this.packages.filtering,
      layouts: () => this.packages.layouts
    });

    this.deps = deps;
    this.frames = frames;
    this.view = deps.createView(page.container, handlers);
    this.packages = new GraphPackageSide(deps, this.view, frames);
    const relayout = (): void => void this.packages.guard(async (): Promise<void> => this.packages.layouts.relayout());

    wireToolbar({ page, view: this.view, bridge, background: deps.background, relayout });
  }

  public receive(message: unknown): void {
    const at = this.deps.now();

    if (!isGraphHostMessage(message)) return;

    // `runs` and `showTasks` are accepted and ignored until task mode reads them.
    if (message.type === 'state') this.packages.show(message.state, at);
    else if (message.type === 'edgeExplained') this.packages.filtering.inspection.explained(message);
  }

  public facts(): ProbeFacts {
    const { filtering, layouts } = this.packages;
    const filteringFacts = filtering.facts();
    const facts: ProbeFacts = {
      firstFrameMs: (): number | null => this.frames.firstFrameMs(),
      layoutEngine: (): LayoutEngine | null => layouts.engine(),
      grouped: (): boolean => layouts.mode() === 'folders',
      ...filteringFacts
    };

    return facts;
  }
}

/** The graph page's controller; until the first valid host state nothing runs, so the page keeps its pre-state. */
export const createGraphController = (deps: GraphControllerDeps): GraphController => {
  const page = new GraphPageController(deps);
  const receive = (message: unknown): void => page.receive(message);
  const controller: GraphController = { receive, view: page.view, facts: page.facts() };

  return controller;
};
