import type { TaskModes } from './graph-task.type.ts';
import type { ModulePhase, ModuleRedraw } from './module-mode.type.ts';
import type { ModulePanelViews } from './module-panels.type.ts';
import type { ModuleShown } from './module-scene.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The module Controls panel `aside#graph-module-controls`, hidden and unwired: the Focus section, then the View section. */
export type ModuleControlsElements = {
  readonly panel: HTMLElement;
  /** The Focus section's line: the focus target's path or package name, or `MODULE_NO_FOCUS_TEXT`. */
  readonly target: HTMLElement;
  /** Hidden while nothing is focused. */
  readonly clearFocus: HTMLButtonElement;
  readonly depth: HTMLInputElement;
  readonly types: HTMLInputElement;
  readonly tests: HTMLInputElement;
  readonly lazies: HTMLInputElement;
  readonly reset: HTMLButtonElement;
};

/** What the module Controls report: a valid depth typed, a kind box flipped (all three read), Reset view, Clear focus. */
export type ModuleControlsActions = {
  readonly onDepth: (depth: number) => void;
  readonly onShown: (shown: ModuleShown) => void;
  readonly onReset: () => void;
  readonly onClearFocus: () => void;
};

/** Modules mode as the module Controls' edits reach it (`GraphModuleMode`): the saved view, the phase, a draw and a save. */
export type ModuleViewEditMode = {
  readonly view: () => ModulesViewState | null;
  readonly phase: () => ModulePhase;
  readonly update: (view: ModulesViewState, redraw: ModuleRedraw) => void;
  readonly save: (view: ModulesViewState) => void;
};

/** What `GraphModuleControls` mounts in, builds its panel with, saves its open state to and reports to. */
export type ModuleControlsDeps = {
  readonly page: Pick<PageElements, 'body' | 'controls' | 'packagesMode' | 'modeGroup'>;
  readonly views: Pick<ModulePanelViews, 'controls'>;
  readonly modes: Pick<TaskModes, 'savePanels'>;
  readonly actions: ModuleControlsActions;
};
