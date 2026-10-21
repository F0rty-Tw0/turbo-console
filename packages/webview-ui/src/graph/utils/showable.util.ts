/** The path packages outside `visible` that `canShow` accepts: the steps whose "Show" button is offered. */
export const showableNamesOf = (
  path: string[],
  visible: ReadonlySet<string>,
  canShow: (name: string) => boolean
): ReadonlySet<string> => {
  const isShowable = (name: string): boolean => !visible.has(name) && canShow(name);
  const names = path.filter(isShowable);

  return new Set(names);
};
