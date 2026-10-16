import type { TurboTaskFacts } from './turbo-config.type.ts';

/** Shared by every task turbo keeps running until stopped; read only. */
export const PERSISTENT_FACTS: TurboTaskFacts = { persistent: true };

/** Shared by every other task, and by each task until the field walk resolves it; read only. */
export const NOT_PERSISTENT_FACTS: TurboTaskFacts = { persistent: false };
