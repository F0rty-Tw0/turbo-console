import { vi } from 'vitest';

import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { PackageSideDepsMock } from '../common/graph-package-side.type.ts';

type PostedMessage = WebviewMessage | GraphWebviewMessage;

/** The messages the page posted to the host so far, in order, of one `type`. */
export const postedOf = (rig: PackageSideDepsMock, type: PostedMessage['type']): PostedMessage[] => {
  const posted = vi.mocked(rig.deps.bridge.post).mock.calls.map(([message]) => message);

  return posted.filter((message) => message.type === type);
};
