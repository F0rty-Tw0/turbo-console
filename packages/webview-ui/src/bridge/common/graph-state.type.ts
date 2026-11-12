/** `source` is the dependent package, `target` the dependency it needs. */
export type GraphEdge = {
  readonly source: string;
  readonly target: string;
};

/** A package as the page lists it; the host deduplicates and sorts `tags`. */
export type GraphPackage = {
  readonly name: string;
  /**
   * The package's row text with its `@scope/` stripped, cleaned like a tree label (one line, control and zero-width
   * characters dropped, cut to LABEL_MAX); the full text on a collision. The root `//` reads its label, scope kept while
   * `scopeShown`, as its tree row does. Built over every graph package, so it can differ from the tree while scripts are
   * hidden; not part of the layout hash.
   */
  readonly bareName: string;
  readonly path: string;
  readonly tags: string[];
  /** The package's visible tasks; not part of the layout hash. */
  readonly taskCount: number;
};

/** A task of the graph's packages, keyed `package#task`; `command` is `null` for a task that has no script of its own. */
export type GraphTask = {
  readonly id: string;
  readonly packageName: string;
  readonly name: string;
  readonly command: string | null;
  readonly isRunnable: boolean;
  /** False for a `package.json` script that is not a turbo task. */
  readonly isTurboTask: boolean;
  readonly dependencies: string[];
};

/** The state of each task the host has run in this panel's root, by task id. */
export type GraphRunState = 'running' | 'continuous' | 'passed' | 'failed' | 'stopped' | 'failed-to-start';

/** Where a node centre sits. */
export type Position = {
  readonly x: number;
  readonly y: number;
};

/** Node centres by package name (Cytoscape `preset` convention). */
export type Positions = Readonly<Record<string, Position>>;

/** One edge's path in root coordinates: where it leaves the source, each bend, where it meets the target. */
export type EdgeRoute = {
  readonly start: Position;
  readonly bends: Position[];
  readonly end: Position;
};

/** Edge routes by edge id. */
export type Routes = Readonly<Record<string, EdgeRoute>>;

/** One spec file of an Atomizer group; `isLive` marks a file whose run keeps going. */
export type GraphAtomFile = {
  readonly id: string;
  readonly specPath: string;
  readonly isLive: boolean;
};

/** An Atomizer umbrella task and its files, sorted by spec path; the files are never in `GraphReady.tasks`. */
export type GraphAtomGroup = {
  readonly umbrellaId: string;
  readonly files: GraphAtomFile[];
};

type GraphLoading = { readonly kind: 'loading' };

type GraphError = {
  readonly kind: 'error';
  readonly message: string;
};

export type GraphReady = {
  readonly kind: 'graph';
  readonly hash: string;
  readonly packages: GraphPackage[];
  readonly edges: GraphEdge[];
  readonly positions: Positions | null;
  readonly folderPositions: Positions | null;
  /** The flat cache's routes, the pair of `positions`; `null` with `positions` null. */
  readonly routes: Routes | null;
  /** The folder cache's routes, the pair of `folderPositions`. */
  readonly folderRoutes: Routes | null;
  readonly tasks: GraphTask[];
  /** Sorted by umbrella id; not part of the layout hash. */
  readonly atomGroups: GraphAtomGroup[];
  /** Whether the root is a single-package turbo repo, whose one package is `//`. */
  readonly singlePackage: boolean;
  /** The `//` package's label when `singlePackage`, else `null`; `null` too when that package has no label. */
  readonly rootLabel: string | null;
  /** The tree's scope toggle at the time the state was built. */
  readonly scopeShown: boolean;
  /** The tree's scripts toggle at the time the state was built. */
  readonly scriptsShown: boolean;
  /** The tree's prediction toggle at the time the state was built. */
  readonly predictionShown: boolean;
  /** The tree's affected toggle at the time the state was built. */
  readonly affectedShown: boolean;
};

export type GraphState = GraphLoading | GraphError | GraphReady;
