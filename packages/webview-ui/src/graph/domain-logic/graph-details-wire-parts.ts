import type { DetailsEnv, DetailsView } from '../common/graph-details.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';

export const selectInput = (name: string): InspectionInput => {
  const input: InspectionInput = { kind: 'select', name, via: 'panel' };

  return input;
};

export const explainInput = (source: string, target: string): InspectionInput => {
  const input: InspectionInput = { kind: 'explain', source, target };

  return input;
};

/** Whether a click on `button` does nothing: it is `aria-disabled`, read at click time, as updates move it. */
const isAriaDisabled = (button: HTMLButtonElement): boolean => {
  const disabled = button.getAttribute('aria-disabled');

  return disabled === 'true';
};

/** A click on an `aria-disabled` button does nothing (see `isAriaDisabled`). */
export const onClick = (button: HTMLButtonElement, act: () => void): void => {
  button.addEventListener('click', (): void => {
    const isDisabled = isAriaDisabled(button);

    if (!isDisabled) act();
  });
};

export const wired = <View extends DetailsView>(view: View, env: DetailsEnv): View => {
  onClick(view.close, env.onClose);

  return view;
};
