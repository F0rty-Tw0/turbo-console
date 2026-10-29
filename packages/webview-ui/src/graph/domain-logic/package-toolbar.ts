import { setFocusToggle } from './button-title.ts';
import { moveInToolbar, placeToolbar, releaseFocusOf } from './package-toolbar-place.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type { MenuTarget, PackageMenuState, RectPx, ToolbarEntry } from '../common/widget.type.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { packageToolbarCountOf } from '../utils/package-toolbar.util.ts';

/** The folder's shown title, `null` on a flat page. */
const folderTitleOrNull = (folder: string | null): string | null => {
  if (folder === null) return null;

  return folderTitleOf(folder);
};

/**
 * The selected package's node toolbar: built again when the selection or its folder changes, first in the layer so it is
 * the Tab stop after the canvas; the preferred button (Focus until an arrow key moves it) is its one Tab stop. Focus inside it goes to the container when
 * it is removed or hidden, since the browser would drop it on the body, and to the "…" when left on a hidden button.
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

    placeToolbar(this.entry, rect, zoom, this.deps.container);
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
    const entry: ToolbarEntry = { name, folder, state, elements, shown: [], preferred: 'focus' };

    this.wire(entry);
    elements.root.addEventListener('keydown', (event: KeyboardEvent): void => this.onKey(event));
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

  private onKey(event: KeyboardEvent): void {
    if (this.entry !== null) moveInToolbar(this.entry, event);
  }

  private removeEntry(): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    releaseFocusOf(root, this.deps.container);
    root.remove();
    this.entry = null;
  }
}
