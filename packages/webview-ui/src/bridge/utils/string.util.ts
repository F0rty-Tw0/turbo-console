/** Whether `value` is a string; the narrowing the message shape checks share. */
export const isString = (value: unknown): value is string => typeof value === 'string';

/** Whether `value` is a string of at most `max` characters. */
export const isShortString = (value: unknown, max: number): boolean => isString(value) && value.length <= max;
