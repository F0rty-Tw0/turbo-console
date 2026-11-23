import { PACKAGE_LEGEND_ROWS } from './legend-package.const.ts';
import { TASK_LEGEND_ROWS } from './legend-task.const.ts';
import type { LegendMode, LegendRow } from './legend.type.ts';

export const LEGEND_LABEL = 'Legend';

export const LEGEND_TITLE = 'What the lines and borders mean';

export const LEGEND_ID = 'graph-legend';

export const LEGEND_HEADING_ID = 'graph-legend-heading';

/** The package and task rows; the page shows the list that matches its mode. */
export const LEGEND_ROWS: Readonly<Record<LegendMode, LegendRow[]>> = {
  packages: PACKAGE_LEGEND_ROWS,
  tasks: TASK_LEGEND_ROWS
};
