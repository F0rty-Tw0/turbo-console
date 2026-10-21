import { ELK_POLICY_NAME } from '../common/graph.const.ts';
import type { ScriptUrlPolicy } from '../common/script-url-policy.type.ts';

/**
 * Creates the page's one Trusted Types policy, `tc-elk`, at once. It defines only `createScriptURL`, which passes
 * exactly the URL `urlFor` is handing out at that moment and throws for anything else, so no other code can mint a
 * trusted script URL through it.
 */
export const createScriptUrlPolicy = (factory: TrustedTypePolicyFactory): ScriptUrlPolicy => {
  let minting: string | null = null;
  const createScriptURL = (input: string): string => {
    if (input !== minting) throw new Error(`${ELK_POLICY_NAME} refused a script URL it did not mint`);

    return input;
  };
  const policy = factory.createPolicy(ELK_POLICY_NAME, { createScriptURL });
  const urlFor = (blobUrl: string): string => {
    minting = blobUrl;

    try {
      return policy.createScriptURL(blobUrl);
    } finally {
      minting = null;
    }
  };
  const scriptUrlPolicy: ScriptUrlPolicy = { urlFor };

  return scriptUrlPolicy;
};
