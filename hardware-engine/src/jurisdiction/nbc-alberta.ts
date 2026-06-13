// ─── Jurisdiction ruleset: Alberta / National Building Code (NBC 2020) ───
//
// DRAFT. Every threshold below is a first-cut placeholder and MUST be verified against the
// actual NBC 2020 / Alberta Building Code / CAN-ULC-S104 / CSA B651 text before any output
// is quoted or stamped. Tags: `// VERIFY:` marks each value that needs code-text confirmation.
//
// The engine reads these as data so corrections are one-line edits, not logic rewrites.

export interface Jurisdiction {
  id: string;
  label: string;
  /** Occupant load at/above which a door in the means of egress needs panic/fire-exit hardware. */
  panicHardwareOccupantLoad: number;
  /** Max barrier-free opening force note (N) — carried as advisory text, not yet a calc. */
  barrierFreeMaxOpeningForceN: number;
  /** Min closer sweep time note (s) from 70deg to 3deg, barrier-free. */
  barrierFreeMinSweepSeconds: number;
  /** Hinge-count breakpoints by leaf height (mm): [maxHeight, hingeCount]. Ascending. */
  hingeBreakpointsMm: ReadonlyArray<readonly [number, number]>;
  /** Default leaf height (mm) when an opening omits it (standard commercial door ~2134mm = 7'0"). */
  defaultLeafHeightMm: number;
  /** Fire ratings (minutes) at/above which smoke gasketing is treated as required. */
  smokeGasketingMinRating: number;
}

export const NBC_ALBERTA: Jurisdiction = {
  id: 'ca-ab-nbc2020',
  label: 'Alberta / NBC 2020 (DRAFT)',
  // VERIFY: assembly/high-occupancy panic threshold. Common North-American figure is 50;
  // confirm the NBC/ABC value and the occupancy classes it applies to.
  panicHardwareOccupantLoad: 50,
  // VERIFY: barrier-free opening force for interior doors (CSA B651 / NBC 3.8). Placeholder.
  barrierFreeMaxOpeningForceN: 38,
  // VERIFY: closer sweep timing requirement.
  barrierFreeMinSweepSeconds: 3,
  // VERIFY: hinge counts. Convention: 2 to ~1525mm, 3 to ~2286mm, +1 per additional ~762mm.
  hingeBreakpointsMm: [
    [1525, 2],
    [2286, 3],
    [3048, 4],
  ],
  defaultLeafHeightMm: 2134,
  // VERIFY: smoke gasketing trigger. Treated as required on any rated opening in MVP.
  smokeGasketingMinRating: 20,
};

/** Hinge count for a leaf height under a jurisdiction's breakpoints. */
export function hingeCountForHeight(j: Jurisdiction, leafHeightMm: number): number {
  for (const [maxH, count] of j.hingeBreakpointsMm) {
    if (leafHeightMm <= maxH) return count;
  }
  // Above the largest breakpoint: extend the top rule by +1 per extra 762mm. VERIFY.
  const top = j.hingeBreakpointsMm[j.hingeBreakpointsMm.length - 1];
  if (!top) return 3;
  const [maxH, count] = top;
  return count + Math.ceil((leafHeightMm - maxH) / 762);
}

/** A door is fire/smoke rated. */
export function isRated(o: { fireRatingMinutes: number }): boolean {
  return o.fireRatingMinutes > 0;
}

/** Panic / fire-exit hardware is required by occupant load. */
export function needsPanicHardware(j: Jurisdiction, occupantLoad: number | undefined): boolean {
  return typeof occupantLoad === 'number' && occupantLoad >= j.panicHardwareOccupantLoad;
}
