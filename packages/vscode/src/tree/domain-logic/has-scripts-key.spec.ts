import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { trackHasScripts } from './has-scripts-key.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { loadedWith, packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';

const WS: RootFolder = { root: '/ws', name: 'ws' };

describe('FEATURE: trackHasScripts', () => {
  let store: RootStore;
  let setKey: Mock<(value: boolean) => Promise<void>>;
  let log: Mock<(line: string) => void>;

  const sent = (): boolean[] => setKey.mock.calls.map(([value]) => value);

  beforeEach(() => {
    store = new RootStore();
    store.set([WS], coordinatorMock);
    setKey = vi.fn<(value: boolean) => Promise<void>>(async () => Promise.resolve());
    log = vi.fn();
  });

  it('WHEN started with no model THEN false is sent once', () => {
    trackHasScripts(store, setKey, log);

    expect(sent()).toStrictEqual([false]);
  });

  it('WHEN a model with a script loads THEN true follows', () => {
    trackHasScripts(store, setKey, log);

    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));

    expect(sent()).toStrictEqual([false, true]);
  });

  it('WHEN a model with only turbo tasks loads twice THEN nothing more is sent', () => {
    trackHasScripts(store, setKey, log);

    store.apply('/ws', loadedWith([packageNamed('a')]));
    store.apply('/ws', loadedWith([packageNamed('a'), packageNamed('b')]));

    expect(sent()).toStrictEqual([false]);
  });

  it('WHEN a reload drops the last script THEN false follows true', () => {
    trackHasScripts(store, setKey, log);

    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));
    store.apply('/ws', loadedWith([packageNamed('a')]));

    expect(sent()).toStrictEqual([false, true, false]);
  });

  it('WHEN the only root with scripts is removed and refresh is called THEN false follows true', () => {
    const tracker = trackHasScripts(store, setKey, log);

    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));
    store.set([], coordinatorMock);
    tracker.refresh();

    expect(sent()).toStrictEqual([false, true, false]);
  });

  it('WHEN disposed THEN later loads and refreshes send nothing', () => {
    const tracker = trackHasScripts(store, setKey, log);

    tracker.dispose();
    store.apply('/ws', loadedWith([scriptPackageNamed('s')]));
    tracker.refresh();

    expect(sent()).toStrictEqual([false]);
  });

  it('WHEN a send is rejected THEN it is logged and the next refresh sends again', async () => {
    setKey.mockRejectedValueOnce(new Error('boom'));
    const tracker = trackHasScripts(store, setKey, log);

    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledOnce();
    });
    tracker.refresh();

    expect(sent()).toStrictEqual([false, false]);
  });
});
