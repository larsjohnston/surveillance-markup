// ─── @calsafe/hardware-engine — public API ───
//
// Architectural hardware consulting engine: door-schedule openings -> code-compliant,
// manufacturer-resolved hardware sets. DOM-free, zero runtime dependencies.
//
// Quick start:
//   import { generateHardwareSets } from '@calsafe/hardware-engine';
//   const { sets, openingToSet, profiles } = generateHardwareSets(openings, { catalog: 'allegion' });

export * from './types.ts';
export { generateHardwareSets, deriveRequirements, resolveItems, groupIntoSets } from './engine/index.ts';
export type { GenerateOptions } from './engine/index.ts';
export { DEFAULT_FINISH } from './engine/resolve.ts';
export type { FinishPolicy } from './engine/resolve.ts';
export { NBC_ALBERTA } from './jurisdiction/nbc-alberta.ts';
export type { Jurisdiction } from './jurisdiction/nbc-alberta.ts';
export { CATALOGS, getCatalog, ALLEGION, ASSA_ABLOY } from './catalog/index.ts';
export type { CatalogLine, CatalogEntry } from './catalog/types.ts';
