import { join, resolve } from 'node:path';

export const A_DIR = resolve('/ws/x/a');

export const B_DIR = join(A_DIR, 'plugins', 'b');

export const C_DIR = join(B_DIR, 'c');

export const Y_DIR = resolve('/ws/y');
