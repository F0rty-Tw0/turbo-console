/** The text a reader sees for a task's package: the root label of a single-package root, else the package name. */
export const ownerTextOf = (packageName: string, rootLabel: string | null): string => rootLabel ?? packageName;
