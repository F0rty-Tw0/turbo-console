import type { PackageRole, TaskKind } from '@turbo-console/repo-gen';

export type LaunchName =
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L4'
  | 'L5'
  | 'L6'
  | 'L7'
  | 'L8'
  | 'L9'
  | 'L10'
  | 'L11'
  | 'L12'
  | 'L13'
  | 'L14'
  | 'L15'
  | 'L16'
  | 'L17'
  | 'L18'
  | 'L19';

/**
 * `fixture-l1` is the `target-like` copy L1 opens and L2 reopens, so L2 finds the cache L1 stored. `fixture` is a
 * fresh copy of the launch's own, `empty-folder` an empty dir, and `error-roots` a two-folder `.code-workspace`: `bad`
 * with an invalid `turbo.json`, `empty` with `pnpm-workspace.yaml` globs that match no package. `two-roots` is a
 * two-folder `.code-workspace` of clean copies, `a` and `b`. `single-package` is a git-initialised single-package repo
 * (`single-app`), `empty-workspace` one whose `pnpm-workspace.yaml` declares `packages/*` and finds none. `fixture-root-task` is
 * a `fixture` copy whose root also has the task `//#rootgen` (L13 only). `fixture-feat` is a `fixture` copy on branch `feat`
 * with a README commit in one package and an uncommitted source edit in a leaf (L15); `fixture-no-git` a `fixture` copy
 * without its `.git` (L16); `fixture-feat-package` is `fixture-feat` with `futureFlags.affectedUsingTaskInputs` off (L17),
 * `fixture-feat-committed` the same without the uncommitted edit (L18).
 */
export type LaunchWorkspace =
  | 'fixture-l1'
  | 'fixture'
  | 'fixture-root-task'
  | 'fixture-feat'
  | 'fixture-no-git'
  | 'fixture-feat-package'
  | 'fixture-feat-committed'
  | 'empty-folder'
  | 'error-roots'
  | 'two-roots'
  | 'single-package'
  | 'empty-workspace';

/**
 * The user setting `turboConsole.turboPath`: `dev` is the dev turbo binary, `stub` a POSIX script that prints
 * `2.12.0` for any arguments, `late` the dev turbo binary behind a `${command:…}` segment that VS Code resolves only
 * when it runs a task, and `unset` leaves the setting out.
 */
export type LaunchTurboPath = 'dev' | 'stub' | 'late' | 'unset';

/** `U1` is the user-data dir L1 and L2 share; `own` is one only this launch uses. */
type LaunchUserData = 'U1' | 'own';

/**
 * One VS Code window of the integration run (spec §5.3). `suite` names the bundle `dist-test/<suite>.cjs`, `env` is
 * merged into `extensionTestsEnv`, `unsetEnv` names host env variables the launch deletes, and `settings` go into the user
 * settings before the window opens.
 */
export type Launch = {
  readonly name: LaunchName;
  readonly suite: string;
  readonly workspace: LaunchWorkspace;
  readonly turboPath: LaunchTurboPath;
  readonly userData: LaunchUserData;
  readonly posixOnly: boolean;
  readonly env: Readonly<Record<string, string>>;
  readonly unsetEnv?: string[];
  readonly settings: Readonly<Record<string, string>>;
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

/** What a launch opens (a folder or a `.code-workspace` file) and the folders it holds, whose files get backdated. */
export type PreparedWorkspace = {
  readonly open: string;
  readonly folders: string[];
};

/** How a workspace kind prepares what its launch opens. */
export type WorkspacePrep = (scratch: RunScratch, name: LaunchName) => Promise<PreparedWorkspace>;

/** The run's shared state: the fixture copy, its manifest file and the scratch dir that holds U1. */
export type RunScratch = {
  readonly dir: string;
  readonly fixtureDir: string;
  readonly manifestFile: string;
  readonly dispose: () => Promise<void>;
};

/** L1's cold tree-visible span less its turbo time, and the slack it is budgeted against, both in ms. */
export type ColdTree = {
  readonly ownMs: number;
  readonly slackMs: number;
};

/** A closed span of `performance.now()` times, in ms. */
export type TimeRange = {
  readonly start: number;
  readonly end: number;
};

/** One turbo process: its spawn-to-close range, and the cpu time this thread used over that range, in ms. */
export type TurboRun = {
  readonly start: number;
  readonly end: number;
  readonly busyMs: number;
};

/**
 * One dry-run spawn's close: its `performance.now()` time, its `spawnargs`, and whether a signal ended it. `aborted` is
 * POSIX-only: on Windows an abort runs `taskkill /T /F`, so the close has exit code 1 and no signal. A proof must not rest on it.
 */
export type DryRunClose = {
  readonly at: number;
  readonly args: string[];
  readonly aborted: boolean;
};

/**
 * `count` is the turbo spawns since the last `reset`, `--version` calls left out. `turboMs` is how long this thread sat
 * idle while turbo processes ran inside `window` (see `idleMs`), `--version` calls included; a process still running is
 * left out. `dryRuns` is the `spawnargs` of each counted spawn that carries `--dry=json` since the last `reset`, and
 * `dryRunCloses` when each of them closed since then, and whether a signal ended it (an aborted prediction).
 * `affectedQueries` is the `spawnargs` of each counted spawn whose args carry the `affectedTasks(` query since the last `reset`.
 */
export type SpawnCounter = {
  readonly count: () => number;
  readonly dryRuns: () => string[][];
  readonly affectedQueries: () => string[][];
  readonly dryRunCloses: () => DryRunClose[];
  readonly turboMs: (window: TimeRange) => number;
  readonly reset: () => void;
  readonly dispose: () => void;
};

export type ShownPackage = {
  readonly name: string;
  readonly path: string;
  readonly role: PackageRole;
  readonly dependencies: string[];
  readonly tags: string[];
};

export type ShownTask = {
  readonly fullName: string;
  readonly packageName: string;
  readonly kind: TaskKind;
  readonly dependencies: string[];
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
