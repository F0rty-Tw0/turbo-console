import { FIXTURE_PACKAGE_MANAGER, renderLockfile } from '@turbo-console/repo-gen';
import type { FixtureFile } from '@turbo-console/repo-gen';

/** The package whose tasks the gates watch from below. */
export const RUN_LOG_LIB_STUB: string = '@acme/lib';

/** The package that depends on `RUN_LOG_LIB_STUB`, so its tasks wait for the lib's. */
export const RUN_LOG_APP_STUB: string = '@acme/app';

/**
 * What the lib `build` script prints once it runs. The script builds it from two halves: the package manager echoes
 * the script line before running it, and that echo must not hold the whole text.
 */
export const LIB_READY_STUB: string = 'lib-ready';

/** The file, in the repo root, whose appearance lets the lib `build` script exit. */
export const GO_FILE_STUB: string = 'go';

/**
 * The repo-relative folder the runs write their logs to. The gate repo creates it up front so the runs share it, and
 * because turbo does not create a missing log folder on Windows (the missing-dir row pins that).
 */
export const RUN_LOG_DIR_STUB: string = '.turbo/turbo-console';

/** How long the lib `build` script waits for `GO_FILE_STUB` before it exits 2: long past any gate. */
const GO_WAIT_MS = 60_000;

/** Prints `LIB_READY_STUB`, then polls for `GO_FILE_STUB` every 50 ms and exits 0 once it exists. */
const LIB_BUILD_SCRIPT = `node -e "console.log('lib'+'-ready');const f=require('fs'),t=Date.now();const i=setInterval(()=>{if(f.existsSync('../../${GO_FILE_STUB}')){clearInterval(i)}else if(Date.now()-t>${GO_WAIT_MS}){process.exit(2)}},50)"`;

/** Writes its argv to `.turbo/args-<own folder>.json` in the repo root, so a run can show which tasks got which args. */
const PRINT_ARGS_FILE = `const path = require('path');
const fs = require('fs');
const out = path.join(__dirname, '..', '..', '.turbo', 'args-' + path.basename(__dirname) + '.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(process.argv.slice(2)));
`;

const ARGS_SCRIPT = 'node print-args.js';

const LIB_SCRIPTS = {
  build: LIB_BUILD_SCRIPT,
  args: ARGS_SCRIPT,
  fail: `node -e "console.log('fail'+'-line');process.exit(3)"`,
  quiet: `node -e "console.log('quiet'+'-line')"`,
  hit: `node -e "console.log('hit'+'-line')"`,
  'hit-flag': `node -e "console.log('hit'+'-line')"`
};

const APP_SCRIPTS = { build: `node -e "console.log('app'+'-build')"`, 'after-fail': 'node -e 0', args: ARGS_SCRIPT };

const fileOf = (path: string, content: string): FixtureFile => {
  const file: FixtureFile = { path, content };

  return file;
};

const LIB_MANIFEST = JSON.stringify({ name: RUN_LOG_LIB_STUB, scripts: LIB_SCRIPTS });

const APP_DEPENDENCIES = { [RUN_LOG_LIB_STUB]: 'workspace:*' };

const APP_MANIFEST = JSON.stringify({ name: RUN_LOG_APP_STUB, scripts: APP_SCRIPTS, dependencies: APP_DEPENDENCIES });

const ROOT_MANIFEST = JSON.stringify({ name: 'root', private: true, packageManager: FIXTURE_PACKAGE_MANAGER });

const BUILD_TASK = { dependsOn: ['^build'], cache: false };

const FAIL_TASK = { cache: false };

const AFTER_FAIL_TASK = { dependsOn: ['^fail'], cache: false };

const QUIET_TASK = { outputLogs: 'none', cache: false };

const ARGS_TASK = { dependsOn: ['^args'], cache: false };

const TURBO_TASKS = {
  build: BUILD_TASK,
  fail: FAIL_TASK,
  'after-fail': AFTER_FAIL_TASK,
  quiet: QUIET_TASK,
  args: ARGS_TASK,
  hit: {},
  'hit-flag': {}
};

const TURBO_JSON = JSON.stringify({ tasks: TURBO_TASKS });

const LOCKFILE = renderLockfile([
  { name: RUN_LOG_LIB_STUB, path: 'packages/lib', dependencies: [] },
  { name: RUN_LOG_APP_STUB, path: 'packages/app', dependencies: [RUN_LOG_LIB_STUB] }
]);

/**
 * A two-package repo for the structured-log gates: `app` depends on `lib`; the lib `build` waits for a `go` file; `fail`
 * exits 3; `quiet` hides its output; `hit` and `hit-flag` are cacheable without outputs; `args` in both packages writes
 * its argv to `.turbo/args-<folder>.json`, and the app's depends on the lib's. `go` is git-ignored so creating it never
 * changes a task's inputs. The pnpm pin and env lockfile match CI's pnpm.
 */
export const RUN_LOG_FIXTURE_FILES_STUB: FixtureFile[] = [
  fileOf('package.json', ROOT_MANIFEST),
  LOCKFILE,
  fileOf('pnpm-workspace.yaml', 'packages:\n  - packages/*\n'),
  fileOf('turbo.json', TURBO_JSON),
  fileOf('.gitignore', `.turbo\nnode_modules\n${GO_FILE_STUB}\n`),
  fileOf('packages/lib/package.json', LIB_MANIFEST),
  fileOf('packages/lib/print-args.js', PRINT_ARGS_FILE),
  fileOf('packages/app/package.json', APP_MANIFEST),
  fileOf('packages/app/print-args.js', PRINT_ARGS_FILE)
];
