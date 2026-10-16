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

/**
 * Where `DEV_SCRIPT` writes its pid, relative to its package: under `.turbo/`, which the fixture's `.gitignore` holds, so
 * the file is no input of `build` and case 5's second run stays a cache hit.
 */
export const DEV_PID_PATH = ['.turbo', 'l9-dev.pid'];

/** A script that runs until stopped and says it has started by writing its pid; the root `turbo.json` entry below makes it a continuous task. */
export const DEV_SCRIPT =
  "node -e \"const f=require('fs');f.mkdirSync('.turbo',{recursive:true});f.writeFileSync('.turbo/l9-dev.pid',String(process.pid));setInterval(()=>{},1000)\"";

export const DEV_CONFIG: Readonly<Record<string, unknown>> = { persistent: true, cache: false };

export const CTRL_C = '\u0003';

/** The platforms where `sendText('\u0003')` is proven to deliver SIGINT (L9 on CI and Linux); there a run that outlives Ctrl+C fails the case. */
export const CTRL_C_PROVEN_PLATFORMS: ReadonlySet<NodeJS.Platform> = new Set<NodeJS.Platform>(['linux']);

/** How long a run may outlive Ctrl+C before `sendText` counts as not delivering SIGINT on this OS (spec 1c-a §5.1 V1). */
export const CTRL_C_WAIT_MS = 5000;
