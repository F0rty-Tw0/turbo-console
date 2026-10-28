/** The item `key` moves focus to in a menu of `count` items, wrapping at both ends; `index` -1 is no item yet; `null`: the key moves nothing. */
export const menuIndexOf = (key: string, index: number, count: number): number | null => {
  if (count === 0) return null;

  const last = count - 1;

  switch (key) {
    case 'ArrowDown': {
      const next = index + 1;

      return index >= last ? 0 : next;
    }
    case 'ArrowUp': {
      const previous = index - 1;

      return index <= 0 ? last : previous;
    }
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
};

const mappedKeyOf = (key: string): string | null => {
  switch (key) {
    case 'ArrowRight':
      return 'ArrowDown';
    case 'ArrowLeft':
      return 'ArrowUp';
    case 'Home':
    case 'End':
      return key;
    default:
      return null;
  }
};

/** A toolbar's Left/Right/Home/End, wrapping, as `menuIndexOf` does for a menu; `null`: the key moves nothing. */
export const toolbarIndexOf = (key: string, index: number, count: number): number | null => {
  const mapped = mappedKeyOf(key);

  if (mapped === null) return null;

  return menuIndexOf(mapped, index, count);
};

/** Shift+F10 or the ContextMenu key: open the menu of what is selected. */
export const isMenuOpenKey = (key: string, isShift: boolean): boolean => key === 'ContextMenu' || (isShift && key === 'F10');
