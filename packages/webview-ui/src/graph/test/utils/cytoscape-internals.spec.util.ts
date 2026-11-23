import { vi } from 'vitest';
import type { Mock } from 'vitest';

type Method = (...args: unknown[]) => unknown;

/** The function `target` answers for `method`, own or inherited. */
const methodOf = (target: object, method: string): Method => {
  const original: unknown = Reflect.get(target, method);

  if (typeof original !== 'function') throw new Error(`spec: no ${method} on the target`);

  return (...args: unknown[]): unknown => Reflect.apply(original, target, args);
};

/** Replaces `method` on `target` with a mock that records each call, then calls through. */
export const spyOnOwn = (target: object, method: string): Mock<Method> => {
  const original = methodOf(target, method);
  const spy = vi.fn(original);

  Reflect.set(target, method, spy);

  return spy;
};

/** Records the first argument of each `method` call on `target`, so a failure prints names, not Cytoscape graphs. */
export const recordFirstArgs = (target: object, method: string): unknown[] => {
  const original = methodOf(target, method);
  const firstArgs: unknown[] = [];
  const recording = (...args: unknown[]): unknown => {
    firstArgs.push(args[0]);

    return original(...args);
  };

  Reflect.set(target, method, recording);

  return firstArgs;
};

/** Whether Cytoscape still owes `target` a style apply. */
export const isStyleDirty = (target: object): boolean => {
  const internals: unknown = Reflect.get(target, '_private');

  if (typeof internals !== 'object' || internals === null) throw new Error('spec: no internals on the element');

  return Reflect.get(internals, 'styleDirty') === true;
};
