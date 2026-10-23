/** Whether `value` is a string; the narrowing the message shape checks share. */
export const isString = (value: unknown): value is string => typeof value === 'string';
