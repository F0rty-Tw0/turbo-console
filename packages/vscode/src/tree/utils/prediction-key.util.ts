/** The key of the entry of a package in a root: a JSON pair, so no root or package name can run into the other. */
export const predictionKeyOf = (root: string, packageName: string): string => JSON.stringify([root, packageName]);
