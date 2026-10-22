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
    setShown
  };

  return packageActions;
};
