import { depthEdited, focusCleared, focusToggled } from './graph-module-view-edits.ts';
import type { GraphModuleSitesMessage, GraphScanModuleSitesMessage } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModuleSelection, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleDetailsList, ModuleDetailsView } from '../common/module-details.type.ts';
import type { ModuleScene } from '../common/module-scene.type.ts';
import type { ModuleAsk, ModuleFolds, ModuleSelectionDeps, ModuleShownLookup } from '../common/module-selection.type.ts';
import { askOf, isSameAsk, isSameSelection, lastStateOf, scanningStateOf, sitesStateOf } from '../utils/module-ask.util.ts';
import { detailsViewOf } from '../utils/module-details-view.util.ts';
import { keepsSelection } from '../utils/module-painted.util.ts';
import { keptViewOf } from '../utils/module-selection.util.ts';

const EMPTY: ModuleDetailsView = { kind: 'empty' };

const CLOSED: ModuleFolds = { imports: false, importedBy: false };

/**
 * The modules selection (spec §6.5, §7, Ruling R1): it saves and paints what is chosen, keeps the one pending sites lookup,
 * and shows its Details view. A draw never asks: a folder collapsed over the chosen file keeps it, and only a choice the
 * canvas dropped (now hidden) or the first draw cannot keep is dropped. A reply applies only to the lookup still pending.
 */
export class GraphModuleSelection {
  private readonly deps: ModuleSelectionDeps;
  private pending: ModuleAsk | null = null;
  private shown: ModuleShownLookup | null = null;
  private folds: ModuleFolds = CLOSED;
  /** True until the first draw after construction, a new scan or an exit; that draw paints a saved selection. */
  private isFirstDraw = true;
  private lastScene: ModuleScene | null = null;

  public constructor(deps: ModuleSelectionDeps) {
    this.deps = deps;
  }

  /** Shown only: paints `sel`; a new selection is also saved and asked about, Details open or closed (C8, C15). */
  public select(sel: ModuleSelection): void {
    const view = this.deps.mode.view();
    const phase = this.deps.mode.phase();

    if (phase.kind !== 'shown' || view === null) return;

    this.deps.canvas.paint(sel);

    const isSame = isSameSelection(view.selected, sel);

    if (isSame) return;

    const selected: ModulesViewState = { ...view, selected: sel };

    this.deps.mode.save(selected);
    this.ask(phase.name, sel);
  }

  /** Clear selection or a background tap, in any phase but off. */
  public clear(): void {
    const view = this.deps.mode.view();
    const phase = this.deps.mode.phase();

    if (phase.kind === 'off' || view === null) return;

    this.deps.canvas.paint(null);
    this.drop(view);
  }

  /** Each module draw on screen; the same scene twice, as for an overtaken draw, counts once. */
  public drawn(scene: ModuleScene): void {
    const view = this.deps.mode.view();
    const isFirst = this.isFirstDraw;

    if (scene === this.lastScene) return;

    this.lastScene = scene;
    this.isFirstDraw = false;

    const saved = view?.selected ?? null;
    const chosen = this.deps.canvas.selected();

    if (view === null || saved === null) return;

    if (isFirst) this.drawnFirst(view, saved, scene);
    else if (chosen === null) this.drop(view);
  }

  /**
   * A found scan, before it is drawn: what it no longer holds is dropped; a kept selection is asked about again, and with
   * none Details leaves the loading view for the empty one.
   */
  public found(found: ModulesFound): void {
    const view = this.deps.mode.view();

    if (view === null) return;

    const kept = keptViewOf(view, found);
    const isChanged = kept.selected !== view.selected || kept.focus !== view.focus;

    if (isChanged) this.deps.mode.save(kept);

    if (kept.selected !== null) this.ask(view.packageName, kept.selected);
    else if (view.selected !== null) this.unpaint();
    else this.forget();
  }

  /** The host's sites answer; only the pending lookup's, while Shown or Failed on its package, is shown (spec §6.5). */
  public replied(message: GraphModuleSitesMessage): void {
    const { pending, shown } = this;
    const phase = this.deps.mode.phase();
    const isAnswered = phase.kind === 'shown' || phase.kind === 'failed';
    const isAsked = isAnswered && phase.name === message.packageName;

    if (!isAsked || pending === null || shown === null) return;

    const isPending = isSameAsk(pending, message);

    if (!isPending) return;

    const state = sitesStateOf(message.result);

    this.pending = null;
    this.shown = { ...shown, state };
    this.showLookup();
  }

  public scanAgain(): void {
    const { shown } = this;
    const phase = this.deps.mode.phase();
    const isAsked = phase.kind === 'shown' || phase.kind === 'failed';

    if (isAsked && shown !== null) this.ask(phase.name, shown.sel);
  }

  /** Show more: the list's rows all show until another lookup. */
  public fold(list: ModuleDetailsList): void {
    this.folds = { ...this.folds, [list]: true };
    this.showLookup();
  }

  /** Focus on the Details end: the view edits, which keep the selection and what is pending. */
  public focus(target: string): void {
    focusToggled(this.deps.mode, target);
  }

  public clearFocus(): void {
    focusCleared(this.deps.mode);
  }

  public setDepth(depth: number): void {
    depthEdited(this.deps.mode, depth);
  }

  /** A package's scan started: nothing is pending, Details shows it loading, and the next draw is a first draw. */
  public scanning(name: string): void {
    const loading: ModuleDetailsView = { kind: 'loading', packageName: name };

    this.reset();
    this.deps.details.show(loading);
  }

  /** A failed scan: the loading view gives way to the empty one; a shown lookup stays, as its reply still applies (C14). */
  public failed(): void {
    if (this.shown === null) this.deps.details.show(EMPTY);
  }

  public exit(): void {
    this.reset();
  }

  /** The first draw paints the saved selection it keeps, as on a reload, and drops one it cannot, as a hidden test file. */
  private drawnFirst(view: ModulesViewState, saved: ModuleSelection, scene: ModuleScene): void {
    const isKept = keepsSelection(saved, scene);

    if (isKept) this.deps.canvas.paint(saved);
    else this.drop(view);
  }

  /** Saved with nothing selected, nothing pending, and the empty view shown. */
  private drop(view: ModulesViewState): void {
    const cleared: ModulesViewState = { ...view, selected: null };

    this.deps.mode.save(cleared);
    this.forget();
  }

  private unpaint(): void {
    this.deps.canvas.paint(null);
    this.forget();
  }

  private forget(): void {
    this.pending = null;
    this.shown = null;
    this.deps.details.show(EMPTY);
  }

  /**
   * Asks the host about `sel`. The same lookup again keeps its folds and shows its last answer while scanning (C19); any
   * other closes both folds.
   */
  private ask(packageName: string, sel: ModuleSelection): void {
    const next = askOf(packageName, sel);
    const last = lastStateOf(this.shown, next);
    const state = scanningStateOf(last);
    const message: GraphScanModuleSitesMessage = { type: 'scanModuleSites', ...next };

    if (last === null) this.folds = CLOSED;

    this.pending = next;
    this.shown = { sel, ask: next, state };
    this.deps.bridge.post(message);
    this.showLookup();
  }

  private showLookup(): void {
    const { shown } = this;

    if (shown !== null) this.deps.details.show(detailsViewOf(shown.sel, shown.state, this.folds));
  }

  private reset(): void {
    this.pending = null;
    this.shown = null;
    this.isFirstDraw = true;
    this.lastScene = null;
  }
}
