// ─── Allegion catalog line (DRAFT) ───
//
// Real, well-known Allegion product series and ANSI/BHMA functions are used; exact catalog
// numbers, suffixes (handing, finish, backset), and trim codes are ILLUSTRATIVE and must be
// reconciled against the live price book before quoting. Lines: Schlage (locks), Von Duprin
// (exit devices), LCN (closers), Ives (hinges/plates/stops/bolts/coordinators/silencers),
// Glynn-Johnson (overhead stops/holders), Zero International (seals/sweeps/thresholds).

import type { CatalogLine, CatalogEntry } from './types.ts';
import { entry } from './types.ts';
import type { LockFunction } from '../types.ts';

// Schlage ND-series (Grade 1 cylindrical) function -> catalog number. DRAFT.
const ND_BY_FUNCTION: Record<LockFunction, { sku: string; desc: string } | null> = {
  passage:        { sku: 'ND10S RHO', desc: 'Schlage ND10S passage latchset, Rhodes lever' },
  privacy:        { sku: 'ND40S RHO', desc: 'Schlage ND40S privacy lockset, Rhodes lever' },
  office:         { sku: 'ND50PD RHO', desc: 'Schlage ND50PD entrance/office lock, Rhodes lever' },
  storeroom:      { sku: 'ND80PD RHO', desc: 'Schlage ND80PD storeroom lock, Rhodes lever' },
  classroom:      { sku: 'ND70PD RHO', desc: 'Schlage ND70PD classroom lock, Rhodes lever' },
  institution:    { sku: 'ND82PD RHO', desc: 'Schlage ND82PD institution lock, Rhodes lever' },
  'exit-only-trim': null, // handled via exit device
  dummy:          { sku: 'ND170 RHO', desc: 'Schlage ND170 single dummy trim, Rhodes lever' },
};

export const ALLEGION: CatalogLine = {
  id: 'allegion',
  label: 'Allegion (Schlage / Von Duprin / LCN / Ives / Glynn-Johnson / Zero)',
  manufacturer: 'Allegion',

  lockset(fn: LockFunction): CatalogEntry | null {
    const e = ND_BY_FUNCTION[fn];
    if (!e) return null;
    return entry('lockset', e.sku, e.desc, 'Schlage');
  },

  exitDevice(ctx): CatalogEntry[] {
    // Von Duprin 99 series rim device; "F" prefix = fire exit (no dogging). DRAFT.
    const dev = ctx.fireExit ? 'F99' : '99';
    const items: CatalogEntry[] = [
      entry('exit-device', `${dev} EO`, `Von Duprin ${dev} rim exit device${ctx.fireExit ? ' (fire exit, no dogging)' : ''}`, 'Von Duprin'),
    ];
    if (ctx.outsideTrim === 'key-lever') {
      items.push(entry('exit-trim', '996L-NL', 'Von Duprin 996L night-latch lever trim (key retracts latch)', 'Von Duprin'));
    } else if (ctx.outsideTrim === 'lever') {
      items.push(entry('exit-trim', '996L', 'Von Duprin 996L passage lever trim', 'Von Duprin'));
    }
    // outsideTrim 'none' => exit-only, blank outside plate is part of the EO device.
    return items;
  },

  closer(opts): CatalogEntry | null {
    // LCN 4040XP heavy-duty hydraulic closer. DRAFT.
    const suffix = opts.faReleased ? ' SEM (smoke detector hold-open)' : '';
    const desc = `LCN 4040XP surface closer${opts.barrierFree ? ', adjusted to barrier-free force/timing' : ''}${suffix}`;
    return entry('closer', opts.faReleased ? '4040XP-SEM' : '4040XP', desc, 'LCN');
  },

  hinge(opts): CatalogEntry | null {
    // Ives 5-knuckle ball-bearing butt hinge, 4.5" x 4.5". DRAFT.
    if (opts.nonRemovablePin) return entry('hinges', '5BB1HW NRP', 'Ives 5BB1HW heavy-weight ball-bearing hinge, non-removable pin', 'Ives');
    if (opts.bearing) return entry('hinges', '5BB1', 'Ives 5BB1 ball-bearing butt hinge', 'Ives');
    return entry('hinges', '5PB1', 'Ives 5PB1 plain-bearing butt hinge', 'Ives');
  },

  kickPlate(): CatalogEntry {
    return entry('protection-plate', '8400 10" x 2" LDW', 'Ives 8400 kick plate, 10" high, .050" stainless', 'Ives');
  },

  stopHolder(type): CatalogEntry {
    if (type === 'overhead') return entry('stop-holder', '90 series', 'Glynn-Johnson 90-series overhead stop', 'Glynn-Johnson');
    return entry('stop-holder', 'WS407CCV', 'Ives WS407 concave wall stop', 'Ives');
  },

  flushBolt(opts): CatalogEntry {
    if (opts.auto) return entry('flush-bolt', 'FB31P / FB41P', 'Ives automatic/constant-latching flush bolts (fire pair)', 'Ives');
    return entry('flush-bolt', 'FB458', 'Ives FB458 manual flush bolt set', 'Ives');
  },

  coordinator(): CatalogEntry {
    return entry('coordinator', 'COR x FL', 'Ives COR bar-type coordinator with filler', 'Ives');
  },

  astragal(): CatalogEntry {
    return entry('astragal', '8800 series', 'Zero 8800-series overlapping astragal', 'Zero International');
  },

  gasketing(opts): CatalogEntry {
    if (opts.smoke) return entry('gasketing', '188S-BK', 'Zero 188S intumescent/smoke gasketing', 'Zero International');
    return entry('gasketing', '770A-PK', 'Zero 770A perimeter weatherstrip gasketing', 'Zero International');
  },

  doorSweep(): CatalogEntry {
    return entry('door-sweep', '39A', 'Zero 39A door sweep', 'Zero International');
  },

  threshold(): CatalogEntry {
    return entry('threshold', '545A', 'Zero 545A saddle threshold', 'Zero International');
  },

  silencer(): CatalogEntry {
    return entry('silencer', 'SR64', 'Ives SR64 rubber silencer (set)', 'Ives');
  },
};
