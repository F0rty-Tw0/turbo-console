type AtomGroupsSpec = {
  readonly count: number;
  readonly filesPerGroup: number;
  readonly liveRatio: number;
};

/** Shape of one synthetic Turborepo fixture; `packages` counts every workspace package, atom packages included. */
export type FixtureSpec = {
  readonly seed: number;
  readonly packages: number;
  readonly tasksPerPackage: number;
  readonly maxDepth: number;
  readonly hubFanIn: number;
  readonly phantomRatio: number;
  readonly narrowInputsTask: string;
  readonly atomGroups: AtomGroupsSpec;
  readonly affectedUsingTaskInputs: boolean;
};

export type PresetName = 'stress' | 'stretch-300' | 'target-like';

export type TaskKind = 'aggregate' | 'atom-file' | 'carrier' | 'phantom' | 'task' | 'umbrella';

export type FixtureFile = {
  readonly path: string;
  readonly content: string;
};

export type PackageRole = 'atom-definitions' | 'atom-test' | 'hub' | 'regular';

export type ManifestPackage = {
  readonly name: string;
  readonly path: string;
  readonly role: PackageRole;
  readonly tags: string[];
  readonly dependencies: string[];
};

export type ManifestTask = {
  readonly fullName: string;
  readonly packageName: string;
  readonly taskName: string;
  readonly kind: TaskKind;
  readonly dependencies: string[];
  readonly visible: boolean;
};

export type Manifest = {
  readonly packages: ManifestPackage[];
  readonly tasks: ManifestTask[];
};

/** A private copy of a cached fixture repo; `dispose` deletes the copy, never the cache. */
export type FixtureHandle = {
  readonly dir: string;
  readonly manifest: Manifest;
  readonly dispose: () => Promise<void>;
};

export type PackagePlan = {
  readonly name: string;
  readonly path: string;
  readonly level: number;
  readonly tags: string[];
  readonly dependencies: string[];
  readonly tasks: string[];
  readonly phantoms: string[];
  readonly role: PackageRole;
};

export type SpecFile = {
  readonly path: string;
  readonly live: boolean;
};

/**
 * One test package (`apps/e2e-<index>`) and its definitions package (`tools/e2e-<index>-atoms`); `index` starts at 1.
 * `dependencies` are the test package's workspace dependencies (the app it tests); the definitions package has none.
 */
export type AtomGroupPlan = {
  readonly index: number;
  readonly testPackage: string;
  readonly definitionsPackage: string;
  readonly dependencies: string[];
  readonly specFiles: SpecFile[];
};

export type FixturePlan = {
  readonly spec: FixtureSpec;
  readonly packages: PackagePlan[];
  readonly atomGroups: AtomGroupPlan[];
};
