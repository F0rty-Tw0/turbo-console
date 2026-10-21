/** Runs in the page: the error name each Trusted Types escape throws, or `'none'` when it went through. */
export const trustedTypesEscapes = (): string[] => {
  const passThrough = (input: string): string => input;
  const policyOptions = { createScriptURL: passThrough };
  const errorNameOf = (attempt: () => unknown): string => {
    try {
      attempt();

      return 'none';
    } catch (error: unknown) {
      return error instanceof Error ? error.name : 'unknown';
    }
  };
  const secondElkPolicy = (): unknown => trustedTypes.createPolicy('tc-elk', policyOptions);
  const defaultPolicy = (): unknown => trustedTypes.createPolicy('default', policyOptions);
  const rawBlobWorker = (): unknown => {
    const source = new Blob([''], { type: 'text/javascript' });

    return new Worker(URL.createObjectURL(source));
  };

  return [errorNameOf(secondElkPolicy), errorNameOf(defaultPolicy), errorNameOf(rawBlobWorker)];
};

/** Runs in the page: the `x` and `y` own keys a draw may have written onto `Object` or its members, by name. */
export const pollutedBuiltins = (): string[] => {
  const builtins: [string, object][] = [
    ['Object', Object],
    ['Object.prototype', Object.prototype],
    ['Object.prototype.toString', Object.prototype.toString],
    ['Object.prototype.hasOwnProperty', Object.prototype.hasOwnProperty]
  ];
  const isPolluted = ([, value]: [string, object]): boolean => Object.hasOwn(value, 'x') || Object.hasOwn(value, 'y');

  return builtins.filter(isPolluted).map(([name]): string => name);
};
