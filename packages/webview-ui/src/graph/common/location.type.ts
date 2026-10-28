import type { DrawnGraph } from './graph-page.type.ts';
import type { TaskModes } from './graph-task.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { WidgetViews } from './widget.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';

/** A crumb of the location bar: "Packages", a focused folder, the package of a task choice, or "Tasks (n)". */
export type LocationCrumb = {
  readonly kind: 'packages' | 'folder' | 'package' | 'tasks';
  readonly label: string;
  /** The folder key or package name the crumb stands for; empty for "Packages" and "Tasks (n)". */
  readonly name: string;
  /** The last crumb: text with `aria-current="page"`, never a button. */
  readonly isCurrent: boolean;
};

/**
 * What the location bar shows: the mode, the focused folder, the one package of the chosen tasks, the shown task count,
 * and whether the repo is a single package, whose page never leaves task mode.
 */
export type LocationState = {
  readonly mode: GraphViewMode;
  readonly folder: string | null;
  readonly taskPackage: string | null;
  readonly taskCount: number;
  readonly isSinglePackage: boolean;
};

/**
 * What task mode adds to the location: the one package every chosen task belongs to, `null` for none or several, the
 * shown count, and the single-package flag.
 */
export type LocationFacts = Pick<LocationState, 'taskPackage' | 'taskCount' | 'isSinglePackage'>;

/** `nav.graph-location`, a page row directly before the body: the crumbs, then the folder focus info lines. */
export type LocationBarElements = {
  readonly nav: HTMLElement;
  readonly crumbs: HTMLOListElement;
  readonly lines: HTMLUListElement;
};

/** A crumb button was pressed. */
export type LocationPress = (crumb: LocationCrumb) => void;

/** The location bar renderer, handed in because `domain-logic` may not import `ui`. */
export type LocationViews = {
  readonly render: (elements: LocationBarElements, crumbs: LocationCrumb[], lines: string[], press: LocationPress) => void;
};

/** The location bar as the controller and its hooks call it: `update` reads the mode, the folder focus and the task facts again. */
export type GraphLocation = {
  readonly update: () => void;
};

type LocationControls = {
  readonly focusedFolder: () => string | null;
  /** Clears a folder focus only. */
  readonly clearFocus: () => void;
};

type LocationFiltering = {
  readonly controls: LocationControls;
};

/** The package side as the bar reads it: the folder focus, its info lines' graph, and the way out of a focus. */
type LocationPackages = {
  readonly filtering: LocationFiltering;
  readonly drawnGraph: () => DrawnGraph | null;
};

type LocationMemory = {
  readonly locationFacts: () => LocationFacts;
};

/** Task mode as the bar reads it: the facts of the shown tasks, and the way back to package mode. */
type LocationTasks = {
  readonly memory: LocationMemory;
  readonly leave: () => void;
};

type LocationReveal = {
  readonly request: (name: string) => void;
};

/** What `graphLocationOf` reads when the bar updates and calls when a crumb is pressed. */
export type GraphLocationDeps = {
  readonly page: Pick<PageElements, 'location'>;
  readonly widgetViews: Pick<WidgetViews, 'location'>;
  readonly modes: Pick<TaskModes, 'mode'>;
  readonly packages: LocationPackages;
  readonly tasks: LocationTasks;
  readonly reveal: LocationReveal;
};
