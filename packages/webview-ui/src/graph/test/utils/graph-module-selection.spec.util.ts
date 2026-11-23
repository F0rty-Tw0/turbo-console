import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type {
  GraphModuleSitesMessage,
  GraphScanModuleSitesMessage,
  ModuleSitesResult
} from '../../../bridge/common/graph-module-sites.type.ts';
import type { ModulesViewState } from '../../../bridge/common/graph-view-state.type.ts';
import type { ModuleCanvas } from '../../common/module-canvas.type.ts';
import type { ModulePhase } from '../../common/module-mode.type.ts';
import type { ModuleDetailsSink, ModuleSelectionDeps, ModuleSelectionMode } from '../../common/module-selection.type.ts';
import type { ModuleSelectionRig } from '../common/graph-module-selection.type.ts';

/**
 * The selection's deps over `view` and `phase`, painting on `canvas`: `save` and `update` both write the saved view, which
 * `view()` then reads, so a case reads back what the selection saved.
 */
export const moduleSelectionRigOf = (
  view: ModulesViewState,
  phase: ModulePhase,
  canvas: Pick<ModuleCanvas, 'paint' | 'selected'>
): ModuleSelectionRig => {
  let saved: ModulesViewState | null = view;
  let current = phase;
  const write = (next: ModulesViewState): void => {
    saved = next;
  };
  const mode: Mocked<ModuleSelectionMode> = {
    phase: vi.fn((): ModulePhase => current),
    view: vi.fn((): ModulesViewState | null => saved),
    update: vi.fn(write),
    save: vi.fn(write)
  };
  const post = vi.fn<Bridge['post']>();
  const show = vi.fn<ModuleDetailsSink['show']>();
  const details: ModuleDetailsSink = { show };
  const bridge = { post };
  const deps: ModuleSelectionDeps = { mode, canvas, bridge, details };
  const setPhase = (next: ModulePhase): void => {
    current = next;
  };
  const rig: ModuleSelectionRig = { deps, mode, post, show, saved: (): ModulesViewState | null => saved, setPhase };

  return rig;
};

/** The host's answer to `ask`. */
export const sitesReplyOf = (ask: GraphScanModuleSitesMessage, result: ModuleSitesResult): GraphModuleSitesMessage => {
  const reply: GraphModuleSitesMessage = { type: 'moduleSites', packageName: ask.packageName, from: ask.from, to: ask.to, result };

  return reply;
};
