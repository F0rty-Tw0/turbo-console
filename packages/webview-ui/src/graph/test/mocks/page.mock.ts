import type { PageElements } from '../../common/page-elements.type.ts';
import { buildPage } from '../../ui/page-elements.ts';

/** The real page in its pre-state, for a domain-logic spec that writes to it under the fake `document`. */
export const pageMock = (): PageElements => buildPage();
