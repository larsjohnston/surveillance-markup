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
  /**
   * Occupant load ABOVE which an exit door needs panic/fire-exit hardware.
   * NBC 3.4.6.16: > 100 for a floor area containing an assembly occupancy, doors to/from
   * exit stair shafts in buildings > 100, and high-hazard industrial. NOTE: NBC ties this to
   * OCCUPANCY CLASS (assembly), which the MVP does not yet model — see needsPanicHardware.
   */
  panicHardwareOccupantLoad: number;
  /** Max barrier-free opening force, INTERIOR doors (N). NBC 3.8.3.6. */
  barrierFreeMaxOpeningForceInteriorN: number;
  /** Max barrier-free opening force, EXTERIOR doors (N). NBC 3.8.3.6. */
  barrierFreeMaxOpeningForceExteriorN: number;
  /** Max latch-release force in the direction of egress travel (N). NBC 3.4.6.16. */
  latchReleaseForceN: number;
  /** Min closer closing period (s), barrier-free. NBC 3.8.3.6. */
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
  label: 'Alberta / NBC 2020 (sourced; VERIFY against official code text)',
  // NBC 3.4.6.16 — assembly-occupancy floor areas + exit-stair-shaft doors > 100. The MVP
  // applies this on raw occupant load (no occupancy-class model yet) — SCOPE: refine in E3.
  panicHardwareOccupantLoad: 100,
  // NBC 3.8.3.6 — barrier-free manual opening force.
  barrierFreeMaxOpeningForceInteriorN: 22,
  barrierFreeMaxOpeningForceExteriorN: 38,
  // NBC 3.4.6.16 — latch-release force in direction of egress travel.
  latchReleaseForceN: 90,
  // NBC 3.8.3.6 — minimum closing period.
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

/**
 * Panic / fire-exit hardware is required by occupant load (NBC 3.4.6.16: "more than 100").
 * SCOPE: NBC further restricts this to assembly occupancies + exit-stair-shaft doors; the MVP
 * has no occupancy-class model, so it applies the threshold on raw occupant load. Refine in E3.
 */
export function needsPanicHardware(j: Jurisdiction, occupantLoad: number | undefined): boolean {
  return typeof occupantLoad === 'number' && occupantLoad > j.panicHardwareOccupantLoad;
}
