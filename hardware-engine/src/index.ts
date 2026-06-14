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
export type { FinishPolicy, ResolveOptions } from './engine/resolve.ts';
export { NBC_ALBERTA, needsPanicHardware } from './jurisdiction/nbc-alberta.ts';
export type { Jurisdiction, PanicDecision } from './jurisdiction/nbc-alberta.ts';
export { priceSets, deriveSell, DEFAULT_PRICING_RULE } from './pricing/price.ts';
export type { PriceOptions } from './pricing/price.ts';
export { CATALOGS, getCatalog, ALLEGION, ASSA_ABLOY, LH_COMMODITY } from './catalog/index.ts';
export type { CatalogLine, CatalogEntry } from './catalog/types.ts';
export { rowsToOpenings, inferFunction, functionFromRoomLabel, widthToInches } from './ingest/door-schedule.ts';
export type { ScheduleRow, IngestResult, InferenceConfidence } from './ingest/door-schedule.ts';
export { parseScheduleCsv, parseCsv, detectColumns, parseFireLabel } from './ingest/csv.ts';
export type { ColumnMap, ParseScheduleOptions, ParseScheduleResult } from './ingest/csv.ts';
export { renderHardwareSchedule, renderTakeoff, renderPricedSummary, renderReviewFlags } from './report/spec.ts';
export type { ReportOptions } from './report/spec.ts';
export { createRevision, diffRevisions, hashInput, RevisionStore } from './versioning/revisions.ts';
export type { ProjectInput, Revision, RevisionDiff, OpeningDiff, OpeningStatus, OpeningFieldChange, CreateRevisionMeta } from './versioning/revisions.ts';
