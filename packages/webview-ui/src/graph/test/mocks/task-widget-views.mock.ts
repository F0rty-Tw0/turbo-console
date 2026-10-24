import type { MenuElements, MenuItemModel } from '../../common/widget-menu.type.ts';
import { buildPage } from '../../ui/page-elements.ts';
import { buildPackageButton } from '../../ui/widget-elements.ts';
import { buildMenu } from '../../ui/widget-menu.ts';
import type { TaskWidgetViewsMock } from '../common/graph-task-mode.type.ts';

/** The real page, "…" and menu builders, so a spec clicks the "…" and the menu items `GraphTaskWidgets` wires. */
export const taskWidgetViewsMock = (): TaskWidgetViewsMock => {
  const buttons: HTMLButtonElement[] = [];
  const menus: MenuElements[] = [];
  const packageButton = (name: string): HTMLButtonElement => {
    const built = buildPackageButton(name);

    buttons.push(built);

    return built;
  };
  const menu = (model: MenuItemModel[], label: string): MenuElements => {
    const built = buildMenu(model, label);

    menus.push(built);

    return built;
  };
  const page = buildPage();
  const views = { packageButton, menu };
  const mock: TaskWidgetViewsMock = { page, views, buttons, menus };

  return mock;
};
