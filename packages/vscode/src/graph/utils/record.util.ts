/** Whether `value` is a non-null, non-array object (a Map, Date or class instance passes too). */
export const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null && !Array.isArray(value);
