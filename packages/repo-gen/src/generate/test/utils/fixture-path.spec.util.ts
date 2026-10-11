import { resolve } from 'node:path';

export const fixturePath = (name: string, file: string): string => resolve(import.meta.dirname, '../fixtures', name, file);
