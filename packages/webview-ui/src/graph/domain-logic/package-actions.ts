import type { InspectionInput } from '../common/inspection.type.ts';
import type { PackageActions, PackageActionsDeps, PackageInspectionActions } from '../common/package-actions.type.ts';

const START_TRACE: InspectionInput = { kind: 'startTrace' };

/** A package's actions over the same calls as the details panel's package buttons and the list's Focus and checkbox. */
export const packageActionsOf = (deps: PackageActionsDeps, actions: PackageInspectionActions): PackageActions => {
  const clearFocus = (): void => {
    const focused = deps.focus();

    if (focused !== null) deps.onFocusOn(focused);
  };
  const setShown = (name: string, isShown: boolean): void => {
    if (isShown) deps.onShow(name);
    else deps.onExclude(name);
  };
  const packageActions: PackageActions = {
    openDetails: (name): void => actions.openDetailsOf(name),
    focus: (name): void => deps.onFocusOn(name),
    clearFocus,
    startTrace: (): void => actions.input(START_TRACE),
    setShown,
    showTasks: (name): void => deps.onShowTasks(name)
  };

  return packageActions;
};

/**
 * The actions of the toolbar and the menu: Show tasks, once it ran, leaves focus on the container, since task mode hides
 * the buttons and "…" that would hold it. Callers guard it: the toolbar calls it only through `actOnPackage`, so a refused press leaves focus where it was.
 */
export const focusingShowTasksOf = (actions: PackageActions, container: HTMLElement): PackageActions => {
  const showTasks = (name: string): void => {
    actions.showTasks(name);
    container.focus();
  };
  const focusing: PackageActions = { ...actions, showTasks };

  return focusing;
};
