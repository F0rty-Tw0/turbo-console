/** `apps\e2e-1` → `apps/e2e-1`; a posix path passes through unchanged. */
export const toPosixPath = (path: string): string => path.replaceAll('\\', '/');
