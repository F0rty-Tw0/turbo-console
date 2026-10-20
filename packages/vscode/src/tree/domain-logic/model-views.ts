import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { PackageScripts, ToolMatch, ToolResolver } from '../../tool/common/tool.type.ts';
import { packageScriptsOf } from '../../tool/utils/package-scripts.util.ts';
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

/**
 * What one package object has answered: its scripts, built on the first read, how many reads they have had, and the tool
 * of each command whose resolve read them.
 */
type PackageTools = {
  readonly scripts: PackageScripts;
  readonly reads: () => number;
  readonly byCommand: Map<string, ToolMatch | null>;
};

const toolsOf = (pkg: PackageNode, singlePackage: boolean): PackageTools => {
  let built: PackageScripts | null = null;
  let count = 0;
  const read = (): PackageScripts => {
    count += 1;
    built ??= packageScriptsOf(pkg, singlePackage);

    return built;
  };
  const scripts: PackageScripts = {
    get bodies(): ReadonlyMap<string, string> {
      return read().bodies;
    },
    get followTurbo(): boolean {
      return read().followTurbo;
    }
  };
  const reads = (): number => count;
  const tools: PackageTools = { scripts, reads, byCommand: new Map() };

  return tools;
};

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
 * asks for its command's tool on each redraw, so `resolve` runs once per package object and distinct command: a command
 * such as `npm run t` means what its own package's script `t` says (runner-chains spec). A resolve that read no scripts
 * gives every package the same tool, so its command is resolved once and served to all of them.
 */
export class ModelViews {
  private readonly slots = new WeakMap<WorkspaceModel, ModelSlot>();
  private readonly qualifying = new WeakMap<WorkspaceModel, ReadonlySet<string>>();
  private readonly packageTools = new WeakMap<PackageNode, PackageTools>();
  private readonly sharedTools = new Map<string, ToolMatch | null>();
  private readonly resolve: ToolResolver;

  public constructor(resolve: ToolResolver) {
    this.resolve = resolve;
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

  public toolOf(pkg: PackageNode, singlePackage: boolean, command: string | null): ToolMatch | null {
    if (command === null) return null;

    const shared = this.sharedTools.get(command);

    if (shared !== undefined) return shared;

    const tools = this.toolsOf(pkg, singlePackage);
    const cached = tools.byCommand.get(command);

    if (cached !== undefined) return cached;

    const readsBefore = tools.reads();
    const match = this.resolve(command, tools.scripts);
    const isScriptsFree = tools.reads() === readsBefore;
    const memo = isScriptsFree ? this.sharedTools : tools.byCommand;

    memo.set(command, match);

    return match;
  }

  /** Built on the first ask for a package object; a reload builds new objects, so edited scripts are read again. */
  private toolsOf(pkg: PackageNode, singlePackage: boolean): PackageTools {
    const cached = this.packageTools.get(pkg);

    if (cached !== undefined) return cached;

    const tools = toolsOf(pkg, singlePackage);

    this.packageTools.set(pkg, tools);

    return tools;
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
