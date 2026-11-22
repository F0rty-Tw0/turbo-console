/** True when `specifier` is the package `name` itself or a subpath of it (`name/...`); case-sensitive. */
export const isNameOf = (specifier: string, name: string): boolean => specifier === name || specifier.startsWith(`${name}/`);
