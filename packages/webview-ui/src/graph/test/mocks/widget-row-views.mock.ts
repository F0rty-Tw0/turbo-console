import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { FolderRowElements, PackageToolbarElements, RowKind, WidgetViews } from '../../common/widget.type.ts';
import { widgetViews } from '../../ui/graph-views.ts';
import type { WidgetRowViewsMock } from '../common/widget-row-views.type.ts';

/** The page's widget views with `row` recording what it builds, so a spec reaches each row's buttons. */
export const widgetRowViewsMock = (): WidgetRowViewsMock => {
  const built: FolderRowElements[] = [];
  const toolbars: PackageToolbarElements[] = [];
  const taskToolbars: TaskToolbarElements[] = [];
  const row = (kind: RowKind, title: string, count: number): FolderRowElements => {
    const elements = widgetViews.row(kind, title, count);

    built.push(elements);

    return elements;
  };
  const packageToolbar = (name: string, folderTitle: string | null): PackageToolbarElements => {
    const elements = widgetViews.packageToolbar(name, folderTitle);

    toolbars.push(elements);

    return elements;
  };
  const taskToolbar = (id: string): TaskToolbarElements => {
    const elements = widgetViews.taskToolbar(id);

    taskToolbars.push(elements);

    return elements;
  };
  const views: WidgetViews = { ...widgetViews, row, packageToolbar, taskToolbar };
  const mock: WidgetRowViewsMock = { views, built, toolbars, taskToolbars };

  return mock;
};
