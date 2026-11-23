import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULE_CONTROLS_ID } from '../common/graph-module.const.ts';
import { CONTROLS_ID } from '../common/graph.const.ts';
import type { ModuleControlsDeps, ModuleControlsElements } from '../common/module-controls.type.ts';
import type { ModuleShown } from '../common/module-scene.type.ts';
import { depthOf } from '../utils/controls-rules.util.ts';
import { modeFocusOf } from '../utils/mode-focus.util.ts';
import { moduleFocusTextOf } from '../utils/module-text.util.ts';

/**
 * The module Controls panel (spec §6.2). It replaces the package panel while modules mode is on and keeps its own open
 * state, which the Controls button flips and saves; `setView` writes the saved view into it as properties, so a sync
 * reports nothing.
 */
export class GraphModuleControls {
  private readonly deps: ModuleControlsDeps;
  private readonly elements: ModuleControlsElements;
  private isActive = false;
  private isOpen = true;

  public constructor(deps: ModuleControlsDeps) {
    const elements = deps.views.controls();
    const { actions } = deps;
    const boxes = [elements.types, elements.tests, elements.lazies];

    this.deps = deps;
    this.elements = elements;
    elements.depth.addEventListener('input', (): void => this.depthTyped());
    elements.reset.addEventListener('click', (): void => actions.onReset());
    elements.clearFocus.addEventListener('click', (): void => actions.onClearFocus());
    deps.page.controls.addEventListener('click', (): void => this.toggleOpen());

    for (const box of boxes) box.addEventListener('change', (): void => actions.onShown(this.shown()));
  }

  public enter(view: ModulesViewState, isOpen: boolean): void {
    const { body, controls } = this.deps.page;
    const { panel } = this.elements;

    this.isActive = true;
    this.isOpen = isOpen;

    if (!panel.isConnected) body.prepend(panel);

    controls.setAttribute('aria-controls', MODULE_CONTROLS_ID);
    this.setView(view);
    this.render();
  }

  public exit(): void {
    const { panel } = this.elements;
    const hadFocus = panel.contains(document.activeElement);

    this.isActive = false;
    panel.hidden = true;
    this.deps.page.controls.setAttribute('aria-controls', CONTROLS_ID);

    if (hadFocus) modeFocusOf(this.deps.page).focus();
  }

  /** The boxes, the depth and the Focus line read `view`; a depth that already reads `view.depth` is left, so typing is not disturbed. */
  public setView(view: ModulesViewState): void {
    const { target, clearFocus, depth, types, tests, lazies } = this.elements;
    const depthText = String(view.depth);

    types.checked = view.shown.types;
    tests.checked = view.shown.tests;
    lazies.checked = view.shown.lazies;
    target.textContent = moduleFocusTextOf(view.focus);
    clearFocus.hidden = view.focus === null;

    if (depth.value !== depthText) depth.value = depthText;
  }

  private shown(): ModuleShown {
    const { types, tests, lazies } = this.elements;
    const shown: ModuleShown = { types: types.checked, tests: tests.checked, lazies: lazies.checked };

    return shown;
  }

  private render(): void {
    this.elements.panel.hidden = !this.isOpen;
    this.deps.page.controls.setAttribute('aria-expanded', String(this.isOpen));
  }

  private toggleOpen(): void {
    if (!this.isActive) return;

    this.isOpen = !this.isOpen;
    this.render();
    this.deps.modes.savePanels({ controlsOpen: this.isOpen });
  }

  private depthTyped(): void {
    const depth = depthOf(this.elements.depth.value);

    if (depth !== null) this.deps.actions.onDepth(depth);
  }
}
