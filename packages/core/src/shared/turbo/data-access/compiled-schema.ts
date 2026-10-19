import { compile } from 'zod/mini';
import type { ZodMiniType } from 'zod/mini';

/**
 * A getter for `schema` compiled by zod's `compile`, built on the first call and reused after, so loading the module
 * generates no code. The clone parses valid input on a generated fast path and hands invalid input to the runtime
 * parser, so its output matches the runtime's and its issues are the runtime's own. `compile` never throws: a root it
 * cannot model, or a host that refuses generated code, gets the runtime schema back, and a child it cannot model runs
 * as a runtime island inside the clone; both are slower but correct. The spec pins that every hot schema compiles whole.
 */
export const lazyCompiled = <T>(schema: ZodMiniType<T>): (() => ZodMiniType<T>) => {
  let compiled: ZodMiniType<T> | null = null;

  return (): ZodMiniType<T> => {
    compiled ??= compile(schema);

    return compiled;
  };
};
