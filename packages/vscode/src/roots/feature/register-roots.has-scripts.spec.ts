import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable } from 'vscode';

import { registerRoots } from './register-roots.ts';
import { loadedWith, scriptPackageNamed } from '../../tree/test/utils/tree-model.spec.util.ts';
import type { Session } from '../common/coordinator.type.ts';
import type { RootFolder } from '../common/root.type.ts';
import { RootStore } from '../domain-logic/root-store.ts';
import { coordinatorMock } from '../test/mocks/coordinator.mock.ts';

type SetContextCall = [command: string, key: string, value: boolean];

/** The calls `executeCommand` got and the listeners `onDidChangeWorkspaceFolders` kept, shared with the hoisted mock. */
const editor = vi.hoisted(() => {
  const calls: SetContextCall[] = [];
  const listeners: (() => void)[] = [];
  const state = { calls, listeners };

  return state;
});

vi.mock('vscode', () => {
  const executeCommand = async (command: string, key: string, value: boolean): Promise<void> => {
    editor.calls.push([command, key, value]);

    return Promise.resolve();
  };
  const onDidChangeWorkspaceFolders = (listener: () => void): Disposable => {
    editor.listeners.push(listener);

    const subscription: Disposable = { dispose: vi.fn() };

    return subscription;
  };
  const commands = { executeCommand };
  const workspace = { workspaceFolders: [], onDidChangeWorkspaceFolders };
  const module = { commands, workspace };

  return module;
});

const WS: RootFolder = { root: '/ws', name: 'ws' };

const keySent = (): boolean[] => {
  const calls = editor.calls.filter(([command, key]) => command === 'setContext' && key === 'turboConsole.hasScripts');

  return calls.map(([, , value]) => value);
};

describe('FEATURE: registerRoots has-scripts key', () => {
  let store: RootStore;
  let current: RootFolder[];
  let session: Session;

  beforeEach(() => {
    editor.calls.length = 0;
    editor.listeners.length = 0;
    store = new RootStore();
    current = [WS];
    const setWorkspaceFolders = vi.fn(async (): Promise<RootFolder[]> => {
      store.set(current, coordinatorMock);

      return Promise.resolve(current);
    });

    session = { store, setWorkspaceFolders, setVisible: vi.fn(), setPanelVisible: vi.fn(), request: vi.fn(), changed: vi.fn() };
  });

  it('WHEN registered THEN the key is sent false first', async () => {
    await registerRoots({ subscriptions: [] }, session, vi.fn(), vi.fn());

    expect(keySent()).toStrictEqual([false]);
  });

  it('WHEN the root then loads a model with a script THEN true follows', async () => {
    await registerRoots({ subscriptions: [] }, session, vi.fn(), vi.fn());

    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));

    expect(keySent()).toStrictEqual([false, true]);
  });

  it('WHEN the workspace folder with the scripts is removed THEN false follows', async () => {
    await registerRoots({ subscriptions: [] }, session, vi.fn(), vi.fn());
    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));

    current = [];
    editor.listeners[0]?.();

    await vi.waitFor(() => {
      expect(keySent()).toStrictEqual([false, true, false]);
    });
  });

  it('WHEN registered THEN the tracker is disposable through context.subscriptions', async () => {
    const subscriptions: Disposable[] = [];

    await registerRoots({ subscriptions }, session, vi.fn(), vi.fn());

    expect(subscriptions).toHaveLength(2);
  });
});
