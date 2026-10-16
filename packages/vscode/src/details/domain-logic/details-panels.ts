import { detailsApiOf } from './details-api.ts';
import { DetailsSession } from './details-session.ts';
import { ensureLoadedWith, panelPortsOf } from './panel-ports.ts';
import { NOT_PACKAGE_TEXT } from '../../run/common/picker.const.ts';
import type { FileLookupPorts } from '../../run/common/picker.type.ts';
import { packageOfFile } from '../../run/domain-logic/pick-for-file.ts';
import type { DetailsApi } from '../../shared/common/api.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { OPEN_FAILED_TEXT } from '../common/details.const.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { OpenPanel, PanelParts, PanelsDeps } from '../common/panel.type.ts';
import { panelIdOf } from '../utils/panel-id.util.ts';

const revealed = (panel: OpenPanel | null): OpenPanel | null => {
  panel?.view.reveal();

  return panel;
};

/**
 * The open Package Details panels, one per root and package name. A key is registered as pending before the root's load
 * is awaited, so a second open of it waits for the same panel. A panel is made only for a package that is still in the
 * root's model once the load has resolved; a root removed meanwhile, even if added back, ends the open with no panel and
 * no message.
 */
export class DetailsPanels {
  private readonly deps: PanelsDeps;
  private readonly panels = new Map<string, OpenPanel>();
  private readonly pending = new Map<string, Promise<OpenPanel | null>>();
  private isDisposed = false;

  public constructor(deps: PanelsDeps) {
    this.deps = deps;
  }

  /**
   * Opens or reveals the panel of `key`; `null` when none was made (a gone package in a live root shows the refusal text).
   * `isLoaded` skips the wait for a root the caller has just loaded: a second wait reloads a root whose binary failed.
   */
  public async open(key: PanelKey, isLoaded = false): Promise<OpenPanel | null> {
    const id = panelIdOf(key);
    const existing = this.panels.get(id);

    if (existing !== undefined) return revealed(existing);

    const waiting = this.pending.get(id);

    if (waiting !== undefined) return revealed(await waiting);

    const creating = this.create(key, id, isLoaded).finally(() => {
      this.pending.delete(id);
    });

    this.pending.set(id, creating);

    return creating;
  }

  /**
   * Opens the panel of the package the manifest `file` holds, refusing as the run pickers do except for a binary error:
   * a root that kept its model opens, and its panel shows the error.
   */
  public async openFile(file: string | null): Promise<OpenPanel | null> {
    const found = await packageOfFile(this.deps.roots, this.lookupPorts(), file, false);

    if (found === null) return null;

    return this.open({ root: found.root, packageName: found.pkg.name }, true);
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

  public api(): DetailsApi {
    return detailsApiOf(this.panels);
  }

  public dispose(): void {
    this.isDisposed = true;

    const ids = Array.from(this.panels.keys());

    for (const id of ids) this.close(id);
  }

  private lookupPorts(): FileLookupPorts {
    const { roots, host } = this.deps;
    const ensureLoaded = ensureLoadedWith(roots);
    const ports: FileLookupPorts = { ensureLoaded, rootOf: host.rootOf, info: host.info };

    return ports;
  }

  private async create(key: PanelKey, id: string, isLoaded: boolean): Promise<OpenPanel | null> {
    try {
      const before = this.deps.roots.get(key.root);

      if (!isLoaded) await before?.coordinator.ensureLoaded();

      const after = this.deps.roots.get(key.root);
      const isSameRoot = before !== undefined && after?.coordinator === before.coordinator;

      if (this.isDisposed || !isSameRoot) return null;

      const isInModel = this.hasPackage(key);

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

  private hasPackage(key: PanelKey): boolean {
    const model = this.deps.roots.get(key.root)?.state.model;

    return model?.packages.some((pkg) => pkg.name === key.packageName) ?? false;
  }

  /** A throw after the session reported the panel shown disposes both, so the root hears `false` once. */
  private build(parts: PanelParts): OpenPanel {
    const { host, roots, runs } = this.deps;
    const view = host.open(`Package Details: ${cleanText(parts.key.packageName, LABEL_MAX)}`);
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
    const report = (error: unknown): void => {
      this.deps.host.log(logTextOf(error));
    };

    view.onDispose(() => {
      this.close(id);
    });
    view.onMessage((value) => {
      void session.receive(value).catch(report);
    });
    session.setVisible(view.isVisible());
    view.onViewState(() => {
      session.setVisible(view.isVisible());
    });

    const started = session.start(true).catch(report);
    const panel: OpenPanel = { key, view, session, started, posted };

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
