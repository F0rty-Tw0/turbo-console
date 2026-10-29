import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { FolderRowElements, PackageToolbarElements, WidgetViews } from '../../common/widget.type.ts';

/** The real widget views, recording every folder row, package toolbar and task toolbar they build. */
export type WidgetRowViewsMock = {
  readonly views: WidgetViews;
  /** The rows built so far, the latest last. */
  readonly built: FolderRowElements[];
  /** The package toolbars built so far, the latest last. */
  readonly toolbars: PackageToolbarElements[];
  /** The task toolbars built so far, the latest last. */
  readonly taskToolbars: TaskToolbarElements[];
};
