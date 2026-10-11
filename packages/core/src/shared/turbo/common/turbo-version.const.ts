import type { TurboVersionRange } from './turbo.type.ts';

/** turbo releases whose CLI output matches the schemas in this folder. */
export const SUPPORTED_TURBO_RANGE: TurboVersionRange = { min: '2.11.7', maxExclusive: '2.12.0' };

/**
 * sha256 of `turbo query --schema` stdout with line endings normalised to LF, captured on turbo 2.11.7. The stdout is
 * introspection JSON that embeds the turbo version, so this changes on every turbo bump: re-capture it then.
 */
export const SCHEMA_SDL_SHA256 = 'c88ad4194075a9600140d172e3c36b5a9941d92d0ca929c9095b80b6c4fd0282';
