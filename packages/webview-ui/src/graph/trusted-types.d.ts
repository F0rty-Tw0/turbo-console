/**
 * The DOM lib here has no Trusted Types. `createScriptURL` is typed as returning `string` so `new Worker(url)` accepts it;
 * in the browser it returns a `TrustedScriptURL`, which `Worker` takes under `require-trusted-types-for`.
 * The options name only `createScriptURL`, so the page cannot define an HTML or script sink policy.
 */
type TrustedTypePolicy = {
  readonly name: string;
  readonly createScriptURL: (input: string) => string;
};

type TrustedTypePolicyOptions = {
  readonly createScriptURL: (input: string) => string;
};

type TrustedTypePolicyFactory = {
  readonly createPolicy: (name: string, options: TrustedTypePolicyOptions) => TrustedTypePolicy;
};

declare const trustedTypes: TrustedTypePolicyFactory;
