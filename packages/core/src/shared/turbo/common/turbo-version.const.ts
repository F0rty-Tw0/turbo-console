import type { TurboVersionRange } from './turbo.type.ts';

/** turbo releases whose CLI output matches the schemas in this folder. */
export const SUPPORTED_TURBO_RANGE: TurboVersionRange = { min: '2.11.7', maxExclusive: '2.12.0' };

/**
 * sha256 of `turbo query --schema` stdout with line endings normalised to LF, captured on turbo 2.11.13. The stdout is
 * introspection JSON that embeds the turbo version, so this changes on every turbo bump: re-capture it then.
 */
export const SCHEMA_SDL_SHA256 = '96d99d5776c0c1b49ac06b2ca5b200a1862fc4cabe0347f0e635cafb0e76cd57';
