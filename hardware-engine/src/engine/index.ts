// ─── Engine entry: Opening[] -> HardwareSet[] ───

import type { Opening, GenerateResult, RequirementProfile } from '../types.ts';
import type { CatalogLine } from '../catalog/types.ts';
import { type Jurisdiction, NBC_ALBERTA } from '../jurisdiction/nbc-alberta.ts';
import { getCatalog } from '../catalog/index.ts';
import { deriveRequirements } from './requirements.ts';
import { resolveItems, type FinishPolicy, DEFAULT_FINISH } from './resolve.ts';
import { groupIntoSets } from './sets.ts';

export interface GenerateOptions {
  /** Catalog id ('allegion' | 'assa-abloy') or a CatalogLine instance. Default: 'allegion'. */
  catalog?: string | CatalogLine;
  jurisdiction?: Jurisdiction;
  finishPolicy?: FinishPolicy;
}

function resolveCatalog(c: GenerateOptions['catalog']): CatalogLine {
  if (!c) return getCatalog('allegion');
  return typeof c === 'string' ? getCatalog(c) : c;
}

export function generateHardwareSets(openings: Opening[], opts: GenerateOptions = {}): GenerateResult {
  const j = opts.jurisdiction ?? NBC_ALBERTA;
  const catalog = resolveCatalog(opts.catalog);
  const policy = opts.finishPolicy ?? DEFAULT_FINISH;

  const profiles: RequirementProfile[] = [];
  const resolved = openings.map((o) => {
    const profile = deriveRequirements(o, j);
    profiles.push(profile);
    return { openingNumber: o.number, items: resolveItems(profile, catalog, policy) };
  });

  const { sets, openingToSet } = groupIntoSets(resolved);
  return { sets, openingToSet, profiles };
}

export { deriveRequirements, resolveItems, groupIntoSets };
