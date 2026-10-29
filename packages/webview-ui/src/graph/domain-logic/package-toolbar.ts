import { setFocusToggle } from './button-title.ts';
import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type {
  MenuTarget,
  PackageMenuState,
  PackageToolbarElements,
  PackageToolbarShown,
  RectPx,
  ToolbarSlot
} from '../common/widget.type.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { packageToolbarCountOf, packageToolbarShownOf } from '../utils/package-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

type ToolbarEntry = {
  readonly name: string;
  readonly folder: string | null;
  readonly state: PackageMenuState;
  readonly elements: PackageToolbarElements;
};

/** The folder's shown title, `null` on a flat page. */
const folderTitleOrNull = (folder: string | null): string | null => {
  if (folder === null) return null;

  return folderTitleOf(folder);
};

/** Tab stop 0 on the one stop, -1 on the rest, a write skipped when unchanged. */
const writeTabStop = (button: HTMLButtonElement, isStop: boolean): void => {
  const tabIndex = isStop ? 0 : -1;

  if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
};

/** The toolbar's buttons in DOM order with what a pass shows of them. */
const slotsOf = (elements: PackageToolbarElements, shown: PackageToolbarShown): ToolbarSlot[] => {
  const slots: ToolbarSlot[] = [
    { button: elements.focus, isShown: shown.focus },
    { button: elements.startTrace, isShown: shown.startTrace },
    { button: elements.showTasks, isShown: shown.showTasks },
    { button: elements.collapse, isShown: shown.collapse },
    { button: elements.ellipsis, isShown: true }
  ];

  return slots;
};

/** Shows the buttons the zoom and the state allow with the first shown as the Tab stop; focus left on a hidden one goes to the "…". */
const placeButtons = (entry: ToolbarEntry, zoom: number): void => {
  const { state, folder, elements } = entry;
  const isCompact = isNodeToolbarCompact(zoom);
  const shown = packageToolbarShownOf(state, folder !== null, isCompact);
  const slots = slotsOf(elements, shown);
  const stop = slots.find((slot) => slot.isShown);
  const active = elements.root.ownerDocument.activeElement;
  const isLostFocus = slots.some((slot) => !slot.isShown && slot.button !== null && slot.button === active);

  for (const { button, isShown } of slots) {
    if (button === null) continue;

    setHidden(button, !isShown);
    writeTabStop(button, button === stop?.button);
  }

  if (isLostFocus) elements.ellipsis.focus();
};

/**
 * The selected package's node toolbar: built again when the selection or its folder changes, first in the layer so it is
 * the Tab stop after the canvas; the first shown button is its one Tab stop, and focus inside it goes to the container
 * when it is removed, hidden or left on a hidden button, since the browser would drop it on the body.
 */
export class PackageToolbar {
  private readonly deps: PackageToolbarDeps;
  private entry: ToolbarEntry | null = null;

  public constructor(deps: PackageToolbarDeps) {
    this.deps = deps;
  }

  /** The package the toolbar is for, `null` without one. */
  public name(): string | null {
    return this.entry?.name ?? null;
  }

  public ellipsis(): HTMLButtonElement | null {
    return this.entry?.elements.ellipsis ?? null;
  }

  /** The buttons of the full toolbar, the "…" included; 0 without a toolbar. */
  public count(): number {
    if (this.entry === null) return 0;

    const { state, folder } = this.entry;

    return packageToolbarCountOf(state, folder !== null);
  }

  /** Exactly one toolbar for `name` in `folder` (`null` on a flat page), none for `null`; the same name and folder keep the element and only Focus follows `state`. */
  public sync(name: string | null, folder: string | null, state: PackageMenuState | null): void {
    if (name === null || state === null) {
      this.removeEntry();

      return;
    }

    const entry = this.entryFor(name, folder, state);

    this.entry = entry;
    setFocusToggle(entry.elements.focus, state.isFocus, FOCUS_PACKAGE_TITLE);
  }

  /** Shows the toolbar at `rect` on whole px with the buttons the zoom allows, or hides it for `null`; focus left on a hidden button goes to the "…", focus inside a toolbar that hides to the container. */
  public place(rect: RectPx | null, zoom: number): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    if (rect === null) this.releaseFocusOf(root);

    setHidden(root, rect === null);

    if (rect === null) return;

    writeStyle(root, 'transform', translateOf(rect.x1, rect.y1));
    placeButtons(this.entry, zoom);
  }

  /** The entry kept with the new `state` for the same name and folder, else a new one in place of the old. */
  private entryFor(name: string, folder: string | null, state: PackageMenuState): ToolbarEntry {
    const current = this.entry;
    const isSame = current !== null && current.name === name && current.folder === folder;

    if (isSame) {
      const kept: ToolbarEntry = { ...current, state };

      return kept;
    }

    this.removeEntry();

    return this.build(name, folder, state);
  }

  private build(name: string, folder: string | null, state: PackageMenuState): ToolbarEntry {
    const folderTitle = folderTitleOrNull(folder);
    const elements = this.deps.views.packageToolbar(name, folderTitle);
    const entry: ToolbarEntry = { name, folder, state, elements };

    this.wire(entry);
    this.deps.layer.prepend(elements.root);

    return entry;
  }

  private wire(entry: ToolbarEntry): void {
    const { name, folder, elements } = entry;
    const { focus, startTrace, showTasks, collapse, ellipsis } = elements;
    const target: MenuTarget = { kind: 'package', name };

    ellipsis.addEventListener('click', (): void => this.deps.onMenu(target, ellipsis));
    focus.addEventListener('click', (): void => this.deps.onFocus(name));
    startTrace.addEventListener('click', (): void => this.deps.onStartTrace());
    showTasks.addEventListener('click', (): void => this.deps.onShowTasks(name));

    if (collapse !== null && folder !== null) collapse.addEventListener('click', (): void => this.deps.onCollapse(folder));
  }

  private removeEntry(): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    this.releaseFocusOf(root);
    root.remove();
    this.entry = null;
  }

  private releaseFocusOf(root: HTMLElement): void {
    const hasFocus = root.contains(root.ownerDocument.activeElement);

    if (hasFocus) this.deps.container.focus();
  }
}
