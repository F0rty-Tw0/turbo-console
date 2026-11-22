import type { GraphPackageModulesMessage, GraphShowModulesMessage, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleExit, ModuleModeDeps, ModulePhase, ModuleRedraw } from '../common/module-mode.type.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';
import { defaultExpandedOf } from '../utils/module-expand.util.ts';
import { moduleGoneTextOf } from '../utils/module-text.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const OFF: ModulePhase = { kind: 'off' };

const FIRST: ModuleRedraw = { kind: 'first' };

const KEEP: ModuleRedraw = { kind: 'keep' };

/**
 * One package's modules (spec §7.1, §7.2): Waiting for the first graph state, Loading its scan, Shown or Failed. It keeps
 * the last graph state it read, whose hash its saves start from and whose `singlePackage` says where Back leaves to.
 */
export class GraphModuleMode {
  private readonly deps: ModuleModeDeps;
  private current: ModulePhase = OFF;
  private latest: GraphReady | null = null;
  /** A host message replaced the page while active; the next graph state still listing the package shows it again. */
  private isSuspended = false;

  public constructor(deps: ModuleModeDeps) {
    this.deps = deps;
  }

  public isActive(): boolean {
    return this.current.kind !== 'off';
  }

  public phase(): ModulePhase {
    return this.current;
  }

  public view(): ModulesViewState | null {
    return this.deps.modes.modules();
  }

  /** Shows `packageName`'s modules, parking task mode first; the same package already waited on, loading or shown is ignored. */
  public enter(packageName: string): void {
    const { current, deps } = this;
    const isSame = current.kind !== 'off' && current.kind !== 'failed' && current.name === packageName;

    if (isSame) return;

    if (current.kind === 'off') this.parkOthers();

    const saved = deps.modes.modules();
    const fresh = freshModulesViewOf(packageName);
    const view = saved?.packageName === packageName ? saved : fresh;

    deps.modes.saveModules(view, this.hash());
    deps.screen.scanning(packageName);

    if (this.latest === null) {
      this.current = { kind: 'waiting', name: packageName };

      return;
    }

    this.current = { kind: 'loading', name: packageName };
    this.ask(packageName);
  }

  /** Back: the Shown camera is saved, then the page leaves to tasks on a single-package repo, to packages otherwise. */
  public leave(): void {
    if (this.current.kind === 'off') return;

    this.saveCamera();

    const to: ModuleExit = this.latest?.singlePackage === true ? 'tasks' : 'packages';

    this.current = OFF;
    this.isSuspended = false;

    if (to === 'packages') this.deps.modes.setMode('packages', this.hash());

    this.deps.screen.exit();
    this.deps.onExit(to);
  }

  /** A host message replaced the page (spec §7.2): the next graph state still listing the package takes it back. */
  public suspend(): void {
    this.isSuspended = this.isActive();
  }

  /** Every graph state: a package gone from it leaves with a notice, a suspended page comes back, and Waiting asks for the scan. */
  public received(state: GraphReady): void {
    const { current } = this;

    this.latest = state;

    if (current.kind === 'off') return;

    const isListed = state.packages.some(({ name }): boolean => name === current.name);

    if (!isListed) {
      this.leave();
      this.deps.notice(moduleGoneTextOf(current.name));

      return;
    }

    if (this.isSuspended) this.resume(current);

    if (current.kind !== 'waiting') return;

    this.current = { kind: 'loading', name: current.name };
    this.ask(current.name);
  }

  /**
   * The host's scan of the package on screen, received at `at`; a reply for another package, or before any ask, is
   * ignored. A found scan starts the frame clock at `at`, so its draw's first frame is timed from the reply.
   */
  public scanned(message: GraphPackageModulesMessage, at: number): void {
    const { current } = this;
    const isAsked = current.kind === 'loading' || current.kind === 'shown' || current.kind === 'failed';

    if (!isAsked || current.name !== message.packageName) return;

    const { result } = message;

    if (result.kind === 'found') {
      this.deps.frames.start(at);
      this.show(current.name, result, current.kind === 'shown');

      return;
    }

    const kept = current.kind === 'loading' ? null : current.found;

    this.current = { kind: 'failed', name: current.name, found: kept };
    this.deps.screen.failed(current.name);
  }

  /** Refresh and Retry ask again; nothing is asked while Waiting, which asks on the first graph state. */
  public refresh(): void {
    const { current } = this;
    const isAsked = current.kind === 'loading' || current.kind === 'shown' || current.kind === 'failed';

    if (isAsked) this.ask(current.name);
  }

  public receive(message: GraphPackageModulesMessage | GraphShowModulesMessage, at: number): void {
    if (message.type === 'showModules') this.enter(message.name);
    else this.scanned(message, at);
  }

  public saveCamera(): void {
    const view = this.view();

    if (this.current.kind !== 'shown' || view === null) return;

    const camera = this.deps.viewport();
    const saved: ModulesViewState = { ...view, camera };

    this.deps.modes.saveModules(saved, this.hash());
  }

  /** Saves `view` and, while Shown, draws it again placed by `redraw`. */
  public update(view: ModulesViewState, redraw: ModuleRedraw): void {
    const { current } = this;

    this.deps.modes.saveModules(view, this.hash());

    if (current.kind === 'shown') this.deps.screen.shown(current.name, current.found, view, redraw);
  }

  /** A found scan: the default expansion is saved the first time, then it is drawn, keeping the camera when it was Shown. */
  private show(name: string, found: ModulesFound, wasShown: boolean): void {
    const saved = this.view() ?? freshModulesViewOf(name);
    const expanded = saved.expanded ?? defaultExpandedOf(moduleTreeOf(found.files));
    const view: ModulesViewState = { ...saved, expanded };

    this.current = { kind: 'shown', name, found };
    this.update(view, wasShown ? KEEP : FIRST);
  }

  /** After a host message: Shown draws the saved view again with the camera kept, Failed shows the graph view again; Waiting and Loading come back with their draw. */
  private resume(current: ModulePhase): void {
    const view = this.view();

    this.isSuspended = false;

    if (current.kind === 'shown' && view !== null) this.update(view, KEEP);
    else if (current.kind === 'failed') this.deps.screen.reshow();
  }

  /** Entering from package or task mode: task mode is parked toward modules, then the page shows the modules screen. */
  private parkOthers(): void {
    const tasks = this.deps.tasks();
    const isTaskMode = tasks.isActive();

    if (isTaskMode) tasks.leave('modules');

    this.deps.screen.enter();
  }

  private ask(packageName: string): void {
    this.deps.bridge.post({ type: 'scanModules', packageName });
  }

  private hash(): string {
    return this.latest?.hash ?? '';
  }
}
