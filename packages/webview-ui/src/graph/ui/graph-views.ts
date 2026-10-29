import { bundleView } from './details-bundle.ts';
import { buildDetails } from './details-elements.ts';
import { emptyView } from './details-empty.ts';
import { explainView } from './details-explain.ts';
import { folderView } from './details-folder.ts';
import { hintView } from './details-hint.ts';
import { linkView } from './details-link.ts';
import { packageView } from './details-package.ts';
import { candidateItems, pickingView } from './details-picking.ts';
import { stepItems, traceView } from './details-trace.ts';
import { renderLocation, renderLocationLines } from './location-elements.ts';
import { buildTaskControls, buildTaskRow } from './task-controls-elements.ts';
import { buildTaskDetails, buildTaskDetailsEmpty, buildTaskDetailsPanel } from './task-details-elements.ts';
import { buildFolderRow, buildPackageToolbar, buildTaskToolbar } from './widget-elements.ts';
import { buildMenu } from './widget-menu.ts';
import type { DetailsViews } from '../common/details.type.ts';
import type { LocationViews } from '../common/location.type.ts';
import type { TaskControlsViews } from '../common/task-controls.type.ts';
import type { TaskDetailsViews } from '../common/task-details.type.ts';
import type { WidgetViews } from '../common/widget.type.ts';

/** The package graph's details panel views. */
export const detailsViews: DetailsViews = {
  build: buildDetails,
  empty: emptyView,
  package: packageView,
  link: linkView,
  bundle: bundleView,
  explain: explainView,
  picking: pickingView,
  trace: traceView,
  folder: folderView,
  hint: hintView,
  candidateItems,
  stepItems
};

const locationViews: LocationViews = { render: renderLocation, renderLines: renderLocationLines };

export const widgetViews: WidgetViews = {
  row: buildFolderRow,
  taskToolbar: buildTaskToolbar,
  packageToolbar: buildPackageToolbar,
  menu: buildMenu,
  location: locationViews
};

export const taskViews: TaskControlsViews = { build: buildTaskControls, row: buildTaskRow };

export const taskDetailsViews: TaskDetailsViews = {
  panel: buildTaskDetailsPanel,
  empty: buildTaskDetailsEmpty,
  view: buildTaskDetails
};
