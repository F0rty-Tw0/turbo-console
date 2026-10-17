import { z } from 'zod';

const licenseSchema = z.object({ type: z.string() });

export const iconSchema = z.object({
  title: z.string(),
  slug: z.string(),
  source: z.url(),
  guidelines: z.url().optional(),
  license: licenseSchema.optional()
});

/** Every `icons.json` entry, parsed loosely: only the slug is read, so an unused entry can hold anything else. */
export const listedIconsSchema = z.array(z.looseObject({ slug: z.string() }));

export const manifestSchema = z.object({ version: z.string() });
