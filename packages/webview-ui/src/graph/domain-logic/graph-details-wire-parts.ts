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

/** A click on an `aria-disabled` button does nothing; the attribute is read at click time, as updates move it. */
export const onClick = (button: HTMLButtonElement, act: () => void): void => {
  button.addEventListener('click', (): void => {
    const disabled = button.getAttribute('aria-disabled');
    const isDisabled = disabled === 'true';

    if (!isDisabled) act();
  });
};

export const wired = <View extends DetailsView>(view: View, env: DetailsEnv): View => {
  onClick(view.close, env.onClose);

  return view;
};
