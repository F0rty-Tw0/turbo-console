export const RUN_OPTIONS_COMMAND = 'turboConsole.runTaskWithOptions';

/** The first `target-like` package, as L9 and L10 use it. */
export const OPTIONS_PACKAGE = '@fx/pkg-001';

export const OPTIONS_BUILD_ID = `${OPTIONS_PACKAGE}#build`;

/** The 0-based rows of the picker, spec §3 order. */
export const PICK_ROW = { force: 0, only: 1, continueMode: 2, concurrency: 3, args: 4 } as const;

/** A script no turbo.json names. */
export const ARGS_SCRIPT = 'zz-args';

export const ARGS_TASK_ID = `${OPTIONS_PACKAGE}#${ARGS_SCRIPT}`;

export const PRINT_ARGS_FILE = 'print-args.cjs';

/** Under `.turbo/`, which the fixture `.gitignore` holds: no task input. */
export const ARGV_PATH = ['.turbo', 'l19-argv.json'];

export const PRINT_ARGS_BODY =
  "const f=require('fs');f.mkdirSync('.turbo',{recursive:true});f.writeFileSync('.turbo/l19-argv.json',JSON.stringify(process.argv.slice(2)))";

/** A file, not `node -e`: node itself eats `--watch` after `-e`. */
export const PRINT_ARGS_SCRIPT = `node ${PRINT_ARGS_FILE}`;

export const OPTION_ARGS = ['--watch'];

export const SCRIPT_ARGS = ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'];
