/** Spec §4.3 watcher 1: the files a load's cache key hashes, relative to the root. */
export const KEYED_GLOB =
  '{**/package.json,**/turbo.json,**/turbo.jsonc,pnpm-workspace.yaml,.npmrc,pnpm-lock.yaml,package-lock.json,yarn.lock,bun.lock,bun.lockb}';

/** Spec §4.3: a root's watcher events within this window make one change request. */
export const DEBOUNCE_MS = 300;
