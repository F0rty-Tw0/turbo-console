import { setFocusToggle } from './button-title.ts';
import { moveStopOnKey } from './roving-stop.ts';
import { placeRow } from './widget-row-place.ts';
import { FOCUS_FOLDER_LABEL } from '../common/details.const.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { WidgetRowsDeps } from '../common/graph-widgets.type.ts';
import type { FolderRowElements, MenuTarget, RowButtonKind, RowEntry, RowKind, RowPlan } from '../common/widget.type.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { ROW_ORDER, kindOf, rowStopOf } from '../utils/row-stop.util.ts';
import { sameOrder } from '../utils/same-order.util.ts';

/** The row button to give focus back to once the pass placed its row. */
type RowFocus = {
  readonly folder: string;
  readonly kind: RowButtonKind;
};

const shownOf = (scene: FolderScene | null): string[] => {
  if (scene === null) return [];

  return [...scene.shown];
};

/** The folder header rows: one per shown folder, in the scene's order, placed from a plan. */
export class WidgetRows {
  private readonly deps: WidgetRowsDeps;
  private readonly rows = new Map<string, RowEntry>();
  private refocus: RowFocus | null = null;

  public constructor(deps: WidgetRowsDeps) {
    this.deps = deps;
  }

  public size(): number {
    return this.rows.size;
  }

  public ellipsisOf(folder: string): HTMLButtonElement | null {
    const entry = this.rows.get(folder);

    return entry?.elements.ellipsis ?? null;
  }

  /** Drops the rows of folders that left the scene and builds the missing ones. Each Focus folder reads pressed when its folder is `focusedFolder`. */
  public sync(scene: FolderScene | null, focusedFolder: string | null): void {
    const folders = shownOf(scene);
    const kept = new Set(folders);

    for (const [folder, entry] of this.rows) {
      const isKept = kept.has(folder);

      if (isKept) continue;

      entry.elements.root.remove();
      this.rows.delete(folder);
    }

    if (scene === null) return;

    for (const folder of folders) this.syncRow(folder, scene);

    this.order(folders);

    for (const [folder, entry] of this.rows) setFocusToggle(entry.elements.focus, folder === focusedFolder, FOCUS_FOLDER_LABEL);
  }

  /** Shows and places each row of the plan; a row without one, or of the other kind, is hidden. */
  public place(plans: RowPlan[]): void {
    const byFolder = new Map<string, RowPlan>();

    for (const plan of plans) byFolder.set(plan.folder, plan);

    for (const [folder, entry] of this.rows) placeRow(entry, byFolder.get(folder));
  }

  /** Focus that sat in a rebuilt or moved row goes back to the same kind of button once a pass placed the row; when that kind is hidden now, to the row's Tab stop. A row the pass left hidden (a rebuilt box waits for its layout) keeps the request for a later `refresh` while focus is still lost. Once focus is anywhere else (the user clicked, typed or tabbed away) the request is dropped, never to take focus back. */
  public restoreFocus(): void {
    const target = this.refocus;

    if (target === null) return;

    const entry = this.rows.get(target.folder);
    const { activeElement, body } = this.deps.layer.ownerDocument;
    const isFocusLost = activeElement === null || activeElement === body;
    const isWaiting = entry?.elements.root.hidden === true;

    if (!isFocusLost) {
      this.refocus = null;

      return;
    }

    if (isWaiting) return;

    this.refocus = null;

    if (entry === undefined) return;

    const isShown = entry.shown.includes(target.kind);
    const stop = rowStopOf(entry.preferred, entry.shown);
    const kind = isShown ? target.kind : stop;

    entry.elements[kind].focus();
  }

  /** Builds a folder's row, or builds it again when the folder collapsed or expanded or its package count changed. */
  private syncRow(folder: string, scene: FolderScene): void {
    const isCollapsed = scene.collapsed.has(folder);
    const kind: RowKind = isCollapsed ? 'collapsed' : 'box';
    const count = scene.members.get(folder)?.length ?? 0;
    const entry = this.rows.get(folder);
    const isCurrent = entry?.kind === kind && entry.count === count;

    if (isCurrent) return;

    const { views, onToggle, onTitle, onFocus, onMenu } = this.deps;
    const elements = views.row(kind, folderTitleOf(folder), count);
    const target: MenuTarget = { kind: 'folder', folder };

    elements.chevron.addEventListener('click', (): void => onToggle(folder));
    elements.title.addEventListener('click', (event): void => onTitle(folder, event));
    elements.focus.addEventListener('click', (): void => onFocus(folder));
    elements.ellipsis.addEventListener('click', (): void => onMenu(target, elements.ellipsis));
    elements.root.addEventListener('keydown', (event): void => this.onRowKey(folder, event));

    const preferred = entry?.preferred ?? 'chevron';

    this.rows.set(folder, { kind, count, elements, shown: [], preferred });

    if (entry === undefined) this.deps.layer.append(elements.root);
    else this.replace(folder, entry, elements);
  }

  /** Swaps a row in place; focus on a button of the old row goes to the same kind of button in the new one (`restoreFocus`). */
  private replace(folder: string, entry: RowEntry, elements: FolderRowElements): void {
    const { root } = entry.elements;
    const focused = root.ownerDocument.activeElement;
    const hadFocus = root.contains(focused);
    const kind = kindOf(entry.elements, focused) ?? 'chevron';

    root.replaceWith(elements.root);

    if (hadFocus) this.refocus = { folder, kind };
  }

  /** A row button with focus is blurred when its row moves in the DOM, so `restoreFocus` gives it back after the pass. */
  private keepFocus(): void {
    const focused = this.deps.layer.ownerDocument.activeElement;

    for (const [folder, entry] of this.rows) {
      const kind = kindOf(entry.elements, focused);

      if (kind !== undefined) this.refocus = { folder, kind };
    }
  }

  /** Left/Right/Home/End move focus and the Tab stop across the row's shown buttons; other keys pass through (Shift+F10 reaches the layer). */
  private onRowKey(folder: string, event: KeyboardEvent): void {
    const entry = this.rows.get(folder);

    if (entry !== undefined) moveStopOnKey(entry, ROW_ORDER, event);
  }

  /** Puts the rows in the scene's order, in the map and in the DOM (the Tab order); a no-op while it holds. */
  private order(folders: string[]): void {
    const keys = this.rows.keys();
    const current = [...keys];
    const isSame = sameOrder(current, folders);

    if (isSame) return;

    this.keepFocus();

    for (const folder of folders) {
      const entry = this.rows.get(folder);

      if (entry === undefined) continue;

      this.rows.delete(folder);
      this.rows.set(folder, entry);
      this.deps.layer.append(entry.elements.root);
    }
  }
}
