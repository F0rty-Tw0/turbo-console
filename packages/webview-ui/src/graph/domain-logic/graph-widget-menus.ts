import { isFocusAway, isOwnPress, refocusIfLost } from './widget-menu-focus.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import type { GraphWidgetMenusDeps } from '../common/graph-widgets.type.ts';
import type { MenuItem } from '../common/widget-menu.type.ts';
import type { MenuTarget, RectPx, Size } from '../common/widget.type.ts';
import { actionsLabelOf } from '../utils/controls-text.util.ts';
import { menuIndexOf } from '../utils/menu-keys.util.ts';
import { menuPlaceOf, targetRectOf, uncoveredAreaOf } from '../utils/menu-place.util.ts';
import { isSameViewport } from '../utils/viewport.util.ts';
import { isMenuItem } from '../utils/widget-menu-model.util.ts';

type OpenMenu = {
  readonly target: MenuTarget;
  /** Opened from a shown "…": a close returns focus to that target's "…" as the latest pass placed it. */
  readonly hasOpener: boolean;
  readonly menu: HTMLElement;
  readonly items: HTMLElement[];
  /** The camera the menu opened at; a pass at another one closes it. */
  readonly viewport: Viewport;
};

/**
 * The folder and package menus over the canvas, at most one open. An item runs, then the menu closes; a close returns
 * focus to the target's shown "…", else to the container, and only when the focus was inside the menu. A click
 * outside keeps that return only when it lands on nothing focusable; a focusable control it lands on keeps the focus.
 * A click on the menu's own "…" closes it, focus leaving it for another control closes it there, and a camera move
 * closes it like any other close.
 */
export class GraphWidgetMenus {
  private readonly deps: GraphWidgetMenusDeps;
  private current: OpenMenu | null = null;

  public constructor(deps: GraphWidgetMenusDeps) {
    this.deps = deps;
    document.addEventListener('pointerdown', (event): void => this.onPointerDown(event), true);
  }

  public isOpen(): boolean {
    return this.current !== null;
  }

  /** Shift+F10: the menu of the inspected folder or package, from its "…" when shown, else from its drawn rect. */
  public openForSelection(): void {
    const target = this.deps.selection();
    const isActive = this.deps.isActive();

    if (target === null || !isActive) return;

    const opener = this.deps.anchors.anchorOf(target)?.opener ?? null;

    this.open(target, opener);
  }

  /** Builds the menu beside `opener`, or beside the target's drawn rect without one; nothing while neither is placed. A press on the open menu's own "…" closes it. */
  public open(target: MenuTarget, opener: HTMLButtonElement | null): void {
    const isOwnOpener = opener !== null && opener === this.currentOpener();
    const rect = this.anchorRectOf(target, opener);

    this.remove();

    if (rect === null || isOwnOpener) return;

    const model = this.deps.menuOf(target);
    const entries = model.filter(isMenuItem);
    const { menu, items } = this.deps.build(model, actionsLabelOf(target));
    const viewport = this.deps.view.viewport();

    entries.forEach((entry, index): void => items[index]?.addEventListener('click', (): void => this.activate(entry)));
    menu.addEventListener('keydown', (event): void => this.onKey(event));
    menu.addEventListener('focusout', (event): void => this.onFocusOut(event));
    this.deps.page.widgets.append(menu);
    this.current = { target, hasOpener: opener !== null, menu, items, viewport };
    this.place(menu, rect);

    const first = entries.findIndex((entry) => !entry.isDisabled);

    items[first]?.focus();
  }

  public close(): void {
    const open = this.current;

    if (open === null) return;

    const opener = this.openerOf(open);

    this.dismiss(opener);
  }

  /** Grouping turned off: the rows are about to hide, so focus inside the menu goes to the container. */
  public drop(): void {
    this.dismiss(null);
  }

  /** After a positioning pass: a camera other than the menu's closes it, and focus inside goes to its "…" while shown, else to the container. */
  public follow(): void {
    const open = this.current;

    if (open === null) return;

    const viewport = this.deps.view.viewport();
    const isSame = isSameViewport(viewport, open.viewport);

    if (!isSame) this.close();
  }

  private dismiss(focusTo: HTMLElement | null): void {
    const open = this.current;

    if (open === null) return;

    const hadFocus = open.menu.contains(document.activeElement);
    const returnTo = focusTo ?? this.deps.page.container;

    this.remove();

    if (hadFocus) returnTo.focus();
  }

  /** The target's "…" as the latest pass placed it, when the menu opened from one and it is still shown. */
  private openerOf(open: OpenMenu): HTMLButtonElement | null {
    if (!open.hasOpener) return null;

    const anchor = this.deps.anchors.anchorOf(open.target);

    return anchor?.opener ?? null;
  }

  private currentOpener(): HTMLButtonElement | null {
    const open = this.current;

    if (open === null) return null;

    return this.openerOf(open);
  }

  private remove(): void {
    this.current?.menu.remove();
    this.current = null;
  }

  /** A disabled item stays focusable and does nothing. */
  private activate(entry: MenuItem): void {
    if (entry.isDisabled) return;

    entry.run();
    this.close();
  }

  private onKey(event: KeyboardEvent): void {
    const open = this.current;

    if (open === null) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();

      return;
    }

    const index = open.items.findIndex((item) => item === document.activeElement);
    const next = menuIndexOf(event.key, index, open.items.length);

    if (next === null) return;

    event.preventDefault();
    open.items[next]?.focus();
  }

  private onPointerDown(event: PointerEvent): void {
    const open = this.current;

    if (open === null) return;

    const isOwn = isOwnPress(event, open.menu, this.openerOf(open));
    const hadFocus = open.menu.contains(document.activeElement);

    if (isOwn) return;

    this.close();

    const returnTo = document.activeElement;
    const isElement = returnTo instanceof HTMLElement;

    if (!hadFocus || !isElement) return;

    document.addEventListener('pointerup', (): void => refocusIfLost(returnTo), { capture: true, once: true });
  }

  /** Focus moved to a control outside the menu other than its "…": the menu closes and the focus stays there. */
  private onFocusOut(event: FocusEvent): void {
    const open = this.current;

    if (open === null) return;

    const isAway = isFocusAway(event, open.menu, this.openerOf(open));

    if (isAway) this.remove();
  }

  private anchorRectOf(target: MenuTarget, opener: HTMLButtonElement | null): RectPx | null {
    const anchor = this.deps.anchors.anchorOf(target);
    const isShown = opener !== null && anchor !== null;

    if (isShown) return anchor.rect;

    const name = target.kind === 'package' ? target.name : null;
    const rects = this.deps.view.widgetRects(name);

    return targetRectOf(rects, target);
  }

  /** Measured once, then placed by CSSOM `left`/`top` inside the part of the layer no overlay covers. */
  private place(menu: HTMLElement, rect: RectPx): void {
    const size: Size = { width: menu.offsetWidth, height: menu.offsetHeight };
    const area = uncoveredAreaOf(this.deps.anchors.layerBounds());
    const point = menuPlaceOf(rect, size, area);

    menu.style.left = `${point.x}px`;
    menu.style.top = `${point.y}px`;
  }
}
