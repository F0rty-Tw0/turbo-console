const noop = (): void => undefined;

/** Runs `action` after `hops` more promise hops, so a spec can land a call between two microtasks of the code under test. */
export const afterHops = (hops: number, action: () => void): void => {
  let chain: Promise<void> = Promise.resolve();

  for (let hop = 0; hop < hops; hop += 1) chain = chain.then(noop);

  void chain.then(action);
};
