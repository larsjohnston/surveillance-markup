// ─── "LH" commodity catalog line (multifamily) — keyed to the Westfield Landing job ───
//
// The high-volume commodity line seen on a real Calgary multifamily quote: LH-prefixed locks/
// closers/hinges/exit, paired with Pemko seals (S88), Pemko threshold (171A), and a Rixson
// overhead stop (1-336). Catalog numbers are the real public SKUs; PRICES are NOT here (a
// catalog never carries pricing — that's the price book). Functions this residential line does
// not stock (office/classroom locks, kick plates, coordinators, silencers) return null so the
// resolver emits a loud TBD placeholder rather than inventing a SKU.

import type { CatalogLine, CatalogEntry } from './types.ts';
import { entry } from './types.ts';
import type { LockFunction } from '../types.ts';

const LH_LOCK: Partial<Record<LockFunction, { sku: string; desc: string }>> = {
  passage:   { sku: 'LH3001-LOGAN', desc: 'LH3001 passage set, Logan lever' },
  privacy:   { sku: 'LH3022-LOGAN', desc: 'LH3022 privacy set, Logan lever' },
  storeroom: { sku: 'LH5007-L', desc: 'LH5007 storeroom lockset, L lever' },
};

export const LH_COMMODITY: CatalogLine = {
  id: 'lh',
  label: 'LH multifamily commodity line (+ Pemko seals, Rixson stops)',
  manufacturer: 'LH',

  lockset(fn: LockFunction): CatalogEntry | null {
    const e = LH_LOCK[fn];
    return e ? entry('lockset', e.sku, e.desc, 'LH') : null;
  },

  exitDevice(ctx): CatalogEntry[] {
    // This job's exit devices are all exit-only (stair/service). Outside trim is not stocked.
    const sku = ctx.fireExit ? 'LH8810F x EXIT ONLY' : '12-8710F x EXIT ONLY';
    const items: CatalogEntry[] = [
      entry('exit-device', sku, `LH ${ctx.fireExit ? 'fire ' : ''}exit device, exit only`, 'LH'),
    ];
    if (ctx.outsideTrim !== 'none') {
      items.push(entry('exit-trim', 'TBD', 'LH outside trim not stocked on this line — VERIFY', 'LH'));
    }
    return items;
  },

  closer(opts): CatalogEntry | null {
    if (opts.faReleased) return entry('closer', '351-EHT', 'LH 351-EHT electric hold-open closer (FA release)', 'LH');
    return entry('closer', 'LH816-REG', `LH816 surface closer, regular arm${opts.barrierFree ? ' (barrier-free adjusted)' : ''}`, 'LH');
  },

  hinge(opts): CatalogEntry | null {
    return entry('hinges', 'LH179BB 4.5" x 4" - NRP', `LH179BB ball-bearing butt hinge${opts.nonRemovablePin ? ', non-removable pin' : ''}`, 'LH');
  },

  kickPlate(): CatalogEntry | null { return null; },           // not stocked on this line
  stopHolder(type): CatalogEntry | null {
    if (type === 'overhead') return entry('stop-holder', '1-336', 'Rixson 1-336 overhead stop', 'Rixson');
    return entry('stop-holder', '409', 'Rockwood 409 wall stop', 'Rockwood');
  },
  flushBolt(opts): CatalogEntry | null {
    return opts.auto ? entry('flush-bolt', 'LHFB610M', 'LH automatic flush bolt', 'LH') : null;
  },
  coordinator(): CatalogEntry | null { return null; },
  astragal(): CatalogEntry | null { return null; },
  gasketing(opts): CatalogEntry | null {
    return entry('gasketing', 'S88BL', `Pemko S88 ${opts.smoke ? 'smoke/perimeter' : 'perimeter'} seal`, 'Pemko');
  },
  doorSweep(): CatalogEntry | null { return null; },           // covered by the perimeter/exterior kit
  threshold(): CatalogEntry | null { return entry('threshold', '171A', 'Pemko 171A saddle threshold', 'Pemko'); },
  silencer(): CatalogEntry | null { return null; },
};
