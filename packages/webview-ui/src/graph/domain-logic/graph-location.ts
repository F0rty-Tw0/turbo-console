import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import type {
  GraphLocation,
  GraphLocationDeps,
  LocationCrumb,
  LocationFacts,
  LocationPress,
  LocationState
} from '../common/location.type.ts';
import { breadcrumbLinesOf } from '../utils/breadcrumb.util.ts';
import { locationCrumbsOf } from '../utils/location.util.ts';

const NO_TASK_FACTS: LocationFacts = { taskPackage: null, taskCount: 0 };

/** The shown tasks' facts in task mode; package mode never reads them. */
const factsOf = (deps: GraphLocationDeps, mode: GraphViewMode): LocationFacts => {
  if (mode === 'packages') return NO_TASK_FACTS;

  return deps.tasks.memory.locationFacts();
};

/** The mode, the folder focus and the task facts. */
const stateOf = (deps: GraphLocationDeps): LocationState => {
  const mode = deps.modes.mode();
  const folder = deps.packages.filtering.controls.focusedFolder();
  const facts = factsOf(deps, mode);
  const state: LocationState = { mode, folder, ...facts };

  return state;
};

/** The focused folder's info lines in package mode; none in task mode or without a focus. */
const linesOf = (deps: GraphLocationDeps, state: LocationState): string[] => {
  if (state.mode === 'tasks' || state.folder === null) return [];

  const drawn = deps.packages.drawnGraph();

  return breadcrumbLinesOf(state.folder, drawn?.infos ?? [], drawn?.edges ?? []);
};

/** "Packages" clears a folder focus in package mode and leaves task mode in task mode; a package crumb reveals the package. */
const pressOf = (deps: GraphLocationDeps): LocationPress => {
  const press = (crumb: LocationCrumb): void => {
    if (crumb.kind === 'package') {
      deps.reveal.request(crumb.name);

      return;
    }

    if (crumb.kind !== 'packages') return;

    const mode = deps.modes.mode();

    if (mode === 'tasks') {
      deps.tasks.leave();

      return;
    }

    deps.packages.filtering.controls.clearFocus();
  };

  return press;
};

/**
 * The location bar over the page, read when `update` runs: once now, then on each hook. A bar with the same crumbs and
 * lines is not rebuilt, so a redraw never moves focus off a crumb.
 */
export const graphLocationOf = (deps: GraphLocationDeps): GraphLocation => {
  const press = pressOf(deps);
  let shownKey: string | null = null;
  const update = (): void => {
    const state = stateOf(deps);
    const crumbs = locationCrumbsOf(state);
    const lines = linesOf(deps, state);
    const key = JSON.stringify([crumbs, lines]);

    if (key === shownKey) return;

    shownKey = key;
    deps.widgetViews.location.render(deps.page.location, crumbs, lines, press);
  };
  const location: GraphLocation = { update };

  update();

  return location;
};
