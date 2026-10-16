import type { HostMessage, MissingPackage } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { safePost } from './safe-post.util.ts';

const MISSING: MissingPackage = { kind: 'missing', root: '/ws', packageName: 'a' };
const MESSAGE: HostMessage = { type: 'state', state: MISSING };

describe('FEATURE: a post that never throws', () => {
  it('GIVEN a send that resolves WHEN it posts THEN the message is sent and nothing is logged', async () => {
    const send = vi.fn(async () => Promise.resolve(true));
    const log = vi.fn();

    safePost(send, log)(MESSAGE);
    await Promise.resolve();

    expect(send).toHaveBeenCalledExactlyOnceWith(MESSAGE);
    expect(log).not.toHaveBeenCalled();
  });

  it('GIVEN a send that throws WHEN it posts THEN it does not throw and logs the error', () => {
    const send = vi.fn(() => {
      throw new Error('webview is disposed');
    });
    const log = vi.fn();
    const post = safePost(send, log);

    expect(() => {
      post(MESSAGE);
    }).not.toThrow();
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toContain('webview is disposed');
  });

  it('GIVEN a send that rejects after dispose WHEN it posts THEN the rejection is logged, not left unhandled', async () => {
    const send = vi.fn(async () => Promise.reject(new Error('webview is disposed')));
    const log = vi.fn();

    safePost(send, log)(MESSAGE);
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledOnce();
    });

    expect(log.mock.calls[0]?.[0]).toContain('webview is disposed');
  });
});
