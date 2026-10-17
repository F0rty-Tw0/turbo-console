import { z } from 'zod';

const licenseSchema = z.object({ type: z.string() });

const iconSchema = z.object({ title: z.string(), slug: z.string(), source: z.string(), license: licenseSchema.optional() });

/** `simple-icons/icons.json`: the build reads a package file, so its shape is checked once here. */
export const iconsSchema = z.array(iconSchema);

export const manifestSchema = z.object({ version: z.string() });
