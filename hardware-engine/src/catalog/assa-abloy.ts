// ─── ASSA ABLOY catalog line (DRAFT) ───
//
// Real, well-known ASSA ABLOY brands and functions; exact catalog numbers, suffixes, and trim
// codes are ILLUSTRATIVE and must be reconciled against the live price book before quoting.
// Lines: Sargent (locks/exit), Norton (closers), McKinney (hinges), Rockwood (plates/stops/
// bolts/coordinators/silencers), Rixson (overhead stops), Pemko (seals/sweeps/thresholds).

import type { CatalogLine, CatalogEntry } from './types.ts';
import { entry } from './types.ts';
import type { LockFunction, LockStyle } from '../types.ts';

// Sargent 10-line (Grade 1 cylindrical) "G" functions. DRAFT.
const SARGENT_10_BY_FUNCTION: Record<LockFunction, { sku: string; desc: string } | null> = {
  passage:     { sku: '10G10 LL', desc: 'Sargent 10G10 passage latchset, L-lever' },
  privacy:     { sku: '10G44 LL', desc: 'Sargent 10G44 privacy lockset, L-lever' },
  office:      { sku: '10G05 LL', desc: 'Sargent 10G05 entrance/office lock, L-lever' },
  storeroom:   { sku: '10G04 LL', desc: 'Sargent 10G04 storeroom lock, L-lever' },
  classroom:   { sku: '10G37 LL', desc: 'Sargent 10G37 classroom lock, L-lever' },
  institution: { sku: '10G73 LL (VERIFY)', desc: 'Sargent institution function — VERIFY exact code' },
  'exit-only-trim': null,
  dummy:       { sku: '10G00 LL', desc: 'Sargent 10G00 dummy trim, L-lever' },
};

// Sargent 8200 (Grade 1 mortise) functions — the upgrade path. DRAFT.
const SARGENT_8200_BY_FUNCTION: Record<LockFunction, { sku: string; desc: string } | null> = {
  passage:     { sku: '8215 LNL', desc: 'Sargent 8215 mortise passage latch, LNL lever' },
  privacy:     { sku: '8265 LNL', desc: 'Sargent 8265 mortise privacy lock, LNL lever' },
  office:      { sku: '8205 LNL', desc: 'Sargent 8205 mortise entrance/office lock, LNL lever' },
  storeroom:   { sku: '8204 LNL', desc: 'Sargent 8204 mortise storeroom lock, LNL lever' },
  classroom:   { sku: '8237 LNL', desc: 'Sargent 8237 mortise classroom lock, LNL lever' },
  institution: { sku: '8273 LNL (VERIFY)', desc: 'Sargent institution mortise — VERIFY exact code' },
  'exit-only-trim': null,
  dummy:       { sku: '8290 LNL', desc: 'Sargent 8290 mortise dummy trim, LNL lever' },
};

export const ASSA_ABLOY: CatalogLine = {
  id: 'assa-abloy',
  label: 'ASSA ABLOY (Sargent / Norton / McKinney / Rockwood / Rixson / Pemko)',
  manufacturer: 'ASSA ABLOY',

  lockset(fn: LockFunction, opts?: { style?: LockStyle }): CatalogEntry | null {
    const e = (opts?.style === 'mortise' ? SARGENT_8200_BY_FUNCTION : SARGENT_10_BY_FUNCTION)[fn];
    if (!e) return null;
    return entry('lockset', e.sku, e.desc, 'Sargent');
  },

  exitDevice(ctx): CatalogEntry[] {
    // Sargent 80-series rim device; fire-rated variant has no mechanical dogging. DRAFT.
    const dev = ctx.fireExit ? '8800 (fire exit)' : '8800';
    const items: CatalogEntry[] = [
      entry('exit-device', `${dev} EO`, `Sargent ${dev} rim exit device${ctx.fireExit ? ', no mechanical dogging' : ''}`, 'Sargent'),
    ];
    if (ctx.outsideTrim === 'key-lever') {
      items.push(entry('exit-trim', '732 ETL', 'Sargent 732 ETL night-latch lever trim (key retracts latch)', 'Sargent'));
    } else if (ctx.outsideTrim === 'lever') {
      items.push(entry('exit-trim', '710 ETL', 'Sargent 710 ETL passage lever trim', 'Sargent'));
    }
    return items;
  },

  closer(opts): CatalogEntry | null {
    // Norton 7500 series surface closer. DRAFT.
    const sku = opts.faReleased ? '7700 (hold-open)' : '7500';
    return entry('closer', sku, `Norton ${sku} surface closer${opts.barrierFree ? ', barrier-free adjusted' : ''}${opts.faReleased ? ', smoke-detector hold-open release' : ''}`, 'Norton');
  },

  hinge(opts): CatalogEntry | null {
    // McKinney ball-bearing butt hinge, 4.5" x 4.5". DRAFT.
    if (opts.nonRemovablePin) return entry('hinges', 'T4A3386 NRP', 'McKinney T4A3386 heavy-weight ball-bearing hinge, non-removable pin', 'McKinney');
    if (opts.bearing) return entry('hinges', 'TA2714', 'McKinney TA2714 ball-bearing hinge', 'McKinney');
    return entry('hinges', 'TA2314', 'McKinney TA2314 plain-bearing hinge', 'McKinney');
  },

  kickPlate(): CatalogEntry {
    return entry('protection-plate', 'K1050 10" x 2" LDW', 'Rockwood K1050 kick plate, 10" high, .050" stainless', 'Rockwood');
  },

  stopHolder(type): CatalogEntry {
    if (type === 'overhead') return entry('stop-holder', 'Rixson 1-Series', 'Rixson 1-series surface overhead stop', 'Rixson');
    return entry('stop-holder', '441', 'Rockwood 441 concave wall stop', 'Rockwood');
  },

  flushBolt(opts): CatalogEntry {
    if (opts.auto) return entry('flush-bolt', '1942/2942', 'Rockwood automatic/constant-latching flush bolts (fire pair)', 'Rockwood');
    return entry('flush-bolt', '555', 'Rockwood 555 manual flush bolt set', 'Rockwood');
  },

  coordinator(): CatalogEntry {
    return entry('coordinator', '1614', 'Rockwood 1600-series bar-type coordinator', 'Rockwood');
  },

  astragal(): CatalogEntry {
    return entry('astragal', '357SP', 'Pemko 357SP overlapping astragal', 'Pemko');
  },

  gasketing(opts): CatalogEntry {
    if (opts.smoke) return entry('gasketing', 'FG3000', 'Pemko FG3000 intumescent/smoke gasketing', 'Pemko');
    return entry('gasketing', 'S88D', 'Pemko S88D perimeter weatherstrip gasketing', 'Pemko');
  },

  doorSweep(): CatalogEntry {
    return entry('door-sweep', '18062CNB', 'Pemko 18062CNB door sweep', 'Pemko');
  },

  threshold(): CatalogEntry {
    return entry('threshold', '171A', 'Pemko 171A saddle threshold', 'Pemko');
  },

  silencer(): CatalogEntry {
    return entry('silencer', '608', 'Rockwood 608 rubber silencer (set)', 'Rockwood');
  },
};
