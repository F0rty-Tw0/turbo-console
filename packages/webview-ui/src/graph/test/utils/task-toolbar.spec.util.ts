import { vi } from 'vitest';

import { taskButtonsOf } from './node-toolbar.spec.util.ts';
import type { TaskToolbarDeps } from '../../common/task-details.type.ts';
import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { TaskToolbarRig } from '../common/task-toolbar.type.ts';
import { taskWidgetViewsMock } from '../mocks/task-widget-views.mock.ts';

/** The real page and task toolbar builder, with every click a spy. */
export const taskToolbarRigOf = (): TaskToolbarRig => {
  const { page, views, toolbars: built } = taskWidgetViewsMock();
  const { widgets: layer, container } = page;
  const deps: TaskToolbarDeps = { layer, container, views, onMenu: vi.fn(), onRun: vi.fn(), onShowPackage: vi.fn() };
  const rig: TaskToolbarRig = { layer, container, deps, built };

  return rig;
};

/** The task toolbar built last. */
export const latestOf = (rig: TaskToolbarRig): TaskToolbarElements => {
  const latest = rig.built.at(-1);

  if (latest === undefined) throw new Error('no toolbar was built');

  return latest;
};

/** The Tab stops (`tabIndex`) of the buttons that exist, in toolbar order. */
export const stopsOf = (elements: TaskToolbarElements): number[] => {
  const present = taskButtonsOf(elements).filter((button): button is HTMLButtonElement => button !== null);

  return present.map((button): number => button.tabIndex);
};
