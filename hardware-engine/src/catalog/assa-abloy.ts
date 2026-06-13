// ─── ASSA ABLOY catalog line (SKELETON / partial DRAFT) ───
//
// Structural map proving the two-manufacturer abstraction. Only the high-confidence common
// items are seeded; the rest return null, so the resolver emits a loud TBD placeholder
// (never a silent drop). Lines: Sargent (locks/exit), Norton (closers), McKinney (hinges),
// Pemko (seals/sweeps/thresholds), Rockwood (plates/stops/bolts). Catalog numbers are DRAFT.

import type { CatalogLine, CatalogEntry } from './types.ts';
import { entry } from './types.ts';
import type { LockFunction } from '../types.ts';

// Sargent 10-line (Grade 1 cylindrical) function -> catalog number. DRAFT, partial.
const SARGENT_10_BY_FUNCTION: Record<LockFunction, { sku: string; desc: string } | null> = {
  passage:     { sku: '10U15 LL', desc: 'Sargent 10U15 passage latchset, L-lever' },
  privacy:     { sku: '10U65 LL', desc: 'Sargent 10U65 privacy lockset, L-lever' },
  office:      { sku: '10U54 LL', desc: 'Sargent 10U54 entry/office lock, L-lever' },
  storeroom:   { sku: '10U15-LL? (VERIFY)', desc: 'Sargent storeroom function — VERIFY exact 10-line code' },
  classroom:   { sku: '10U37 LL', desc: 'Sargent 10U37 classroom lock, L-lever' },
  institution: null,
  'exit-only-trim': null,
  dummy:       null,
};

function tbd(category: CatalogEntry['category'], note: string): CatalogEntry {
  return entry(category, 'TBD', `ASSA ABLOY: ${note} — not yet seeded (VERIFY)`, 'ASSA ABLOY');
}

export const ASSA_ABLOY: CatalogLine = {
  id: 'assa-abloy',
  label: 'ASSA ABLOY (Sargent / Norton / McKinney / Pemko / Rockwood)',
  manufacturer: 'ASSA ABLOY',

  lockset(fn: LockFunction): CatalogEntry | null {
    const e = SARGENT_10_BY_FUNCTION[fn];
    if (!e) return null;
    return entry('lockset', e.sku, e.desc, 'Sargent');
  },

  exitDevice(ctx): CatalogEntry[] {
    // Sargent 80 series; "AlarmReady"/fire variants vary — DRAFT.
    const dev = ctx.fireExit ? '8800 (fire)' : '8800';
    const items: CatalogEntry[] = [
      entry('exit-device', `${dev} EO`, `Sargent ${dev} rim exit device${ctx.fireExit ? ' (fire exit)' : ''}`, 'Sargent'),
    ];
    if (ctx.outsideTrim !== 'none') {
      items.push(tbd('exit-trim', `outside ${ctx.outsideTrim} trim`));
    }
    return items;
  },

  closer(opts): CatalogEntry | null {
    // Norton 7500 series. DRAFT.
    return entry('closer', '7500', `Norton 7500 surface closer${opts.barrierFree ? ', barrier-free adjusted' : ''}${opts.faReleased ? ', hold-open release' : ''}`, 'Norton');
  },

  hinge(opts): CatalogEntry | null {
    // McKinney TA/T4A ball-bearing hinge. DRAFT.
    if (opts.nonRemovablePin) return entry('hinges', 'T4A3386 NRP', 'McKinney T4A3386 ball-bearing hinge, non-removable pin', 'McKinney');
    return entry('hinges', 'TA2714', 'McKinney TA2714 ball-bearing hinge', 'McKinney');
  },

  kickPlate(): CatalogEntry | null { return tbd('protection-plate', 'kick plate (Rockwood K1050)'); },
  stopHolder(type): CatalogEntry | null { return tbd('stop-holder', `${type} stop`); },
  flushBolt(opts): CatalogEntry | null { return tbd('flush-bolt', opts.auto ? 'automatic flush bolts' : 'manual flush bolts'); },
  coordinator(): CatalogEntry | null { return tbd('coordinator', 'coordinator'); },
  astragal(): CatalogEntry | null { return tbd('astragal', 'astragal'); },
  gasketing(opts): CatalogEntry | null { return tbd('gasketing', opts.smoke ? 'smoke gasketing' : 'weatherstrip'); },
  doorSweep(): CatalogEntry | null { return tbd('door-sweep', 'door sweep'); },
  threshold(): CatalogEntry | null { return tbd('threshold', 'threshold'); },
  silencer(): CatalogEntry | null { return tbd('silencer', 'silencer'); },
};
