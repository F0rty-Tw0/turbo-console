/** In-page readers for `evaluateAll` over the panel's boxes; each is serialised into the page, so it uses no outer name. */
export const uncheckedShowNames = (boxes: HTMLInputElement[]): string[] => {
  const unchecked = boxes.filter((box): boolean => !box.checked);
  const labels = unchecked.map((box): string => box.getAttribute('aria-label') ?? '');

  return labels.map((label): string => label.slice('Show '.length));
};

export const lockedShowNames = (boxes: HTMLInputElement[]): string[] => {
  const locked = boxes.filter((box): boolean => box.getAttribute('aria-disabled') === 'true');
  const labels = locked.map((box): string => box.getAttribute('aria-label') ?? '');

  return labels.map((label): string => label.slice('Show '.length));
};

export const checkedTagNames = (boxes: HTMLInputElement[]): string[] => {
  const checked = boxes.filter((box): boolean => box.checked);

  return checked.map((box): string => box.labels?.[0]?.textContent ?? '');
};
