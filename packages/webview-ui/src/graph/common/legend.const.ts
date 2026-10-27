import { PACKAGE_LEGEND_ROWS } from './legend-package.const.ts';
import { TASK_LEGEND_ROWS } from './legend-task.const.ts';
import type { LegendRow } from './legend.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';

export const LEGEND_LABEL = 'Legend';

export const LEGEND_TITLE = 'What the lines and borders mean';

export const LEGEND_ID = 'graph-legend';

export const LEGEND_HEADING_ID = 'graph-legend-heading';

/** Both modes' rows; the page shows the list that matches its mode. */
export const LEGEND_ROWS: Readonly<Record<GraphViewMode, LegendRow[]>> = {
  packages: PACKAGE_LEGEND_ROWS,
  tasks: TASK_LEGEND_ROWS
};
