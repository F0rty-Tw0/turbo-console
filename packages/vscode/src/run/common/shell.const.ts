export { BARE, BARE_FIRST_BLOCKED } from '@turbo-console/core';

/**
 * A script name's blocked first characters: pnpm reads `/…/` as a regex selector when no script of that exact name has a
 * body, and refuses a `.` name as hidden (`ERR_PNPM_HIDDEN_SCRIPT`). This also refuses `//`, package.json's comment key.
 */
export const SCRIPT_NAME_FIRST_BLOCKED = /^[/.]/u;
