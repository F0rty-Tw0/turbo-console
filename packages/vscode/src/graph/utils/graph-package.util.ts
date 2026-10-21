import type { GraphPackage } from '@turbo-console/webview-ui';

/** The names of `packages`, in their order. */
export const packageNamesOf = (packages: GraphPackage[]): string[] => packages.map((pkg) => pkg.name);
