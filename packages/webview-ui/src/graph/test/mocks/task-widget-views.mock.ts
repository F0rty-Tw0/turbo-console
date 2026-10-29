import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { MenuElements, MenuItemModel } from '../../common/widget-menu.type.ts';
import { buildPage } from '../../ui/page-elements.ts';
import { buildTaskToolbar } from '../../ui/widget-elements.ts';
import { buildMenu } from '../../ui/widget-menu.ts';
import type { TaskWidgetViewsMock } from '../common/graph-task-mode.type.ts';

/** The real page, task toolbar and menu builders, so a spec clicks the toolbar's "…" and the menu items `GraphTaskWidgets` wires. */
export const taskWidgetViewsMock = (): TaskWidgetViewsMock => {
  const toolbars: TaskToolbarElements[] = [];
  const menus: MenuElements[] = [];
  const taskToolbar = (id: string): TaskToolbarElements => {
    const built = buildTaskToolbar(id);

    toolbars.push(built);

    return built;
  };
  const menu = (model: MenuItemModel[], label: string): MenuElements => {
    const built = buildMenu(model, label);

    menus.push(built);

    return built;
  };
  const page = buildPage();
  const views = { taskToolbar, menu };
  const mock: TaskWidgetViewsMock = { page, views, toolbars, menus };

  return mock;
};
