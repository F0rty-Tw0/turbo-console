/** Whether `value` is a plain object: not `null` and not an array. */
export const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null && !Array.isArray(value);
