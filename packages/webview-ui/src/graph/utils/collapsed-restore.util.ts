/** The saved collapsed folders the drawn graph still has. */
export const collapsedOf = (saved: string[], known: ReadonlySet<string>): Set<string> => {
  const kept = saved.filter((folder) => known.has(folder));

  return new Set(kept);
};
