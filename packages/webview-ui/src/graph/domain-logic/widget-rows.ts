import { setFocusToggle } from './button-title.ts';
import { FOCUS_FOLDER_LABEL } from '../common/details.const.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { WidgetRowsDeps } from '../common/graph-widgets.type.ts';
import type { FolderRowElements, MenuTarget, RowKind, RowPlan } from '../common/widget.type.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { sameOrder } from '../utils/same-order.util.ts';

type RowEntry = {
  readonly kind: RowKind;
  /** The package count the row was built with. */
  readonly count: number;
  readonly elements: FolderRowElements;
};

type StyleKey = 'transform' | 'width';

/** A CSSOM write, skipped when the element already has the value. */
export const writeStyle = (element: HTMLElement, key: StyleKey, value: string): void => {
  if (element.style[key] !== value) element.style[key] = value;
};

export const setHidden = (element: HTMLElement, isHidden: boolean): void => {
  if (element.hidden !== isHidden) element.hidden = isHidden;
};

/** Whole CSS px, so a 1 px border is not blurred over two device pixels. */
export const translateOf = (x: number, y: number): string => {
  const left = Math.round(x);
  const top = Math.round(y);

  return `translate(${left}px, ${top}px)`;
};

/** Shows and places a row from its plan, on whole px and at its scale; without one, or with one of the other kind, the row is hidden. The chevron, Focus folder and "…" hide as the plan says. */
const placeRow = (entry: RowEntry, plan: RowPlan | undefined): void => {
  const { root, chevron, focus, ellipsis } = entry.elements;
  const isPlaced = plan?.kind === entry.kind;

  setHidden(root, !isPlaced);

  if (!isPlaced) return;

  const { x, y, width, scale } = plan.placement;
  const right = Math.round(x + width * scale);
  const left = Math.round(x);
  const translate = translateOf(x, y);
  const scaled = `${translate} scale(${scale})`;
  const transform = scale === 1 ? translate : scaled;

  writeStyle(root, 'transform', transform);
  writeStyle(root, 'width', `${(right - left) / scale}px`);
  setHidden(chevron, !plan.isChevronShown);
  setHidden(focus, !plan.isFocusShown);
  setHidden(ellipsis, !plan.isEllipsisShown);
};

const shownOf = (scene: FolderScene | null): string[] => {
  if (scene === null) return [];

  return [...scene.shown];
};

/** The folder header rows: one per shown folder, in the scene's order, placed from a plan. */
export class WidgetRows {
  private readonly deps: WidgetRowsDeps;
  private readonly rows = new Map<string, RowEntry>();
  private refocus: HTMLButtonElement | null = null;

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

  /** Drops the rows of folders that left the scene and builds the missing ones; new rows go before `before`. Each Focus folder reads pressed when its folder is `focusedFolder`. */
  public sync(scene: FolderScene | null, before: HTMLElement | null, focusedFolder: string | null): void {
    const folders = shownOf(scene);
    const kept = new Set(folders);

    for (const [folder, entry] of this.rows) {
      const isKept = kept.has(folder);

      if (isKept) continue;

      entry.elements.root.remove();
      this.rows.delete(folder);
    }

    if (scene === null) return;

    for (const folder of folders) this.syncRow(folder, scene, before);

    this.order(folders, before);

    for (const [folder, entry] of this.rows) setFocusToggle(entry.elements.focus, folder === focusedFolder, FOCUS_FOLDER_LABEL);
  }

  /** Shows and places each row of the plan; a row without one, or of the other kind, is hidden. */
  public place(plans: RowPlan[]): void {
    const byFolder = new Map<string, RowPlan>();

    for (const plan of plans) byFolder.set(plan.folder, plan);

    for (const [folder, entry] of this.rows) placeRow(entry, byFolder.get(folder));
  }

  /** Focus that sat in a rebuilt row goes to its new chevron, and focus in a row that moved stays on its button, once the pass placed it. */
  public restoreFocus(): void {
    const target = this.refocus;

    this.refocus = null;
    target?.focus();
  }

  /** Builds a folder's row, or builds it again when the folder collapsed or expanded or its package count changed. */
  private syncRow(folder: string, scene: FolderScene, before: HTMLElement | null): void {
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
    this.rows.set(folder, { kind, count, elements });

    if (entry === undefined) this.deps.layer.insertBefore(elements.root, before);
    else this.replace(entry, elements);
  }

  /** Swaps a row in place; focus inside the old row moves to the new chevron. */
  private replace(entry: RowEntry, elements: FolderRowElements): void {
    const { root } = entry.elements;
    const focused = root.ownerDocument.activeElement;
    const hadFocus = root.contains(focused);

    root.replaceWith(elements.root);

    if (hadFocus) this.refocus = elements.chevron;
  }

  /** A row button with focus is blurred when its row moves in the DOM, so `restoreFocus` gives it back after the pass. */
  private keepFocus(): void {
    const focused = this.deps.layer.ownerDocument.activeElement;
    const entries = this.rows.values();
    const rows = [...entries];
    const isInRow = rows.some((entry) => entry.elements.root.contains(focused));

    if (isInRow && focused instanceof HTMLButtonElement) this.refocus ??= focused;
  }

  /** Puts the rows in the scene's order, in the map and in the DOM (the Tab order); a no-op while it holds. */
  private order(folders: string[], before: HTMLElement | null): void {
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
      this.deps.layer.insertBefore(entry.elements.root, before);
    }
  }
}
