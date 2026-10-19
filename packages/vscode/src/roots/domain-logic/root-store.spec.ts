import { TurboException } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { RootStore } from './root-store.ts';
import type { Coordinator, RootChange, RootEntry } from '../common/coordinator.type.ts';
import type { LoadFailure, LoadedModel, RootFolder } from '../common/root.type.ts';
import { coordinatorMock } from '../test/mocks/coordinator.mock.ts';
import { LOADED_MODEL_STUB, LOAD_FAILURE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';

const WS: RootFolder = { root: '/ws', name: 'ws' };
const OTHER: RootFolder = { root: '/other', name: 'other' };
const RENAMED: RootFolder = { root: '/ws', name: 'renamed' };

const storeWith = (folders: RootFolder[]): RootStore => {
  const store = new RootStore();

  store.set(folders, coordinatorMock);

  return store;
};

const entryOf = (store: RootStore, root: string): RootEntry => {
  const entry = store.get(root);

  if (entry === undefined) throw new Error(`no entry for ${root}`);

  return entry;
};

const changesOf = (store: RootStore): RootChange[] => {
  const changes: RootChange[] = [];

  store.onDidChange((change) => changes.push(change));

  return changes;
};

describe('FEATURE: root store', () => {
  describe('GIVEN two folders are set', () => {
    it('WHEN read THEN each root has an empty state in folder order', () => {
      const store = storeWith([WS, OTHER]);

      const states = store.all().map((entry) => entry.state);

      expect(states).toStrictEqual([
        { folder: WS, binary: null, model: null, error: null },
        { folder: OTHER, binary: null, model: null, error: null }
      ]);
    });

    it('WHEN one folder is removed THEN its coordinator is disposed and its entry is gone', () => {
      const store = storeWith([WS, OTHER]);
      const removed = store.get(OTHER.root)?.coordinator;

      store.set([WS], coordinatorMock);

      expect(removed?.dispose).toHaveBeenCalledOnce();
      expect(store.get(OTHER.root)).toBeUndefined();
    });

    it('WHEN set again with the same folders THEN the entries and coordinators are kept', () => {
      const store = storeWith([WS]);
      const before = entryOf(store, WS.root);
      const make = vi.fn(coordinatorMock);

      store.set([WS], make);

      const after = entryOf(store, WS.root);

      expect(after).toStrictEqual(before);
      expect(after.coordinator).toBe(before.coordinator);
      expect(make).not.toHaveBeenCalled();
      expect(before.coordinator.dispose).not.toHaveBeenCalled();
    });

    it('WHEN set again with a folder renamed at the same path THEN the new name shows and the coordinator is kept', () => {
      const store = storeWith([WS, OTHER]);
      const before = entryOf(store, WS.root);

      store.set([RENAMED, OTHER], coordinatorMock);

      const after = entryOf(store, WS.root);

      expect(after.state.folder.name).toBe('renamed');
      expect(after.coordinator).toBe(before.coordinator);
    });

    it('WHEN a folder is added THEN its coordinator is made from that folder', () => {
      const store = storeWith([WS]);
      const make = vi.fn(coordinatorMock);

      store.set([WS, OTHER], make);

      expect(make).toHaveBeenCalledExactlyOnceWith(OTHER);
      expect(store.all().map((entry) => entry.state.folder)).toStrictEqual([WS, OTHER]);
    });
  });

  describe('GIVEN a root listed twice', () => {
    let store: RootStore;
    let make: Mock<(folder: RootFolder) => Coordinator>;

    beforeEach(() => {
      store = new RootStore();
      make = vi.fn<(folder: RootFolder) => Coordinator>(coordinatorMock);
      store.set([WS, RENAMED], make);
    });

    it('WHEN set THEN one coordinator is made, from its first folder', () => {
      expect(make).toHaveBeenCalledExactlyOnceWith(WS);
      expect(store.all().map((entry) => entry.state.folder)).toStrictEqual([WS]);
    });

    it('WHEN the root is removed THEN that one coordinator is disposed', () => {
      const coordinator = store.get(WS.root)?.coordinator;

      store.set([], make);

      expect(coordinator?.dispose).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a root with no state yet', () => {
    it('WHEN a model is applied THEN the state holds its model and binary and the change has before and after', () => {
      const store = storeWith([WS]);
      const changes = changesOf(store);

      store.apply(WS.root, LOADED_MODEL_STUB);

      const expected: RootChange = {
        root: WS.root,
        before: null,
        after: WORKSPACE_MODEL_STUB,
        errorBefore: null,
        errorAfter: null
      };

      expect(store.get(WS.root)?.state).toStrictEqual({
        folder: WS,
        binary: LOADED_MODEL_STUB.binary,
        model: WORKSPACE_MODEL_STUB,
        error: null
      });
      expect(changes).toStrictEqual([expected]);
    });

    it('WHEN a model is applied THEN a listener reading the store during the change sees the new model', () => {
      const store = storeWith([WS]);
      const seen: (WorkspaceModel | null | undefined)[] = [];
      const readModel = (): void => {
        seen.push(store.get(WS.root)?.state.model);
      };

      store.onDidChange(readModel);
      store.apply(WS.root, LOADED_MODEL_STUB);

      expect(seen).toStrictEqual([WORKSPACE_MODEL_STUB]);
    });

    it('WHEN an unknown root is applied THEN nothing changes and no change fires', () => {
      const store = storeWith([WS]);
      const changes = changesOf(store);

      store.apply('/gone', LOADED_MODEL_STUB);

      expect(changes).toStrictEqual([]);
      expect(store.get(WS.root)?.state.model).toBeNull();
    });
  });

  describe('GIVEN a root showing a model', () => {
    it('WHEN a binary failure is applied THEN the model stays, the error is set and the change carries the error keys', () => {
      const store = storeWith([WS]);

      store.apply(WS.root, LOADED_MODEL_STUB);

      const changes = changesOf(store);

      store.apply(WS.root, LOAD_FAILURE_STUB);

      expect(store.get(WS.root)?.state.model).toBe(WORKSPACE_MODEL_STUB);
      expect(store.get(WS.root)?.state.error).toBe(LOAD_FAILURE_STUB);
      expect(changes).toStrictEqual([
        { root: WS.root, before: WORKSPACE_MODEL_STUB, after: WORKSPACE_MODEL_STUB, errorBefore: null, errorAfter: 'binary:not-found' }
      ]);
    });

    it('WHEN a new model is applied THEN the change has the old model before and the new one after', () => {
      const store = storeWith([WS]);
      const next: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, turboVersion: '2.11.8' };
      const loaded: LoadedModel = { ...LOADED_MODEL_STUB, model: next };

      store.apply(WS.root, LOADED_MODEL_STUB);

      const changes = changesOf(store);

      store.apply(WS.root, loaded);

      expect(changes.map((change) => [change.before, change.after])).toStrictEqual([[WORKSPACE_MODEL_STUB, next]]);
    });

    it('WHEN a failure is applied THEN the binary of the shown model is kept', () => {
      const store = storeWith([WS]);

      store.apply(WS.root, LOADED_MODEL_STUB);
      store.apply(WS.root, LOAD_FAILURE_STUB);

      expect(store.get(WS.root)?.state.binary).toBe(LOADED_MODEL_STUB.binary);
    });
  });

  describe('GIVEN a root showing a cached model published before its binary resolved', () => {
    it('WHEN a binary failure is applied THEN the model is cleared, since none of its tasks can run', () => {
      const store = storeWith([WS]);

      store.apply(WS.root, { ...LOADED_MODEL_STUB, binary: null });
      store.apply(WS.root, LOAD_FAILURE_STUB);

      expect(store.get(WS.root)?.state).toStrictEqual({ folder: WS, binary: null, model: null, error: LOAD_FAILURE_STUB });
    });

    it('WHEN a load failure is applied THEN the model is cleared too, since it never got a binary', () => {
      const store = storeWith([WS]);
      const failure: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load' };

      store.apply(WS.root, { ...LOADED_MODEL_STUB, binary: null });
      store.apply(WS.root, failure);

      expect(store.get(WS.root)?.state).toStrictEqual({ folder: WS, binary: null, model: null, error: failure });
    });
  });

  describe('GIVEN a root in a load error', () => {
    it('WHEN a model is applied THEN the error is cleared and the change reads errorAfter null', () => {
      const store = storeWith([WS]);
      const error = new TurboException('failed', 'turbo exited 1');
      const failure: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load', error };

      store.apply(WS.root, failure);

      const changes = changesOf(store);

      store.apply(WS.root, LOADED_MODEL_STUB);

      expect(store.get(WS.root)?.state.error).toBeNull();
      expect(changes.map((change) => [change.errorBefore, change.errorAfter])).toStrictEqual([['load:failed', null]]);
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN a result is applied THEN that listener is not called', () => {
      const store = storeWith([WS]);
      const listener = vi.fn();
      const unsubscribe = store.onDidChange(listener);

      unsubscribe();
      store.apply(WS.root, LOADED_MODEL_STUB);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
