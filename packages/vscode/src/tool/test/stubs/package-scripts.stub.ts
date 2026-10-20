import type { PackageScripts } from '../../common/tool.type.ts';

/** Scripts that offer no delegation: a command resolves only by its own binaries. */
export const NO_SCRIPTS_STUB: PackageScripts = { bodies: new Map(), followTurbo: true };
