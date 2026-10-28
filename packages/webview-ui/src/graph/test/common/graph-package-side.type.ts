import type { Mock, Mocked } from 'vitest';

import type { LayoutRuns } from './graph-layouts.type.ts';
import type { PackageDetails } from '../../common/details-view.type.ts';
import type { GraphControllerDeps, GraphView, ViewStateSaver } from '../../common/graph-page.type.ts';
import type { PackageSideHooks } from '../../common/graph-task.type.ts';
import type { PageElements } from '../../common/page-elements.type.ts';

/** The deps of a `GraphPackageSide` under test: the page and the view it shows on, its layout runs, the saver, the hooks it calls on a message and on a place, and the package views it built. */
export type PackageSideDepsMock = {
  readonly deps: GraphControllerDeps;
  readonly page: PageElements;
  readonly view: Mocked<GraphView>;
  readonly runs: LayoutRuns;
  readonly saver: ViewStateSaver;
  readonly onMessage: Mock<PackageSideHooks['onMessage']>;
  readonly onPlaced: Mock<PackageSideHooks['onPlaced']>;
  /** The package views built so far, the latest last. */
  readonly packageViews: PackageDetails[];
};
