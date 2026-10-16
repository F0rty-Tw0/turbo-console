import type { Disposable, TreeViewVisibilityChangeEvent } from 'vscode';

import type { RunEntry, RunListener } from '../../../run/common/run.type.ts';
import type { RunChanges } from '../../common/ticker.type.ts';
import type { VisibleView } from '../../common/visible-view.type.ts';
import type { RunChangesFake, VisibleViewFake } from '../common/ticker-fakes.type.ts';

type VisibilityListener = (event: TreeViewVisibilityChangeEvent) => unknown;

/** A view that starts `initial`; its listeners stop hearing changes once their subscription is disposed. */
export const visibleViewFake = (initial: boolean): VisibleViewFake => {
  const listeners = new Set<VisibilityListener>();
  let current = initial;
  const onDidChangeVisibility = (listener: VisibilityListener): Disposable => {
    listeners.add(listener);

    const subscription: Disposable = {
      dispose: (): void => {
        listeners.delete(listener);
      }
    };

    return subscription;
  };
  const view: VisibleView = {
    get visible(): boolean {
      return current;
    },
    onDidChangeVisibility
  };
  const setVisible = (visible: boolean): void => {
    const event: TreeViewVisibilityChangeEvent = { visible };

    current = visible;

    for (const listener of listeners) listener(event);
  };
  const fake: VisibleViewFake = { view, setVisible };

  return fake;
};

/** A run store that hands every emitted entry to its current listeners, as `RunStore.onDidChange` does. */
export const runChangesFake = (): RunChangesFake => {
  const listeners = new Set<RunListener>();
  const onDidChange = (listener: RunListener): (() => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  };
  const emit = (entry: RunEntry): void => {
    for (const listener of listeners) listener(entry);
  };
  const runs: RunChanges = { onDidChange };
  const fake: RunChangesFake = { runs, emit };

  return fake;
};
