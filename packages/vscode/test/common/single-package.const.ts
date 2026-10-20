/** The `name` of the single-package fixture's root manifest, and so the label its tree row shows. */
export const SINGLE_APP_NAME = 'single-app';

/** The package key core gives a single-package repo's root. */
export const ROOT_PACKAGE = '//';

export const ROOT_BUILD_ID = '//#build';

/** The one persistent task of the fixture. */
export const PERSISTENT_ROOT_ID = '//#dev';

/** Every task of the fixture, sorted: `format` has no `turbo.json` key, so its place here shows a script is a turbo task. */
export const SINGLE_TASK_IDS: string[] = ['//#build', '//#dev', '//#format', '//#lint', '//#test:unit'];
