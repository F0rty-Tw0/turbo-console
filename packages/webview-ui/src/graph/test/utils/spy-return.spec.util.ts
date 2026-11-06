import type { Mock } from 'vitest';

/** What `spy` returned on its latest call; throws when it has not returned yet. */
export const lastReturnOf = <Result>(spy: Mock<(...args: never[]) => Result>): Result => {
  const last = spy.mock.results.at(-1);

  if (last?.type !== 'return') throw new Error('the spy has not returned yet');

  return last.value;
};
