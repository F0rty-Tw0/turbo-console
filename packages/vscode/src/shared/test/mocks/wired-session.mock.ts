import { vi } from 'vitest';

import type { WiredSession } from '../../common/panel-view.type.ts';

/** A session of spies; `receive` resolves. */
export const wiredSessionMock = (): WiredSession => {
  const receive = vi.fn<WiredSession['receive']>().mockResolvedValue(undefined);
  const session: WiredSession = {
    receive,
    setVisible: vi.fn<WiredSession['setVisible']>(),
    start: vi.fn<WiredSession['start']>()
  };

  return session;
};
