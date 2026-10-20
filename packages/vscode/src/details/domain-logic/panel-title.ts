import type { WorkspaceModel } from '@turbo-console/core';

import { panelTitleOf, shownLabelOf } from '../utils/panel-package.util.ts';

/**
 * The tab title of one panel, and the label its package last showed. Once the package leaves the model both stay
 * on that label, so the tab and the page heading keep agreeing.
 */
export class PanelTitle {
  private readonly packageName: string;
  private readonly setTitle: (title: string) => void;
  private known: string | null = null;

  public constructor(packageName: string, setTitle: (title: string) => void) {
    this.packageName = packageName;
    this.setTitle = setTitle;
  }

  /** The label the package last showed; `null` before it was first seen. */
  public get lastLabel(): string | null {
    return this.known;
  }

  /** Takes the package's label from `model` when it holds the package, then sets the title. */
  public sync(model: WorkspaceModel | null | undefined): void {
    this.known = shownLabelOf(model, this.packageName) ?? this.known;
    this.setTitle(panelTitleOf(model, this.packageName, this.known));
  }
}
