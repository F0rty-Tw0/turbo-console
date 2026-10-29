import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import type { MenuTarget, PackageToolbarElements, RectPx } from '../common/widget.type.ts';

type ToolbarEntry = {
  readonly name: string;
  readonly elements: PackageToolbarElements;
};

/**
 * The selected package's node toolbar: built again when the selection changes, first in the layer so it is the Tab stop
 * after the canvas; focus inside it goes to the container when it is removed or hidden, since the browser would drop it
 * on the body.
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

  /** Exactly one toolbar for `name`, none for `null`; the same name keeps the element. */
  public sync(name: string | null): void {
    const current = this.name();

    if (current === name) return;

    this.removeEntry();

    if (name === null) return;

    this.entry = this.build(name);
  }

  /** Shows the toolbar at `rect` on whole px, or hides it for `null`; focus inside a toolbar that hides goes to the container. */
  public place(rect: RectPx | null): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    if (rect === null) this.releaseFocusOf(root);

    setHidden(root, rect === null);

    if (rect !== null) writeStyle(root, 'transform', translateOf(rect.x1, rect.y1));
  }

  private build(name: string): ToolbarEntry {
    const elements = this.deps.views.packageToolbar(name);
    const { ellipsis, root } = elements;
    const target: MenuTarget = { kind: 'package', name };
    const entry: ToolbarEntry = { name, elements };

    ellipsis.addEventListener('click', (): void => this.deps.onMenu(target, ellipsis));
    this.deps.layer.prepend(root);

    return entry;
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
