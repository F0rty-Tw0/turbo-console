import { graphApiOf } from './graph-api.ts';
import { graphPortsOf } from './graph-panel-ports.ts';
import { GraphSession } from './graph-session.ts';
import type { GraphApi } from '../../shared/common/api.type.ts';
import { wirePanel } from '../../shared/domain-logic/panel-wiring.ts';
import type { GraphOpener, GraphPanelsDeps, OpenGraphPanel } from '../common/graph-panel.type.ts';
import { graphTitleOf } from '../utils/graph-webview.util.ts';

/**
 * The open Package Graph panels, one per root. A root with no entry opens nothing; a throw from `host.open` leaves no
 * panel. A panel closed by the user, by `pruneRoots` or by `dispose` disposes its session and view and empties `posted`.
 */
export class GraphPanels implements GraphOpener {
  private readonly deps: GraphPanelsDeps;
  private readonly panels = new Map<string, OpenGraphPanel>();

  public constructor(deps: GraphPanelsDeps) {
    this.deps = deps;
  }

  /** Opens or reveals the panel of `root`; `null` when the store has no such root. */
  public open(root: string): OpenGraphPanel | null {
    const existing = this.panels.get(root);

    if (existing !== undefined) {
      existing.view.reveal();

      return existing;
    }

    const folder = this.deps.roots.get(root)?.state.folder;

    if (folder === undefined) return null;

    return this.build(root, graphTitleOf(folder.name));
  }

  /** Closes the panels of roots that are no longer in the store. */
  public pruneRoots(): void {
    const entries = this.deps.roots.all();
    const live = new Set(entries.map((entry) => entry.state.folder.root));

    for (const root of Array.from(this.panels.keys())) {
      const isLive = live.has(root);

      if (!isLive) this.close(root);
    }
  }

  public api(): GraphApi {
    return graphApiOf(this.panels, this.deps.host.readCache);
  }

  public dispose(): void {
    for (const root of Array.from(this.panels.keys())) this.close(root);
  }

  /** A throw after the session reported the panel shown disposes both, so the root hears `false` once. */
  private build(root: string, title: string): OpenGraphPanel {
    const view = this.deps.host.open(title);
    const posted: OpenGraphPanel['posted'] = [];
    const session = new GraphSession(root, this.deps.roots, graphPortsOf(this.deps, root, posted, view));

    try {
      const panel = this.wire({ root, view, session, posted }, session);

      this.panels.set(root, panel);

      return panel;
    } catch (error: unknown) {
      session.dispose();
      view.dispose();

      throw error;
    }
  }

  private wire(panel: OpenGraphPanel, session: GraphSession): OpenGraphPanel {
    const close = (): void => {
      this.close(panel.root);
    };

    wirePanel(panel.view, session, close, this.deps.host.log);

    return panel;
  }

  private close(root: string): void {
    const panel = this.panels.get(root);

    if (panel === undefined) return;

    this.panels.delete(root);
    panel.session.dispose();
    panel.posted.length = 0;
    panel.view.dispose();
  }
}
