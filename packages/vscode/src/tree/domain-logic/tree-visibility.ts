import type { VisibleView } from '../common/visible-view.type.ts';

/**
 * Whether the Packages view is shown, for `TurboConsoleApi.treeVisible`. The API exists before the view does (the view
 * is created in the trusted branch of `activate`), so it reads `false` until `bind` hands it the view.
 */
export class TreeVisibility {
  private view: VisibleView | null = null;

  public bind(view: VisibleView): void {
    this.view = view;
  }

  public readonly read = (): boolean => this.view?.visible ?? false;
}
