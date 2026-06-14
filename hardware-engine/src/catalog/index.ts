// ─── Catalog registry ───

import type { CatalogLine } from './types.ts';
import { ALLEGION } from './allegion.ts';
import { ASSA_ABLOY } from './assa-abloy.ts';
import { LH_COMMODITY } from './lh-commodity.ts';

export const CATALOGS: Record<string, CatalogLine> = {
  [ALLEGION.id]: ALLEGION,
  [ASSA_ABLOY.id]: ASSA_ABLOY,
  [LH_COMMODITY.id]: LH_COMMODITY,
};

export function getCatalog(id: string): CatalogLine {
  const c = CATALOGS[id];
  if (!c) throw new Error(`unknown catalog line "${id}" (have: ${Object.keys(CATALOGS).join(', ')})`);
  return c;
}

export { ALLEGION, ASSA_ABLOY, LH_COMMODITY };
export type { CatalogLine, CatalogEntry } from './types.ts';
