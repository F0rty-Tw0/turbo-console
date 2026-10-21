import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBridge } from './create-bridge.ts';
import type { PostMessage, VsCodeApi } from '../common/bridge.type.ts';
import { postMessageMock, vsCodeApiMock } from '../test/mocks/post-message.mock.ts';

type AddListener = (type: string, handler: (event: MessageEvent) => void) => void;

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

    it('WHEN post is called THEN it does nothing', () => {
      const bridge = createBridge();

      expect((): void => bridge.post({ type: 'showOutput' })).not.toThrow();
    });

    it('WHEN state is saved THEN savedState stays undefined', () => {
      const bridge = createBridge();

      bridge.saveState({ scrollY: 120 });

      expect(bridge.savedState()).toBeUndefined();
    });
  });

  describe('GIVEN a VS Code host', () => {
    const stubHost = (initialState?: unknown): Mock<PostMessage> => {
      const postMessage = postMessageMock();
      const api: VsCodeApi = vsCodeApiMock(postMessage, initialState);

      vi.stubGlobal('acquireVsCodeApi', (): VsCodeApi => api);

      return postMessage;
    };

    it('WHEN ready is called THEN the host receives the ready message', () => {
      const postMessage = stubHost();

      createBridge().ready();

      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
    });

    it('WHEN post is called THEN the host receives that message', () => {
      const postMessage = stubHost();

      createBridge().post({ type: 'refresh', scope: 'root' });

      expect(postMessage).toHaveBeenCalledWith({ type: 'refresh', scope: 'root' });
    });

    it('WHEN state is saved THEN savedState reads back what was given, whatever its shape', () => {
      stubHost();
      const bridge = createBridge();

      bridge.saveState({ zoom: 2 });

      expect(bridge.savedState()).toStrictEqual({ zoom: 2 });
    });

    it('WHEN no state was saved THEN savedState is undefined', () => {
      stubHost();

      expect(createBridge().savedState()).toBeUndefined();
    });

    it('WHEN a graph message is posted THEN the host receives it', () => {
      const postMessage = stubHost();

      createBridge().post({ type: 'openDetails', packageName: 'web' });

      expect(postMessage).toHaveBeenCalledWith({ type: 'openDetails', packageName: 'web' });
    });

    it('WHEN a message event arrives THEN the listener gets its data', () => {
      stubHost();
      const addEventListener = vi.fn<AddListener>();
      const listener = vi.fn();

      vi.stubGlobal('addEventListener', addEventListener);
      createBridge().onMessage(listener);
      const call = addEventListener.mock.calls[0];
      const data = { type: 'runState' };

      call?.[1](new MessageEvent('message', { data }));

      expect(call?.[0]).toBe('message');
      expect(listener).toHaveBeenCalledWith({ type: 'runState' });
    });
  });
});
