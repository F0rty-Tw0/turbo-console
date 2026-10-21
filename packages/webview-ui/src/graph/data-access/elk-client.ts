import workerText from 'elkjs/lib/elk-worker.min.js';

import { createElkClient } from './elk-worker-client.ts';
import { createScriptUrlPolicy } from './script-url-policy.ts';
import type { ElkLike } from '../common/layout.type.ts';
import type { ScriptUrlPolicy } from '../common/script-url-policy.type.ts';

const pagePolicyOf = (): ScriptUrlPolicy | null => {
  try {
    return createScriptUrlPolicy(trustedTypes, location.origin);
  } catch {
    return null;
  }
};

/** Built when the page bundle loads: the graph CSP admits one `tc-elk` policy, so a second attempt would throw. */
const policy = pagePolicyOf();

/** A fresh ELK over a new blob worker; throws when the policy is missing (no Trusted Types, or the name was taken). */
export const createElk = (): ElkLike => {
  if (policy === null) throw new Error('Trusted Types policy tc-elk is unavailable');

  return createElkClient(workerText, policy);
};
