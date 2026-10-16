/** L9's package: the first `target-like` package, edited to hold a continuous `dev` and a script no turbo.json names. */
export const POLISH_PACKAGE = '@fx/pkg-001';

export const DEV_TASK_ID = `${POLISH_PACKAGE}#dev`;

export const ADHOC_TASK_ID = `${POLISH_PACKAGE}#zz-adhoc`;

export const BUILD_TASK_ID = `${POLISH_PACKAGE}#build`;

/** A package with no script, so it shows no row. */
export const EMPTY_PACKAGE = '@fx/zz-empty';

/** A second scope with the bare name of `POLISH_PACKAGE`: both keep their scopes while scopes are hidden. */
export const DUP_PACKAGE = '@fy/pkg-001';

/** The tree tooltip's kind line of a script; spec 1c-a §4.9 (the tree's copy of the Details card's text is compared against this literal). */
export const NOT_TURBO_LINE = 'Not a turbo task: no turbo.json defines it';

/** A script that runs until stopped, and the root `turbo.json` entry that makes it a continuous task. */
export const DEV_SCRIPT = 'node -e "setInterval(() => {}, 1000)"';

export const DEV_CONFIG: Readonly<Record<string, unknown>> = { persistent: true, cache: false };

export const CTRL_C = '\u0003';

/** How long a run may outlive Ctrl+C before `sendText` counts as not delivering SIGINT on this OS (spec 1c-a §5.1 V1). */
export const CTRL_C_WAIT_MS = 5000;
