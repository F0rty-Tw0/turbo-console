import type { Mock, Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { GraphView } from '../../common/graph-page.type.ts';
import type { PageElements } from '../../common/page-elements.type.ts';
import type { TaskWidgetsDeps } from '../../common/task-details.type.ts';
import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { MenuElements } from '../../common/widget-menu.type.ts';

/** The page, view and panel `GraphTaskWidgets` runs on, with the toolbars and menus it built. */
export type TaskWidgetsRig = {
  readonly page: PageElements;
  readonly view: Mocked<GraphView>;
  readonly bridge: Mocked<Bridge>;
  readonly onShowPackage: Mock<(name: string) => void>;
  /** The task details panel, its left edge at `PANEL_LEFT`. */
  readonly aside: HTMLElement;
  /** The task toolbars built so far, the latest last. */
  readonly toolbars: TaskToolbarElements[];
  /** The menus built so far, the latest last. */
  readonly menus: MenuElements[];
  /** The deps of a new `GraphTaskWidgets`, the overlay media query matching `isOverlay`. */
  readonly depsOf: (isOverlay: boolean) => TaskWidgetsDeps;
  /** Flips the overlay media query, running its `change` listeners. */
  readonly flipOverlay: (isOverlay: boolean) => void;
  readonly setActive: (isActive: boolean) => void;
  /** Runs the aside's ResizeObserver callbacks, as a drag of its sash does. */
  readonly resizeAside: () => void;
};
