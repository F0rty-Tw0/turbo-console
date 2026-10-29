import { vi } from 'vitest';

import { flowControlMock } from './graph-flow.mock.ts';
import { graphViewMock } from './graph-view.mock.ts';
import { layoutRunsMock } from './layout-runner.mock.ts';
import { mediaQueryMock } from './media-query.mock.ts';
import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { BundleDetails, PackageDetails } from '../../common/details-view.type.ts';
import type { BundleViewModel, DetailsViews, PackageViewModel } from '../../common/details.type.ts';
import type { GraphControllerDeps } from '../../common/graph-page.type.ts';
import type { PackageSideHooks } from '../../common/graph-task.type.ts';
import type { LocationViews } from '../../common/location.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import type { TaskControlsViews } from '../../common/task-controls.type.ts';
import type { TaskDetailsViews } from '../../common/task-details.type.ts';
import type { WidgetViews } from '../../common/widget.type.ts';
import { buildControls } from '../../ui/controls-elements.ts';
import { bundleView } from '../../ui/details-bundle.ts';
import { buildDetails } from '../../ui/details-elements.ts';
import { emptyView } from '../../ui/details-empty.ts';
import { explainView } from '../../ui/details-explain.ts';
import { folderView } from '../../ui/details-folder.ts';
import { hintView } from '../../ui/details-hint.ts';
import { linkView } from '../../ui/details-link.ts';
import { packageView } from '../../ui/details-package.ts';
import { candidateItems, pickingView } from '../../ui/details-picking.ts';
import { stepItems, traceView } from '../../ui/details-trace.ts';
import { renderLocation, renderLocationLines } from '../../ui/location-elements.ts';
import { buildPage } from '../../ui/page-elements.ts';
import { buildTaskControls, buildTaskRow } from '../../ui/task-controls-elements.ts';
import { buildTaskDetails, buildTaskDetailsEmpty, buildTaskDetailsPanel } from '../../ui/task-details-elements.ts';
import { buildFolderRow, buildPackageToolbar, buildTaskToolbar } from '../../ui/widget-elements.ts';
import { buildMenu } from '../../ui/widget-menu.ts';
import type { PackageSideDepsMock } from '../common/graph-package-side.type.ts';
import { HOME_CAMERA_STUB } from '../stubs/layout.stub.ts';

const NODE_SIZE: NodeSize = { width: 100, height: 32 };

/** The real details view builders, for specs that build a `GraphDetails` without importing `ui/`. */
export const detailsViewsMock = (): DetailsViews => {
  const views: DetailsViews = {
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

  return views;
};

const LOCATION_VIEWS: LocationViews = { render: renderLocation, renderLines: renderLocationLines };

const WIDGET_VIEWS: WidgetViews = {
  row: buildFolderRow,
  taskToolbar: buildTaskToolbar,
  packageToolbar: buildPackageToolbar,
  menu: buildMenu,
  location: LOCATION_VIEWS
};

const TASK_VIEWS: TaskControlsViews = { build: buildTaskControls, row: buildTaskRow };

const TASK_DETAILS_VIEWS: TaskDetailsViews = {
  panel: buildTaskDetailsPanel,
  empty: buildTaskDetailsEmpty,
  view: buildTaskDetails
};

/**
 * The deps of a `GraphPackageSide` over the real page and panel builders, for the spec's fake `document`, with the view
 * and the layout runner doubled and every package view recorded; the host saved nothing.
 */
export const packageSideDepsMock = (): PackageSideDepsMock => {
  const page = buildPage();
  const view = graphViewMock(HOME_CAMERA_STUB);
  const runs = layoutRunsMock();
  const saver = { schedule: vi.fn(), flush: vi.fn() };
  const bridge: Bridge = { ready: vi.fn(), post: vi.fn(), onMessage: vi.fn(), savedState: vi.fn(() => null), saveState: vi.fn() };
  const packageViews: PackageDetails[] = [];
  const recordedPackageView = (model: PackageViewModel, isOverlay: boolean): PackageDetails => {
    const built = packageView(model, isOverlay);

    packageViews.push(built);

    return built;
  };
  const bundleViews: BundleDetails[] = [];
  const recordedBundleView = (model: BundleViewModel, isOverlay: boolean): BundleDetails => {
    const built = bundleView(model, isOverlay);

    bundleViews.push(built);

    return built;
  };
  const realViews = detailsViewsMock();
  const views: DetailsViews = { ...realViews, package: recordedPackageView, bundle: recordedBundleView };
  const deps: GraphControllerDeps = {
    bridge,
    page,
    createView: vi.fn(() => view),
    createFlow: flowControlMock,
    runner: runs.runner,
    saver,
    sizeOf: (): NodeSize => NODE_SIZE,
    taskSizeOf: (): NodeSize => NODE_SIZE,
    measure: (text: string): number => text.length,
    now: (): number => 0,
    build: buildControls,
    views,
    widgetViews: WIDGET_VIEWS,
    taskViews: TASK_VIEWS,
    taskDetailsViews: TASK_DETAILS_VIEWS,
    overlay: mediaQueryMock(false),
    background: (): string => ''
  };
  const onMessage = vi.fn<PackageSideHooks['onMessage']>();
  const onPlaced = vi.fn<PackageSideHooks['onPlaced']>();
  const onLocation = vi.fn<PackageSideHooks['onLocation']>();
  const mock: PackageSideDepsMock = { deps, page, view, runs, saver, onMessage, onPlaced, onLocation, packageViews, bundleViews };

  return mock;
};
