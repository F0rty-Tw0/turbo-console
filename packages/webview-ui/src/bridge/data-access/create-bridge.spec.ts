import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBridge } from './create-bridge.ts';
import type { VsCodeApi } from '../common/bridge.type.ts';
import { postMessageMock } from '../test/mocks/post-message.mock.ts';

describe('FEATURE: create bridge', () => {
  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN no VS Code host', () => {
    beforeEach((): void => {
      vi.spyOn(console, 'warn').mockImplementation((): void => undefined);
    });

    it('WHEN ready is called THEN it does not throw', () => {
      const bridge = createBridge();

      expect((): void => bridge.ready()).not.toThrow();
    });

    it('WHEN ready is called THEN it logs that no host is present', () => {
      const bridge = createBridge();

      bridge.ready();

      expect(console.warn).toHaveBeenCalledWith('webview-ui: ready (no host)');
    });
  });

  describe('GIVEN a VS Code host', () => {
    it('WHEN ready is called THEN the host receives the ready message', () => {
      const postMessage = postMessageMock();
      const api: VsCodeApi = { postMessage };

      vi.stubGlobal('acquireVsCodeApi', (): VsCodeApi => api);

      createBridge().ready();

      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
    });
  });
});
