import type { RunLogTail } from '../../common/run-log-tail.type.ts';
import type { FakeRunLogTail } from '../common/run-log-tail-fake.type.ts';

export const fakeRunLogTail = (): FakeRunLogTail => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  let drains = 0;
  let closes = 0;
  const drain = async (): Promise<void> => {
    drains += 1;

    await promise;
  };
  const close = (): void => {
    closes += 1;
  };
  const handle: RunLogTail = { drain, close };
  const finishDrain = (): void => {
    resolve(undefined);
  };
  const fake: FakeRunLogTail = {
    handle,
    get drains(): number {
      return drains;
    },
    get closes(): number {
      return closes;
    },
    finishDrain
  };

  return fake;
};
