import type { TurboVersionRange } from '../../common/turbo.type.ts';

/**
 * The supported turbo releases that opt out a task an `extends: false` entry reaches through turbo's exclusion walk:
 * `turbo query` reports no command for its script and `run --dry=json` reports `<OPT OUT>`. Added in 2.11.11 by
 * https://github.com/vercel/turborepo/pull/14860.
 */
export const OPT_OUT_TURBO_RANGE: TurboVersionRange = { min: '2.11.11', maxExclusive: '2.12.0' };
