/** Sets a button's text and its hover title together, so the title never keeps an old label. */
export const setButtonText = (button: HTMLButtonElement, text: string): void => {
  button.textContent = text;
  button.title = text;
};

/** Sets a button's accessible name and its hover title together. */
export const setButtonLabel = (button: HTMLButtonElement, label: string): void => {
  button.setAttribute('aria-label', label);
  button.title = label;
};
