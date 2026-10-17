import type { WorkspaceModel } from '@turbo-console/core';

import type { ToolLookup, ToolSpec } from '../../tool/common/tool.type.ts';
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
 * keeps its shown view, its hidden view and the latest hidden view with live scripts (spec 1c-b §4.7). Every task row
 * asks for its command's tool on each redraw, so `lookup` runs once per distinct command (spec 1c-c §4.2).
 */
export class ModelViews {
  private readonly slots = new WeakMap<WorkspaceModel, ModelSlot>();
  private readonly qualifying = new WeakMap<WorkspaceModel, ReadonlySet<string>>();
  private readonly tools = new Map<string, ToolSpec | null>();
  private readonly lookup: ToolLookup;

  public constructor(lookup: ToolLookup) {
    this.lookup = lookup;
  }

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

  public toolOf(command: string | null): ToolSpec | null {
    if (command === null) return null;

    const cached = this.tools.get(command);

    if (cached !== undefined) return cached;

    const tool = this.lookup(command);

    this.tools.set(command, tool);

    return tool;
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
