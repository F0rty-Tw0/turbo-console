/** An open hook that runs `action` when the opened path ends with `suffix`. */
export const onOpenOf = (suffix: string, action: () => void): ((path: string) => Promise<void>) => {
  const hook = async (path: string): Promise<void> => {
    const isTarget = path.endsWith(suffix);

    if (isTarget) action();

    return Promise.resolve();
  };

  return hook;
};
