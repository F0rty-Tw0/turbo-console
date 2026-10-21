/** `selected` when the visible set holds it, else `null`: a package that isn't drawn can't stay selected. */
export const visibleSelection = (selected: string | null, visible: ReadonlySet<string>): string | null => {
  if (selected === null) return null;

  const isVisible = visible.has(selected);

  return isVisible ? selected : null;
};
