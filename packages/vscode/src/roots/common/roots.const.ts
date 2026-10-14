export const ROOT_MARKERS = ['turbo.json', 'turbo.jsonc'];

export const LOAD_DEADLINE_MS = 60_000;

/** Extra time past the deadline before a load that ignores its deadline is abandoned (core does not bound every step). */
export const LOAD_GRACE_MS = 5_000;
