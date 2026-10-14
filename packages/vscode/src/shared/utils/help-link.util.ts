import { HELP_URLS } from '../common/help-links.const.ts';

/** The fixed url of a help link id; `null` for any other text, so no argument can open an address of its own. */
export const helpUrlOf = (id: string): string | null => HELP_URLS.get(id) ?? null;
