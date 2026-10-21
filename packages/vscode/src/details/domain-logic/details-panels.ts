import { detailsApiOf } from './details-api.ts';
import { DetailsSession } from './details-session.ts';
import { fileLookupOf, panelPortsOf } from './panel-ports.ts';
import { publishEach } from './publish-each.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import { NOT_PACKAGE_TEXT } from '../../run/common/picker.const.ts';
import { packageOfFile } from '../../run/domain-logic/pick-for-file.ts';
import type { DetailsApi } from '../../shared/common/api.type.ts';
import { wirePanel } from '../../shared/domain-logic/panel-wiring.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { OPEN_FAILED_TEXT } from '../common/details.const.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { OpenPanel, PanelParts, PanelsDeps, PendingOpen } from '../common/panel.type.ts';
import { panelIdOf } from '../utils/panel-id.util.ts';
import { hasPackage, panelTitleOf, revealed } from '../utils/panel-package.util.ts';

/**
 * The open Package Details panels, one per root and package name. A key opened by row is registered as pending before
 * the root's load is awaited, so a second open of it waits for the same panel; an open from a manifest registers its key
 * only once the load has resolved, and ends silently when the root was replaced meanwhile. An open waits for a pending
 * open only when both wait on the same coordinator. A panel is made only for a package that is still in the root's model
 * once the load has resolved; a root removed meanwhile, even if added back, ends the open with no panel and no message.
 */
export class DetailsPanels {
  private readonly deps: PanelsDeps;
  private readonly panels = new Map<string, OpenPanel>();
  private readonly pending = new Map<string, PendingOpen>();
  private readonly offScripts: () => void;
  private isDisposed = false;

  public constructor(deps: PanelsDeps) {
    this.deps = deps;
    this.offScripts = deps.scripts.onDidChange(() => {
      this.refreshAll();
    });
  }

  /**
   * Opens or reveals the panel of `key`; `null` when none was made (a gone package in a live root shows the refusal text).
   * `loaded` is the coordinator whose load the caller has just awaited, so the open skips the wait (a second wait reloads
   * a root whose binary failed); when it is no longer the root's, the open ends silently and leaves pending opens alone.
   */
  public async open(key: PanelKey, loaded: Coordinator | null = null): Promise<OpenPanel | null> {
    const id = panelIdOf(key);
    const existing = this.panels.get(id);

    if (existing !== undefined) return revealed(existing);

    const coordinator = this.deps.roots.get(key.root)?.coordinator;
    const isStale = loaded !== null && loaded !== coordinator;

    if (isStale) return null;

    const waiting = this.pending.get(id);
    const isOtherLoad = waiting !== undefined && waiting.coordinator !== coordinator;

    if (waiting !== undefined && !isOtherLoad) return revealed(await waiting.panel);

    const panel = this.create(key, id, coordinator, loaded).finally(() => {
      this.forget(id, panel);
    });

    this.pending.set(id, { coordinator, panel });

    return panel;
  }

  /**
   * Opens the panel of the package the manifest `file` holds, refusing as the run pickers do except for a binary error:
   * a root that kept its model opens, and its panel shows the error.
   */
  public async openFile(file: string | null): Promise<OpenPanel | null> {
    const lookup = fileLookupOf(this.deps.roots, this.deps.host);
    const found = await packageOfFile(this.deps.roots, lookup.ports, file, false);
    const loaded = lookup.loaded();

    if (found === null || loaded === null) return null;

    return this.open({ root: found.root, packageName: found.pkg.name }, loaded);
  }

  /** Closes the panels of roots that are no longer in the store. */
  public pruneRoots(): void {
    const entries = this.deps.roots.all();
    const live = new Set(entries.map((entry) => entry.state.folder.root));

    for (const [id, panel] of this.panels) {
      const isLive = live.has(panel.key.root);

      if (!isLive) this.close(id);
    }
  }

  /** Asks every open panel to post a fresh state; a hidden or not ready one posts nothing, one that throws is logged. */
  public refreshAll(): void {
    publishEach(this.panels.values(), this.deps.host.log);
  }

  public api(): DetailsApi {
    return detailsApiOf(this.panels);
  }

  public dispose(): void {
    this.isDisposed = true;
    this.offScripts();

    const ids = Array.from(this.panels.keys());

    for (const id of ids) this.close(id);
  }

  /** Drops the pending entry of `id` unless a later open has replaced it. */
  private forget(id: string, panel: PendingOpen['panel']): void {
    const isOwn = this.pending.get(id)?.panel === panel;

    if (isOwn) this.pending.delete(id);
  }

  /** Whether `root` still has `before`, the coordinator whose load is waited for here unless the caller did (`loaded`). */
  private async isStillLoaded(root: string, before: Coordinator | undefined, loaded: Coordinator | null): Promise<boolean> {
    if (loaded === null) await before?.ensureLoaded();

    const after = this.deps.roots.get(root)?.coordinator;

    return before !== undefined && after === before;
  }

  private async create(
    key: PanelKey,
    id: string,
    before: Coordinator | undefined,
    loaded: Coordinator | null
  ): Promise<OpenPanel | null> {
    try {
      const isSameRoot = await this.isStillLoaded(key.root, before, loaded);

      if (this.isDisposed || !isSameRoot) return null;

      const isInModel = hasPackage(this.deps.roots.get(key.root)?.state.model, key.packageName);

      if (!isInModel) return this.refused();

      return this.build({ key, id, posted: [] });
    } catch (error: unknown) {
      this.deps.host.log(logTextOf(error));
      this.deps.host.error(OPEN_FAILED_TEXT);

      return null;
    }
  }

  private refused(): null {
    this.deps.host.info(NOT_PACKAGE_TEXT);

    return null;
  }

  /** A throw after the session reported the panel shown disposes both, so the root hears `false` once. */
  private build(parts: PanelParts): OpenPanel {
    const { host, roots, runs } = this.deps;
    const view = host.open(panelTitleOf(roots.get(parts.key.root)?.state.model, parts.key.packageName));
    const ports = panelPortsOf(this.deps, parts, view);
    const session = new DetailsSession(parts.key, roots, runs, ports);

    try {
      const panel = this.wire(parts, view, session);

      this.panels.set(parts.id, panel);

      return panel;
    } catch (error: unknown) {
      session.dispose();
      view.dispose();

      throw error;
    }
  }

  private wire(parts: PanelParts, view: OpenPanel['view'], session: DetailsSession): OpenPanel {
    const { key, id, posted } = parts;
    const close = (): void => {
      this.close(id);
    };

    wirePanel(view, session, close, this.deps.host.log);

    const panel: OpenPanel = { key, view, session, posted };

    return panel;
  }

  private close(id: string): void {
    const panel = this.panels.get(id);

    if (panel === undefined) return;

    this.panels.delete(id);
    panel.session.dispose();
    panel.posted.length = 0;
    panel.view.dispose();
  }
}
