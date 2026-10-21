import type { GraphWebviewMessage } from '@turbo-console/webview-ui';

import { graphMessageSchema } from '../common/graph-message.schema.ts';

/**
 * The webview is a trust boundary: a value that fails the schema is `null`; only the keys the schema names survive.
 * Never throws: `safeParse` rethrows a throwing getter or proxy trap, which is `null` too.
 */
export const parseGraphMessage = (raw: unknown): GraphWebviewMessage | null => {
  try {
    const parsed = graphMessageSchema.safeParse(raw);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
