/** The `name` of the single-package fixture's root manifest, and so the label its tree row shows. */
export const SINGLE_APP_NAME = 'single-app';

/** The package key core gives a single-package repo's root. */
export const ROOT_PACKAGE = '//';

export const ROOT_BUILD_ID = '//#build';

/** The one persistent task of the fixture. */
export const PERSISTENT_ROOT_ID = '//#dev';

/** Every turbo task of the fixture, sorted: the scripts its `turbo.json` keys. */
export const SINGLE_TASK_IDS: string[] = ['//#build', '//#dev', '//#lint', '//#test:unit'];

/** The fixture's one script `turbo.json` does not key: a script, though a single-package turbo would run it. */
export const SINGLE_SCRIPT_IDS: string[] = ['//#format'];

/** `git init` on a loaded Windows runner takes well over Vitest's 5s default. Matches repo-gen. */
export const GIT_SPAWN_TIMEOUT_MS = 60_000;
