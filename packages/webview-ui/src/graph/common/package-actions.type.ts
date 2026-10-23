import type { GraphInspectionDeps, InspectionActions } from './graph-inspection.type.ts';

/** A package's actions outside the details panel and the list; each does exactly what its panel or list twin does. */
export type PackageActions = {
  readonly openDetails: (name: string) => void;
  /** The list's Focus toggle: focusing the focused package clears its focus. */
  readonly focus: (name: string) => void;
  readonly clearFocus: () => void;
  readonly startTrace: () => void;
  /** The list checkbox of `name`, ticked when `isShown`. */
  readonly setShown: (name: string, isShown: boolean) => void;
  /** The details panel's Show tasks: task mode on every visible task of `name`. */
  readonly showTasks: (name: string) => void;
};

/** The inspection's list and task hooks the package actions go through. */
export type PackageActionsDeps = Pick<GraphInspectionDeps, 'focus' | 'onFocusOn' | 'onExclude' | 'onShow' | 'onShowTasks'>;

/** The inspection's own actions the package actions go through. */
export type PackageInspectionActions = Pick<InspectionActions, 'openDetailsOf' | 'input'>;
