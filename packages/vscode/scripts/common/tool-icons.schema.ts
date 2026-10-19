import { array, looseObject, object, optional, string, url } from 'zod/mini';

const httpsUrl = url({ protocol: /^https$/ });

const licenseSchema = object({ type: string() });

export const iconSchema = object({
  title: string(),
  slug: string(),
  source: httpsUrl,
  guidelines: optional(httpsUrl),
  license: optional(licenseSchema)
});

const listedIconSchema = looseObject({ slug: string() });

/** Every `icons.json` entry, parsed loosely: only the slug is read, so an unused entry can hold anything else. */
export const listedIconsSchema = array(listedIconSchema);

export const manifestSchema = object({ version: string() });
