import { compile } from 'zod/mini';
import type { ZodMiniType } from 'zod/mini';

/** A schema the compiled fast path cannot model throws at its first parse instead of silently running uncompiled. */
const STRICT = { strict: true };

/**
 * A getter for `schema` compiled by zod's `compile`, built on the first call and reused after, so loading the module
 * generates no code. The clone parses valid input on a generated fast path and hands invalid input to the runtime
 * parser, so outputs and issues are the runtime's own.
 */
export const lazyCompiled = <T>(schema: ZodMiniType<T>): (() => ZodMiniType<T>) => {
  let compiled: ZodMiniType<T> | null = null;

  return (): ZodMiniType<T> => {
    compiled ??= compile(schema, STRICT);

    return compiled;
  };
};
