import type { PackageRole, TaskKind } from '@turbo-console/repo-gen';

type LaunchName = 'L1' | 'L2';

/** `fixture-l1` is the `target-like` copy L1 opens and L2 reopens, so L2 finds the cache L1 stored. */
export type LaunchWorkspace = 'fixture-l1';

/** `dev` sets the user setting `turboConsole.turboPath` to the dev turbo binary. */
export type LaunchTurboPath = 'dev';

/**
 * One VS Code window of the integration run (spec §5.3). `suite` names the bundle `dist-test/<suite>.cjs`, `U1` is the
 * user-data dir L1 and L2 share, and `env` is merged into `extensionTestsEnv`.
 */
export type Launch = {
  readonly name: LaunchName;
  readonly suite: string;
  readonly workspace: LaunchWorkspace;
  readonly turboPath: LaunchTurboPath;
  readonly userData: 'U1';
  readonly posixOnly: boolean;
  readonly env: Readonly<Record<string, string>>;
};

/**
 * What the harness hands a suite, as JSON in `TURBO_CONSOLE_IT`. No root paths: VS Code's can differ from the
 * harness's on Windows, so suites read them from the workspace folders. `doneFile` is the marker a suite writes as its
 * last step, so a launch that exits 0 without running its suite to the end fails. `missFile` is this attempt's
 * timing-miss file: `budget` appends to it before it throws, so the harness tells a timing miss from a functional failure.
 */
export type SuiteEnv = {
  readonly manifestFile: string | null;
  readonly turboPath: string | null;
  readonly budgetFactor: number;
  readonly doneFile: string;
  readonly missFile: string;
};

/** The run's shared state: the fixture copy, its manifest file and the scratch dir that holds U1. */
export type RunScratch = {
  readonly dir: string;
  readonly fixtureDir: string;
  readonly manifestFile: string;
  readonly dispose: () => Promise<void>;
};

export type SpawnCounter = {
  readonly count: () => number;
  readonly reset: () => void;
  readonly dispose: () => void;
};

export type ShownPackage = {
  readonly name: string;
  readonly role: PackageRole;
};

export type ShownTask = {
  readonly fullName: string;
  readonly packageName: string;
  readonly kind: TaskKind;
  readonly visible: boolean;
};

/** The fields of the fixture manifest the suites read; `readManifest` checks each one. */
export type ShownManifest = {
  readonly packages: ShownPackage[];
  readonly tasks: ShownTask[];
};

/**
 * What a walk from the top reaches: the `pkg` node keys, each package's `task` row keys keyed by package (a package
 * with no task row has no entry), and the `msg` row keys; every list sorted.
 */
export type WalkedTree = {
  readonly packages: string[];
  readonly tasks: Record<string, string[]>;
  readonly messages: string[];
};
