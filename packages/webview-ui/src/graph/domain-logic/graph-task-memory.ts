import type { GraphPackage, GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { NO_NAMES } from '../common/graph-task.const.ts';
import type { TaskMemoryModes, TaskNaming } from '../common/graph-task.type.ts';
import type { LocationFacts } from '../common/location.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import type { TaskViewChecks } from '../common/task-controls.type.ts';
import type { TaskGridFacts } from '../common/task-grid.type.ts';
import { folderOf } from '../utils/folder-group.util.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';
import { labelsOf } from '../utils/package-label.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';
import { taskPoolOf } from '../utils/task-pool.util.ts';

/** A package's name and the folder its path sits in. */
const folderEntryOf = (pkg: GraphPackage): [string, string] => [pkg.name, folderOf(pkg.path)];

/**
 * What task mode remembers: the host's latest task listing and the pool drawn from it (the turbo tasks, plus the scripts
 * when shown), hash, single-package flag, root label, scope and scripts bits, whether the listing holds a script, package
 * labels and folders, and the task view it saves through `TaskMemoryModes`.
 */
export class GraphTaskMemory {
  private readonly modes: TaskMemoryModes;
  private latestTasks: GraphTask[] = [];
  private pool: GraphTask[] = [];
  private listedIds: ReadonlySet<string> = new Set();
  private latestHash = '';
  private isSinglePackage = false;
  private latestRootLabel: string | null = null;
  private isScopeShown = true;
  private isScriptsShown = true;
  private hasScripts = false;
  private labels: ReadonlyMap<string, string> = NO_NAMES;
  private folders: ReadonlyMap<string, string> = NO_NAMES;

  public constructor(modes: TaskMemoryModes) {
    this.modes = modes;
  }

  public keep(state: GraphReady): void {
    this.latestTasks = state.tasks;
    this.pool = taskPoolOf(state.tasks, state.scriptsShown);
    this.listedIds = new Set(state.tasks.map(({ id }) => id));
    this.latestHash = state.hash;
    this.isSinglePackage = state.singlePackage;
    this.latestRootLabel = state.rootLabel;
    this.isScopeShown = state.scopeShown;
    this.isScriptsShown = state.scriptsShown;
    this.hasScripts = state.tasks.some((task) => !task.isTurboTask);
    this.labels = labelsOf(state.packages, state.scopeShown);
    this.folders = new Map(state.packages.map(folderEntryOf));
  }

  /**
   * How the task boxes are named and grouped: grouped as the saved view says (a fresh view is grouped), never for a single
   * package; the labels and folders come from the package records, so neither holds the root `//` of a monorepo.
   */
  public naming(): TaskNaming {
    const grouped = this.isViewGrouped() && !this.isSinglePackage;
    const naming: TaskNaming = { grouped, scopeShown: this.isScopeShown, labels: this.labels, folders: this.folders };

    return naming;
  }

  /**
   * What the View boxes read: grouped as the saved view says, whether grouping applies (never to a single package), the
   * scope and scripts bits of the state, and whether the full listing, not the pool, holds a script: hidden scripts leave
   * the pool, and the box that turns them back on must stay.
   */
  public viewChecks(): TaskViewChecks {
    const checks: TaskViewChecks = {
      grouped: this.isViewGrouped(),
      canGroup: !this.isSinglePackage,
      scopeShown: this.isScopeShown,
      scriptsShown: this.isScriptsShown,
      hasScripts: this.hasScripts
    };

    return checks;
  }

  /**
   * What the Projects grid lists: the pool (hidden scripts are not in it), the effective choice (its ids outside the pool
   * are in no line, so no check counts them), the ids `shown` draws, the naming and the root label of a single-package root.
   */
  public gridFacts(shown: ReadonlySet<string>): TaskGridFacts {
    const chosen = new Set(this.chosenIds());
    const facts: TaskGridFacts = { tasks: this.pool, chosen, shown, naming: this.naming(), rootLabel: this.latestRootLabel };

    return facts;
  }

  /** The pool task mode draws and counts. */
  public tasks(): GraphTask[] {
    return this.pool;
  }

  /** The full listing, scripts included, which tells a hidden script from an unknown id. */
  public listed(): GraphTask[] {
    return this.latestTasks;
  }

  public hash(): string {
    return this.latestHash;
  }

  public rootLabel(): string | null {
    return this.latestRootLabel;
  }

  public view(): TaskViewState {
    return this.modes.task() ?? freshTaskViewOf();
  }

  /**
   * The effective choice a check edits: the saved ids, outside-the-pool ones included; on the single-package fallback, the
   * saved ids followed by every pool id, so a check never drops an id outside the pool.
   */
  public chosenIds(): string[] {
    const { chosen } = this.view();
    const isFallback = this.isFallback(chosen);

    if (!isFallback) return chosen;

    const poolIds = this.poolIds();

    return [...chosen, ...poolIds];
  }

  /** A single-package root with none of its chosen ids listed shows every task, without saving that choice. */
  public shownSet(): ShownSet {
    const { chosen, depth, capLifted } = this.view();
    const effective = this.effectiveChosen(chosen);

    return shownSetOf({ tasks: this.pool, chosen: effective, depth, capLifted, listedIds: this.listedIds });
  }

  /**
   * The one package of the chosen tasks the state knows (the workspace root `//` too), `null` for none or several; the
   * `taskCount` shown, which the caller counted from the shown set it drew; whether the state is a single package; and
   * the package labels.
   */
  public locationFacts(taskCount: number): LocationFacts {
    const chosen = new Set(this.view().chosen);
    const known = this.latestTasks.filter((task) => chosen.has(task.id));
    const packages = new Set(known.map((task) => task.packageName));
    const [only] = packages;
    const isOneDrawnPackage = packages.size === 1 && only !== undefined;
    const taskPackage = isOneDrawnPackage ? only : null;
    const facts: LocationFacts = { taskPackage, taskCount, isSinglePackage: this.isSinglePackage, labels: this.labels };

    return facts;
  }

  public save(edit: Partial<TaskViewState>): void {
    const last = this.view();
    const view: TaskViewState = { ...last, ...edit };

    this.modes.saveTask(view, this.latestHash);
  }

  /** Whether the saved view is grouped; a fresh view is. */
  private isViewGrouped(): boolean {
    return this.modes.current()?.grouped ?? true;
  }

  private poolIds(): string[] {
    return this.pool.map((task) => task.id);
  }

  /** Whether `chosen` falls back to the whole pool: a single-package root whose pool holds none of it. */
  private isFallback(chosen: string[]): boolean {
    const pooled = new Set(this.poolIds());
    const isAnyPooled = chosen.some((id) => pooled.has(id));

    return this.isSinglePackage && !isAnyPooled;
  }

  /** Every pool id on the single-package fallback; `chosen` otherwise. */
  private effectiveChosen(chosen: string[]): string[] {
    const isFallback = this.isFallback(chosen);

    if (!isFallback) return chosen;

    return this.poolIds();
  }
}
