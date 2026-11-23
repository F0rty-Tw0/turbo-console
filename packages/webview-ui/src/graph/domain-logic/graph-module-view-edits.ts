import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULE_REDRAW_KEEP } from '../common/graph-module.const.ts';
import type { ModuleViewEditMode } from '../common/module-controls.type.ts';
import type { ModuleRedraw } from '../common/module-mode.type.ts';
import type { ModuleShown } from '../common/module-scene.type.ts';
import { defaultExpandedOf } from '../utils/module-expand.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const FIT: ModuleRedraw = { kind: 'fit' };

/** A View box changed: the saved view shows `shown`, drawn again with the camera kept; nothing is posted. */
export const toggleShown = (mode: ModuleViewEditMode, shown: ModuleShown): void => {
  const view = mode.view();

  if (view === null) return;

  const toggled: ModulesViewState = { ...view, shown };

  mode.update(toggled, MODULE_REDRAW_KEEP);
};

/** Reset view while Shown: the shown package's default expansion, then a fit. */
export const resetView = (mode: ModuleViewEditMode): void => {
  const view = mode.view();
  const phase = mode.phase();

  if (view === null || phase.kind !== 'shown') return;

  const tree = moduleTreeOf(phase.found.files);
  const expanded = defaultExpandedOf(tree);
  const reset: ModulesViewState = { ...view, expanded };

  mode.update(reset, FIT);
};

/** Spec §6.5 setDepth: a new depth draws again with a fit while a focus is set, and is only saved without one. */
export const depthEdited = (mode: ModuleViewEditMode, depth: number): void => {
  const view = mode.view();

  if (view === null) return;

  const next: ModulesViewState = { ...view, depth };

  if (view.focus !== null) mode.update(next, FIT);
  else mode.save(next);
};

/** Spec §6.5 focus, Shown only: focuses `target`, or clears the focus when it is already `target`, then fits. */
export const focusToggled = (mode: ModuleViewEditMode, target: string): void => {
  const view = mode.view();
  const phase = mode.phase();

  if (phase.kind !== 'shown' || view === null) return;

  const focus = view.focus === target ? null : target;
  const focused: ModulesViewState = { ...view, focus };

  mode.update(focused, FIT);
};

/** Spec §6.5 clearFocus: saved with no focus in every phase, drawn again with a fit only while Shown (spec §7). */
export const focusCleared = (mode: ModuleViewEditMode): void => {
  const view = mode.view();

  if (view === null) return;

  const cleared: ModulesViewState = { ...view, focus: null };

  mode.update(cleared, FIT);
};
