/** `source` is the dependent package, `target` the dependency it needs. */
export type GraphEdge = {
  readonly source: string;
  readonly target: string;
};

/** A package as the page lists it; the host deduplicates and sorts `tags`. */
export type GraphPackage = {
  readonly name: string;
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
  readonly tasks: GraphTask[];
  /** Sorted by umbrella id; not part of the layout hash. */
  readonly atomGroups: GraphAtomGroup[];
  /** Whether the root is a single-package turbo repo, whose one package is `//`. */
  readonly singlePackage: boolean;
  /** The `//` package's label when `singlePackage`, else `null`; `null` too when that package has no label. */
  readonly rootLabel: string | null;
};

export type GraphState = GraphLoading | GraphError | GraphReady;
