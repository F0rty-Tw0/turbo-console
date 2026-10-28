import type { FolderRowElements, WidgetViews } from '../../common/widget.type.ts';

/** The real widget views, recording every folder row they build. */
export type WidgetRowViewsMock = {
  readonly views: WidgetViews;
  /** The rows built so far, the latest last. */
  readonly built: FolderRowElements[];
};
