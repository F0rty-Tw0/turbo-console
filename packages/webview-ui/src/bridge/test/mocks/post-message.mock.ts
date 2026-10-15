import type { Mock } from 'vitest';
import { vi } from 'vitest';

import type { PostMessage, VsCodeApi } from '../../common/bridge.type.ts';

export const postMessageMock = (): Mock<PostMessage> => vi.fn<PostMessage>();

/** A host API that keeps what `setState` stores, as the VS Code webview API does until the page is rebuilt. */
export const vsCodeApiMock = (postMessage: Mock<PostMessage>, initialState?: unknown): VsCodeApi => {
  let state = initialState;
  const getState = (): unknown => state;
  const setState = (next: unknown): void => {
    state = next;
  };
  const api: VsCodeApi = { postMessage, getState, setState };

  return api;
};
