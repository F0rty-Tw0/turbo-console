import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';

/** L10's package: the first `target-like` package, edited to hold six scripts no turbo.json names. */
export const SCRIPTS_PACKAGE = '@fx/pkg-001';

/** A package with scripts and no turbo task: it has a row only while scripts are shown or one of its scripts runs. */
export const SCRIPTS_ONLY_PACKAGE = '@fx/zz-scripts';

export const SCRIPTS_ONLY_FOLDER = 'zz-scripts';

export const OK_SCRIPT = 'zz-ok';

export const FAIL_SCRIPT = 'zz-fail';

export const LONG_SCRIPT = 'zz-long';

export const ROOT_SCRIPT = 'zz-root';

/** A script name that starts with a digit. */
export const NUMBER_SCRIPT = '1kb';

/** A script whose body only delegates to `CHAIN_APP_SCRIPT`, so its tool is the one that script runs. */
export const CHAIN_SCRIPT = 'zz-chain';

/** The script `CHAIN_SCRIPT` delegates to: it runs Vitest, and no L10 case runs it. */
export const CHAIN_APP_SCRIPT = 'zz-chain-app';

export const OK_TASK_ID = `${SCRIPTS_PACKAGE}#${OK_SCRIPT}`;

export const FAIL_TASK_ID = `${SCRIPTS_PACKAGE}#${FAIL_SCRIPT}`;

export const LONG_TASK_ID = `${SCRIPTS_PACKAGE}#${LONG_SCRIPT}`;

export const NUMBER_TASK_ID = `${SCRIPTS_PACKAGE}#${NUMBER_SCRIPT}`;

export const CHAIN_TASK_ID = `${SCRIPTS_PACKAGE}#${CHAIN_SCRIPT}`;

const CHAIN_APP_TASK_ID = `${SCRIPTS_PACKAGE}#${CHAIN_APP_SCRIPT}`;

export const ONLY_LONG_TASK_ID = `${SCRIPTS_ONLY_PACKAGE}#${LONG_SCRIPT}`;

/** Every script L10 adds to `SCRIPTS_PACKAGE`; the fresh fixture has no other script no turbo.json names. */
export const ADDED_TASK_IDS = [NUMBER_TASK_ID, CHAIN_TASK_ID, CHAIN_APP_TASK_ID, FAIL_TASK_ID, LONG_TASK_ID, OK_TASK_ID];

export const NOOP_SCRIPT_BODY = 'node -e 0';

export const CHAIN_SCRIPT_BODY = `npm run ${CHAIN_APP_SCRIPT}`;

export const CHAIN_APP_SCRIPT_BODY = 'vitest';

/** What the tree tooltip and the Details card show for `CHAIN_SCRIPT`: the tool it reaches through `CHAIN_APP_SCRIPT`. */
export const CHAIN_TOOL_TITLE = `Vitest (via ${CHAIN_APP_SCRIPT})`;

/** The tool-icon codicon id the tree row of `CHAIN_SCRIPT` shows. */
export const CHAIN_TOOL_ICON_ID = `${TOOL_ICON_PREFIX}vitest`;

export const FAIL_SCRIPT_BODY = 'node -e "process.exit(3)"';

export const FAIL_EXIT_CODE = 3;

/** Where `LONG_SCRIPT_BODY` writes its pid, relative to its package: under `.turbo/`, which the fixture's `.gitignore` holds. */
export const LONG_PID_PATH = ['.turbo', 'l10-long.pid'];

/** A script that runs until stopped and says it has started by writing its pid (L9's `DEV_SCRIPT` pattern). */
export const LONG_SCRIPT_BODY =
  "node -e \"const f=require('fs');f.mkdirSync('.turbo',{recursive:true});f.writeFileSync('.turbo/l10-long.pid',String(process.pid));setInterval(()=>{},1000)\"";

/** Where `NUMBER_SCRIPT_BODY` writes its sentinel, relative to its package: under `.turbo/`, which the fixture's `.gitignore` holds. */
export const NUMBER_SENTINEL_PATH = ['.turbo', 'l10-1kb.txt'];

/** What `NUMBER_SCRIPT_BODY` writes, so the file says the `1kb` script ran and no script of another name. */
export const NUMBER_SENTINEL = 'ran 1kb';

export const NUMBER_SCRIPT_BODY = `node -e "const f=require('fs');f.mkdirSync('.turbo',{recursive:true});f.writeFileSync('.turbo/l10-1kb.txt','${NUMBER_SENTINEL}')"`;

/** What Copy Command puts on the clipboard for `NUMBER_SCRIPT` in every shell: the name stays bare. */
export const NUMBER_COPY_TEXT = `pnpm run ${NUMBER_SCRIPT}`;

/** The command a script row's Run starts, as the Package Details card shows it. */
export const OK_RUN_COMMAND = `pnpm run ${OK_SCRIPT}`;

/** The command the CodeLens runs. */
export const LENS_COMMAND_ID = 'turboConsole.runPackageTask';
