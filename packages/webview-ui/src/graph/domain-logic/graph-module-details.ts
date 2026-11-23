import { showDetailsBar } from './details-bar-shown.ts';
import { isAriaDisabled } from './graph-details-wire-parts.ts';
import type { GraphOpenImportMessage } from '../../bridge/common/graph-imports.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ImportRowElements } from '../common/details-view.type.ts';
import { MODULE_DETAILS_ID } from '../common/graph-module.const.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type {
  ModuleDetailsBlock,
  ModuleDetailsDeps,
  ModuleDetailsElements,
  ModuleDetailsView
} from '../common/module-details.type.ts';
import { closestButtonOf } from '../utils/closest-button.util.ts';
import { modeFocusOf } from '../utils/mode-focus.util.ts';
import { focusKeyOf, focusTargetOf, isFocusedOf, isSelectionOf, refocusOf } from '../utils/module-details-focus.util.ts';

type RowsByButton = Map<HTMLButtonElement, ImportRowElements>;

/** One shown view: the view it was built from, its elements, and its rows by button for its delegated listener. */
type ModuleDetailsDraw = {
  readonly view: ModuleDetailsView;
  readonly elements: ModuleDetailsElements;
  readonly rows: RowsByButton;
};

const EMPTY_VIEW: ModuleDetailsView = { kind: 'empty' };

const rowsOf = (elements: ModuleDetailsElements): RowsByButton => {
  const rows = elements.blocks.flatMap((block) => block.details.rows);
  const pairs = rows.map((row): [HTMLButtonElement, ImportRowElements] => [row.button, row]);

  return new Map(pairs);
};

/** The Details bar summary: the path, package name or link title; empty while nothing is selected. */
const summaryOf = (view: ModuleDetailsView): string => {
  if (view.kind === 'file') return view.path;

  if (view.kind === 'stub') return view.name;

  if (view.kind === 'link') return view.title;

  return '';
};

/**
 * The module Details panel (spec §6.3). It replaces the package Details panel while modules mode is on, holds the
 * Details bar meanwhile, and keeps its own open state, which the Details button flips and saves. Each view acts only
 * while it is the one shown, in modules mode, so a stale view never posts; focus in a replaced view moves to its twin.
 */
export class GraphModuleDetails {
  private readonly deps: ModuleDetailsDeps;
  private readonly panel: HTMLElement;
  /** The panel's `div.details-content`, after the Details bar while modules mode holds it; each view replaces its child. */
  private readonly content: HTMLElement;
  private draw: ModuleDetailsDraw;
  /** The saved focus the last `setView` carried. */
  private focus: string | null = null;
  private isActive = false;
  private isOpen = true;

  public constructor(deps: ModuleDetailsDeps) {
    const { panel, content } = deps.views.details();

    this.deps = deps;
    this.panel = panel;
    this.content = content;
    this.draw = this.drawn(EMPTY_VIEW);
    deps.page.details.addEventListener('click', (): void => this.toggleOpen());
    deps.page.clear.addEventListener('click', (): void => this.cleared());
  }

  public enter(isOpen: boolean): void {
    const { body, details, detailsBar } = this.deps.page;

    this.isActive = true;
    this.isOpen = isOpen;

    if (!this.panel.isConnected) body.append(this.panel);

    this.panel.prepend(detailsBar);
    details.setAttribute('aria-controls', MODULE_DETAILS_ID);
    this.render();
  }

  public exit(): void {
    const { page } = this.deps;
    const hadFocus = this.panel.contains(document.activeElement);

    this.isActive = false;
    this.panel.hidden = true;
    page.details.setAttribute('aria-controls', DETAILS_ID);
    this.deps.packageAside()?.prepend(page.detailsBar);

    if (hadFocus) modeFocusOf(page).focus();
  }

  /**
   * Shows `view` in place of the shown one; keyboard focus inside the old view moves to its twin in `view`, and focus on
   * Clear selection, which hides with nothing selected, moves to the new view's heading. Other focus stays.
   */
  public show(view: ModuleDetailsView): void {
    const { activeElement } = document;
    const key = focusKeyOf(this.draw.elements, activeElement);
    const isSelection = isSelectionOf(view);
    const isClearHiding = !isSelection && activeElement === this.deps.page.clear;

    this.draw = this.drawn(view);
    this.renderBar();

    const target = refocusOf(this.draw.elements, key, isClearHiding);

    target?.focus();
  }

  /** Keeps the saved focus; a shown file or stub whose Focus face changes with it is shown again. */
  public setView(view: ModulesViewState): void {
    const shown = this.draw.view;
    const wasFocused = isFocusedOf(shown, this.focus);
    const isFocused = isFocusedOf(shown, view.focus);

    this.focus = view.focus;

    if (wasFocused !== isFocused) this.show(shown);
  }

  private drawn(view: ModuleDetailsView): ModuleDetailsDraw {
    const isFocused = isFocusedOf(view, this.focus);
    const elements = this.deps.views.view(view, isFocused);
    const rows = rowsOf(elements);
    const draw: ModuleDetailsDraw = { view, elements, rows };

    elements.root.addEventListener('click', (event: Event): void => this.clicked(event, draw));
    this.content.replaceChildren(elements.root);

    return draw;
  }

  /** One delegated listener per view: a row opens its site, Show more folds, Scan again asks again, Focus focuses. */
  private clicked(event: Event, draw: ModuleDetailsDraw): void {
    const isShown = this.isActive && draw === this.draw;
    const button = closestButtonOf(event, 'button');

    if (!isShown || button === null) return;

    const isDisabled = isAriaDisabled(button);
    const row = draw.rows.get(button);

    if (isDisabled) return;

    if (row !== undefined) this.opened(row);
    else this.pressed(button, draw);
  }

  private pressed(button: HTMLButtonElement, draw: ModuleDetailsDraw): void {
    const { elements, view } = draw;
    const { actions } = this.deps;
    const block = elements.blocks.find((each) => each.details.more === button || each.details.scanAgain === button);
    const target = focusTargetOf(view);

    if (block !== undefined) this.blockPressed(button, block);
    else if (button === elements.focus && target !== null) actions.onFocus(target);
  }

  private blockPressed(button: HTMLButtonElement, block: ModuleDetailsBlock): void {
    const { actions } = this.deps;

    if (button === block.details.more) actions.onFold(block.list);
    else actions.onScanAgain();
  }

  private opened(row: ImportRowElements): void {
    const packageName = this.deps.packageName();

    if (packageName === null) return;

    const { file, line } = row.site;
    const message: GraphOpenImportMessage = { type: 'openImport', packageName, file, line };

    this.deps.bridge.post(message);
  }

  private cleared(): void {
    const isSelection = isSelectionOf(this.draw.view);

    if (this.isActive && isSelection) this.deps.actions.onClear();
  }

  private toggleOpen(): void {
    if (!this.isActive) return;

    this.isOpen = !this.isOpen;
    this.render();
    this.deps.modes.savePanels({ detailsOpen: this.isOpen });
  }

  private render(): void {
    this.panel.hidden = !this.isOpen;
    this.deps.page.details.setAttribute('aria-expanded', String(this.isOpen));
    this.renderBar();
  }

  /** The Details bar names the shown selection, and shows with Clear enabled while there is one; only in modules mode. */
  private renderBar(): void {
    if (!this.isActive) return;

    const { view } = this.draw;
    const isSelection = isSelectionOf(view);

    this.deps.page.detailsSummary.textContent = summaryOf(view);
    showDetailsBar(this.deps.page, isSelection);
  }
}
