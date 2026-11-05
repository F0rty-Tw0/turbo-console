import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { modeFocusOf } from '../utils/mode-focus.util.ts';

/**
 * Task mode is being left: a mode button with focus hands it to `modeFocusOf` once the package graph shows, as the loading
 * screen drops it.
 */
export class PackageModeFocus {
  private readonly page: PageElements;
  private isKept = false;

  public constructor(page: PageElements) {
    this.page = page;
  }

  /** Remembers whether a mode button has focus now. */
  public keep(): void {
    const { activeElement } = document;
    const { packagesMode, taskMode } = this.page;

    this.isKept = activeElement === packagesMode || activeElement === taskMode;
  }

  /** The screen, its `showGraph` giving the kept focus back once the graph shows. */
  public screenOf(screen: LayoutScreen): LayoutScreen {
    const focused: LayoutScreen = { ...screen, showGraph: (isFallback: boolean): void => this.showGraph(screen, isFallback) };

    return focused;
  }

  private showGraph(screen: LayoutScreen, isFallback: boolean): void {
    const { activeElement, body } = document;
    const isFocusLost = activeElement === null || activeElement === body;
    const isRefocus = this.isKept && isFocusLost;

    screen.showGraph(isFallback);
    this.isKept = false;

    if (isRefocus) modeFocusOf(this.page).focus();
  }
}
