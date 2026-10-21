import type { GraphPackage } from '@turbo-console/webview-ui';

export const packageNamesOf = (packages: GraphPackage[]): string[] => packages.map((pkg) => pkg.name);
