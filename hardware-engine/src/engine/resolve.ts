// ─── resolve: RequirementProfile + CatalogLine -> HardwareItem[] ───

import type { RequirementProfile, HardwareItem, HardwareCategory } from '../types.ts';
import type { CatalogLine, CatalogEntry } from '../catalog/types.ts';

/** BHMA finish codes by category and environment. DRAFT defaults; override per project. */
export interface FinishPolicy {
  interior: Partial<Record<HardwareCategory, string>>;
  exterior: Partial<Record<HardwareCategory, string>>;
  fallback: string;
}

export const DEFAULT_FINISH: FinishPolicy = {
  interior: {
    hinges: '652',            // satin chrome plated steel
    lockset: '626',           // satin chrome
    'exit-device': '626',
    'exit-trim': '626',
    closer: '689',            // aluminum painted
    'protection-plate': '630',// satin stainless
    'stop-holder': '626',
    'flush-bolt': '626',
    coordinator: '600',       // primed
    astragal: 'AL',
    gasketing: 'AL',
    'door-sweep': 'AL',
    threshold: 'AL',
    silencer: 'GRY',
  },
  exterior: {
    hinges: '630',            // satin stainless (corrosion)
    lockset: '630',
    'exit-device': '630',
    'exit-trim': '630',
    closer: '630',
    'protection-plate': '630',
    'stop-holder': '630',
  },
  fallback: '626',
};

function finishFor(policy: FinishPolicy, category: HardwareCategory, exterior: boolean): string {
  if (exterior && policy.exterior[category]) return policy.exterior[category] as string;
  return policy.interior[category] ?? policy.fallback;
}

function toItem(
  e: CatalogEntry,
  qty: number,
  reasons: string[],
  policy: FinishPolicy,
  exterior: boolean,
): HardwareItem {
  return {
    category: e.category,
    sku: e.sku,
    description: e.description,
    finishBhma: finishFor(policy, e.category, exterior),
    qty,
    line: e.line,
    reasons,
    draft: true,
  };
}

/** Loud placeholder when a catalog line doesn't seed a required item. */
function tbdItem(category: HardwareCategory, reasons: string[], note: string): HardwareItem {
  return {
    category,
    sku: 'TBD',
    description: `UNSEEDED: ${note} — catalog line has no entry (resolve manually)`,
    finishBhma: '',
    qty: 1,
    line: '(none)',
    reasons,
    draft: true,
  };
}

export function resolveItems(
  profile: RequirementProfile,
  catalog: CatalogLine,
  policy: FinishPolicy = DEFAULT_FINISH,
): HardwareItem[] {
  const items: HardwareItem[] = [];
  const exterior = profile.opening.exterior;
  const leaves = profile.pair.applies ? 2 : 1;
  const push = (e: CatalogEntry | null, qty: number, reasons: string[], cat: HardwareCategory, note: string) => {
    if (e) items.push(toItem(e, qty, reasons, policy, exterior));
    else items.push(tbdItem(cat, reasons, note));
  };

  // Hinges (per leaf × leaves).
  push(
    catalog.hinge({ bearing: profile.hinges.bearing, nonRemovablePin: profile.hinges.nonRemovablePin }),
    profile.hinges.count * leaves,
    profile.hinges.reasons,
    'hinges',
    'hinges',
  );

  // Latching.
  if (profile.latching.kind === 'lockset') {
    push(catalog.lockset(profile.latching.lockFunction), 1, profile.latching.reasons, 'lockset', `${profile.latching.lockFunction} lockset`);
  } else if (profile.latching.kind === 'exit-device') {
    const evItems = catalog.exitDevice({
      device: profile.latching.device,
      outsideTrim: profile.latching.outsideTrim,
      fireExit: profile.latching.fireExit,
    });
    if (evItems.length === 0) items.push(tbdItem('exit-device', profile.latching.reasons, 'exit device'));
    for (const e of evItems) items.push(toItem(e, 1, profile.latching.reasons, policy, exterior));
  }
  // push-pull: no latching item (push plate/pull handled by protection in a later pass).

  // Closer (per leaf for pairs).
  if (profile.closer.required) {
    push(
      catalog.closer({ barrierFree: profile.closer.barrierFreeAdjust, faReleased: profile.closer.faReleased }),
      leaves,
      profile.closer.reasons,
      'closer',
      'closer',
    );
  }

  // Protection.
  if (profile.protection.kickPlate) {
    push(catalog.kickPlate(), leaves, profile.protection.reasons, 'protection-plate', 'kick plate');
  }

  // Stop / holder (active leaf).
  if (profile.stopHolder.type !== 'none') {
    push(catalog.stopHolder(profile.stopHolder.type), 1, profile.stopHolder.reasons, 'stop-holder', `${profile.stopHolder.type} stop`);
  }

  // Pair hardware.
  if (profile.pair.applies) {
    push(catalog.flushBolt({ auto: profile.pair.autoFlushBolts }), 1, profile.pair.reasons, 'flush-bolt', 'flush bolts');
    if (profile.pair.coordinator) push(catalog.coordinator(), 1, profile.pair.reasons, 'coordinator', 'coordinator');
    if (profile.pair.astragal) push(catalog.astragal(), 1, profile.pair.reasons, 'astragal', 'astragal');
  }

  // Seals.
  if (profile.seals.weatherstrip || profile.seals.smokeGasketing) {
    push(
      catalog.gasketing({ smoke: profile.seals.smokeGasketing && !profile.seals.weatherstrip }),
      1,
      profile.seals.reasons,
      'gasketing',
      'gasketing',
    );
  }
  if (profile.seals.sweep) push(catalog.doorSweep(), 1, profile.seals.reasons, 'door-sweep', 'door sweep');
  if (profile.seals.threshold) push(catalog.threshold(), 1, profile.seals.reasons, 'threshold', 'threshold');

  // Silencers.
  if (profile.silencers) push(catalog.silencer(), 1, ['hollow-metal frame, non-gasketed'], 'silencer', 'silencer');

  return items;
}
