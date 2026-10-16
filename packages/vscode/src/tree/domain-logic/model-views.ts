import type { WorkspaceModel } from '@turbo-console/core';

import type { ModelView } from '../common/model-view.type.ts';
import { HIDDEN_KEY, SHOWN_KEY } from '../common/view-key.const.ts';
import { modelViewOf } from '../utils/model-view.util.ts';
import { qualifyingIdsOf, viewKeyOf } from '../utils/view-key.util.ts';

type LiveView = {
  readonly key: string;
  readonly view: ModelView;
};

/** The views of one model: both toggle states, and the latest hidden view with live scripts. */
type ModelSlot = {
  readonly shown?: ModelView;
  readonly hidden?: ModelView;
  readonly live?: LiveView;
};

const NO_VIEWS: ModelSlot = {};

const cachedOf = (slot: ModelSlot, key: string): ModelView | undefined => {
  if (key === SHOWN_KEY) return slot.shown;

  if (key === HIDDEN_KEY) return slot.hidden;

  return slot.live?.key === key ? slot.live.view : undefined;
};

const withView = (slot: ModelSlot, key: string, view: ModelView): ModelSlot => {
  if (key === SHOWN_KEY) {
    const withShown: ModelSlot = { ...slot, shown: view };

    return withShown;
  }

  if (key === HIDDEN_KEY) {
    const withHidden: ModelSlot = { ...slot, hidden: view };

    return withHidden;
  }

  const live: LiveView = { key, view };
  const withLive: ModelSlot = { ...slot, live };

  return withLive;
};

/**
 * Views per model object and view key: the editor asks for the children and the item of every node, and each answer needs
 * the shown packages and their folder tree, so they are built once instead of walking every package each time. A model
 * keeps its shown view, its hidden view and the latest hidden view with live scripts (spec 1c-b §4.7).
 */
export class ModelViews {
  private readonly slots = new WeakMap<WorkspaceModel, ModelSlot>();
  private readonly qualifying = new WeakMap<WorkspaceModel, ReadonlySet<string>>();

  public of(model: WorkspaceModel, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): ModelView {
    const slot = this.slots.get(model) ?? NO_VIEWS;
    const qualifying = (): ReadonlySet<string> => this.qualifyingOf(model);
    const key = viewKeyOf(qualifying, scriptsShown, liveOfRoot);
    const cached = cachedOf(slot, key);

    if (cached !== undefined) return cached;

    const view = modelViewOf(model, scriptsShown, liveOfRoot);

    this.slots.set(model, withView(slot, key, view));

    return view;
  }

  /** Built once per model object, so a key costs the live ids, not the packages. */
  private qualifyingOf(model: WorkspaceModel): ReadonlySet<string> {
    const cached = this.qualifying.get(model);

    if (cached !== undefined) return cached;

    const ids = qualifyingIdsOf(model);

    this.qualifying.set(model, ids);

    return ids;
  }
}
