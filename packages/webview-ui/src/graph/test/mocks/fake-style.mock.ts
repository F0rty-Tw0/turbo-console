/** A plain record of inline style properties whose `setProperty` stores a custom property like any other. */
export const fakeStyleMock = (): Record<string, string> => {
  const style: Record<string, string> = {};
  const setProperty = (name: string, value: string): void => {
    style[name] = value;
  };

  Object.defineProperty(style, 'setProperty', { value: setProperty });

  return style;
};
