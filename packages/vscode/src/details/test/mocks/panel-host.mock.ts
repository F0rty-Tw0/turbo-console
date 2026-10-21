import type { DryRunState } from '@turbo-console/core';
import type { HostMessage } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { EditorPanelView } from '../../../shared/common/panel-view.type.ts';
import type { PanelHost } from '../../common/panel.type.ts';
import type { HostFakes, ViewFake } from '../common/panel-fakes.type.ts';

const FOLDER_ROOTS = ['/ws', '/other', '/bare'];

/** A shown view whose `send` resolves; `overrides` replace members of the view (a throwing listener, a failing send). */
export const viewMock = <TMessage = HostMessage>(
  visible = true,
  overrides: Partial<EditorPanelView<TMessage>> = {}
): ViewFake<TMessage> => {
  const state = { visible, isDisposed: false };
  const messageListeners: ((value: unknown) => void)[] = [];
  const stateListeners: (() => void)[] = [];
  const disposeListeners: (() => void)[] = [];
  const send = vi.fn<EditorPanelView<TMessage>['send']>(async () => Promise.resolve(true));
  const reveal = vi.fn<EditorPanelView<TMessage>['reveal']>();
  const setTitle = vi.fn<EditorPanelView<TMessage>['setTitle']>();
  const dispose = vi.fn<EditorPanelView<TMessage>['dispose']>(() => {
    if (state.isDisposed) return;

    state.isDisposed = true;

    for (const listener of disposeListeners) listener();
  });
  const view: EditorPanelView<TMessage> = {
    isVisible: () => state.visible,
    reveal,
    setTitle,
    send,
    onMessage: (listener) => {
      messageListeners.push(listener);
    },
    onViewState: (listener) => {
      stateListeners.push(listener);
    },
    onDispose: (listener) => {
      disposeListeners.push(listener);
    },
    dispose,
    ...overrides
  };
  const show = (next: boolean): void => {
    state.visible = next;

    for (const listener of stateListeners) listener();
  };
  const message = (value: unknown): void => {
    for (const listener of messageListeners) listener(value);
  };
  const fake: ViewFake<TMessage> = { view, send, reveal, setTitle, dispose, show, message, close: dispose };

  return fake;
};

/** Every host effect a spy; `dryRun` and `execute` resolve at once. */
export const hostMock = (): HostFakes => {
  const views: ViewFake[] = [];
  const queued: ViewFake[] = [];
  const open = vi.fn<PanelHost['open']>(() => {
    const fake = queued.shift() ?? viewMock();

    views.push(fake);

    return fake.view;
  });
  const dryRun = vi.fn<(...args: Parameters<PanelHost['dryRun']>) => Promise<DryRunState[]>>().mockResolvedValue([]);
  const execute = vi.fn<PanelHost['execute']>().mockResolvedValue(undefined);
  const info = vi.fn<PanelHost['info']>();
  const error = vi.fn<PanelHost['error']>();
  const log = vi.fn<PanelHost['log']>();
  const rootOf = (file: string): string | null => {
    const holding = FOLDER_ROOTS.find((root) => file.startsWith(`${root}/`));

    return holding ?? null;
  };
  const host: PanelHost = { open, rootOf, dryRun, execute, info, error, log };
  const queue = (fake: ViewFake): void => {
    queued.push(fake);
  };
  const fakes: HostFakes = { host, open, views, dryRun, execute, info, error, log, queue };

  return fakes;
};
