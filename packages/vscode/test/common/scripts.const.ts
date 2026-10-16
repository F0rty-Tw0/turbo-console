/** L10's package: the first `target-like` package, edited to hold three scripts no turbo.json names. */
export const SCRIPTS_PACKAGE = '@fx/pkg-001';

/** A package with scripts and no turbo task: it has a row only while scripts are shown or one of its scripts runs. */
export const SCRIPTS_ONLY_PACKAGE = '@fx/zz-scripts';

export const SCRIPTS_ONLY_FOLDER = 'zz-scripts';

export const OK_SCRIPT = 'zz-ok';

export const FAIL_SCRIPT = 'zz-fail';

export const LONG_SCRIPT = 'zz-long';

export const ROOT_SCRIPT = 'zz-root';

export const OK_TASK_ID = `${SCRIPTS_PACKAGE}#${OK_SCRIPT}`;

export const FAIL_TASK_ID = `${SCRIPTS_PACKAGE}#${FAIL_SCRIPT}`;

export const LONG_TASK_ID = `${SCRIPTS_PACKAGE}#${LONG_SCRIPT}`;

export const ONLY_LONG_TASK_ID = `${SCRIPTS_ONLY_PACKAGE}#${LONG_SCRIPT}`;

/** Every script L10 adds to `SCRIPTS_PACKAGE`; the fresh fixture has no other script no turbo.json names. */
export const ADDED_TASK_IDS = [FAIL_TASK_ID, LONG_TASK_ID, OK_TASK_ID];

export const NOOP_SCRIPT_BODY = 'node -e 0';

export const FAIL_SCRIPT_BODY = 'node -e "process.exit(3)"';

export const FAIL_EXIT_CODE = 3;

/** Where `LONG_SCRIPT_BODY` writes its pid, relative to its package: under `.turbo/`, which the fixture's `.gitignore` holds. */
export const LONG_PID_PATH = ['.turbo', 'l10-long.pid'];

/** A script that runs until stopped and says it has started by writing its pid (L9's `DEV_SCRIPT` pattern). */
export const LONG_SCRIPT_BODY =
  "node -e \"const f=require('fs');f.mkdirSync('.turbo',{recursive:true});f.writeFileSync('.turbo/l10-long.pid',String(process.pid));setInterval(()=>{},1000)\"";

/** The command a script row's Run starts, as the Package Details card shows it. */
export const OK_RUN_COMMAND = `pnpm run ${OK_SCRIPT}`;

/** The command the CodeLens runs. */
export const LENS_COMMAND_ID = 'turboConsole.runPackageTask';
