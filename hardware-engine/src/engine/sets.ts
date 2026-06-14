// ─── group: openings with identical resolved hardware collapse into one set (heading) ───

import type { HardwareItem, HardwareSet } from '../types.ts';

/** Order-independent signature of a resolved item list. Identical signatures => same set. */
export function signatureOf(items: HardwareItem[]): string {
  return items
    .map((i) => `${i.category}|${i.sku}|${i.finishBhma}|${i.qty}`)
    .sort()
    .join(';');
}

interface Resolved {
  openingNumber: string;
  items: HardwareItem[];
}

/**
 * Group resolved openings into hardware sets. Sets are numbered HW-1, HW-2 … in order of
 * first appearance, mirroring how a spec book assigns headings.
 */
export function groupIntoSets(resolved: Resolved[]): {
  sets: HardwareSet[];
  openingToSet: Record<string, string>;
} {
  const bySig = new Map<string, HardwareSet>();
  const openingToSet: Record<string, string> = {};
  const sets: HardwareSet[] = [];

  for (const r of resolved) {
    const sig = signatureOf(r.items);
    let set = bySig.get(sig);
    if (!set) {
      set = { id: `HW-${sets.length + 1}`, openingNumbers: [], items: r.items, signature: sig };
      bySig.set(sig, set);
      sets.push(set);
    }
    set.openingNumbers.push(r.openingNumber);
    openingToSet[r.openingNumber] = set.id;
  }

  return { sets, openingToSet };
}
