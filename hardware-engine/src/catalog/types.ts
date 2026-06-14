// ─── Catalog interface: requirement tokens -> manufacturer catalog entries ───
//
// A CatalogLine returns DRAFT catalog data (sku/description/line/category). The resolver
// (engine/resolve.ts) wraps each entry with finish, quantity, reasons, and the `draft` flag.
// Returning `null` means "this line does not (yet) seed this item" — the resolver emits a
// loud TBD placeholder rather than silently dropping the requirement.

import type { HardwareCategory, LockFunction, ExitDeviceType, LockStyle } from '../types.ts';

export interface CatalogEntry {
  category: HardwareCategory;
  /** DRAFT/illustrative catalog number — reconcile against the price book before quoting. */
  sku: string;
  description: string;
  /** Product line within the manufacturer family (Schlage, Von Duprin, LCN, Ives, …). */
  line: string;
}

export interface ExitDeviceCtx {
  device: ExitDeviceType;
  outsideTrim: 'none' | 'lever' | 'key-lever';
  fireExit: boolean;
}

export interface CatalogLine {
  id: string;
  label: string;
  /** Manufacturer family label, e.g. "Allegion", "ASSA ABLOY". */
  manufacturer: string;

  lockset(fn: LockFunction, opts?: { style?: LockStyle }): CatalogEntry | null;
  /** May return device + separate outside-trim entries. */
  exitDevice(ctx: ExitDeviceCtx): CatalogEntry[];
  closer(opts: { barrierFree: boolean; faReleased: boolean }): CatalogEntry | null;
  hinge(opts: { bearing: boolean; nonRemovablePin: boolean }): CatalogEntry | null;
  kickPlate(): CatalogEntry | null;
  stopHolder(type: 'wall' | 'overhead'): CatalogEntry | null;
  flushBolt(opts: { auto: boolean }): CatalogEntry | null;
  coordinator(): CatalogEntry | null;
  astragal(): CatalogEntry | null;
  gasketing(opts: { smoke: boolean }): CatalogEntry | null;
  doorSweep(): CatalogEntry | null;
  threshold(): CatalogEntry | null;
  silencer(): CatalogEntry | null;
}

export function entry(
  category: HardwareCategory,
  sku: string,
  description: string,
  line: string,
): CatalogEntry {
  return { category, sku, description, line };
}
