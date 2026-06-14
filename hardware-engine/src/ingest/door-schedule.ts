// ─── Ingestion (E4): door-schedule rows -> Opening[] ───
//
// A door/frame schedule gives geometry + material + fire label, but typically NOT the room
// function (the "HDW CODE" column is often blank — it is on the Westfield Landing schedule).
// Function (office/storeroom/stairwell/…) is what drives the hardware set, so it must be
// INFERRED from material + fire label + door width (pair vs single) + the location group, and
// flagged with a confidence so a human can review. This is the honest limit of schedule-only
// generation: high-confidence on rated common-area openings, low-confidence on suite interiors
// where only the room name (from the floor plan) truly disambiguates passage vs privacy.

import type { Opening, OpeningFunction, OccupancyGroup, DoorMaterial } from '../types.ts';

/** One row of an architectural door/frame schedule, as transcribed from the drawing. */
export interface ScheduleRow {
  number: string;
  /** Imperial leaf/opening width as written, e.g. `3'-2"`, `6'-4"`. */
  width: string;
  /** Imperial height as written, e.g. `7'-0"`. */
  height?: string;
  /** Door type code from the schedule (legend lives on the elevations — not always available). */
  type?: string | number;
  /** Schedule material code: HM, HMI (insulated), AL (aluminum storefront), SCW, MCD, OHI… */
  material: string;
  finish?: string;
  frameType?: string;
  /** Fire label in minutes; 0 / undefined = non-rated. */
  fireLabelMin?: number;
  /** Location band: 'Parkade', 'Ground', 'L2'…'L6', or 'Suite A'… */
  group: string;
  /** Room the door serves, from the floor plan (e.g. "Ensuite", "Bedroom 2", "Electrical").
   *  When present it drives a HIGH-confidence function — this is what resolves the suite
   *  passage-vs-privacy ambiguity that material+width alone cannot. */
  room?: string;
  notes?: string;
}

// Room-name → function keywords. Order matters: more specific rules first (bath before bedroom;
// ensuite matches bath, not the suite-entry rule).
const ROOM_RULES: { re: RegExp; function: OpeningFunction; exterior?: boolean }[] = [
  { re: /\b(bath|washroom|w\.?c\.?|en-?suite|powder|restroom|toilet)\b/i, function: 'restroom-single' },
  { re: /\b(stair|stairwell)\b/i, function: 'stairwell-exit' },
  { re: /(mech|mechanical|electrical|\belec\b|sprinkler|riser|telecom|comms?|server|\bit\b)/i, function: 'mechanical-electrical' },
  { re: /(janitor|storage|store-?\s?room|garbage|refuse|recycl|chute)/i, function: 'storeroom' },
  { re: /(closet|wardrobe|pantry|linen)/i, function: 'communicating' },
  { re: /(suite|unit|apartment|\bapt\b|dwelling).{0,12}(entry|entrance)|(entry|entrance).{0,12}(suite|unit)/i, function: 'entrance-staff' },
  { re: /(corridor|hallway|\bhall\b)/i, function: 'corridor-cross' },
  { re: /(vestibule|lobby|foyer|entrance|entry)/i, function: 'entrance-public' },
  { re: /(office|leasing|management|\bmgmt\b|amenity)/i, function: 'office' },
  { re: /(bed-?\s?room|bdrm|\bbr\b|\bden\b|study)/i, function: 'communicating' },
  { re: /(patio|balcony|terrace|deck)/i, function: 'exterior-service', exterior: true },
  { re: /(parkade|parking|garage)/i, function: 'storeroom' },
];

/** Map a floor-plan room label to a function, or null if no keyword matches. */
export function functionFromRoomLabel(label: string): { function: OpeningFunction; exterior: boolean } | null {
  for (const r of ROOM_RULES) if (r.re.test(label)) return { function: r.function, exterior: !!r.exterior };
  return null;
}

export type InferenceConfidence = 'high' | 'medium' | 'low';

export interface IngestResult {
  openings: Opening[];
  /** Rows the engine intentionally did not turn into architectural openings (e.g. overhead doors). */
  skipped: { row: ScheduleRow; reason: string }[];
  /** Per-opening inference trace, parallel to `openings`. */
  inference: { number: string; confidence: InferenceConfidence; notes: string }[];
}

/** Parse `6'-4"` → inches. Tolerant of stray spaces and missing inch mark. */
export function widthToInches(w: string): number | null {
  const m = w.match(/(\d+)\s*'\s*-?\s*(\d+)?/);
  if (!m) return null;
  const ft = parseInt(m[1]!, 10);
  const inch = m[2] ? parseInt(m[2], 10) : 0;
  return ft * 12 + inch;
}

function heightToMm(h: string | undefined): number | undefined {
  if (!h) return undefined;
  const inches = widthToInches(h);
  return inches == null ? undefined : Math.round(inches * 25.4);
}

/** NBC occupancy implied by the location band (coarse; refine from the project's occupancy plan). */
function groupOccupancy(group: string): OccupancyGroup | undefined {
  const g = group.toLowerCase();
  if (g.includes('parkade') || g.includes('garage')) return 'F3'; // storage garage (low-hazard)
  if (g.includes('suite')) return 'C';                            // residential
  if (/^l[2-6]|floor|level/.test(g)) return 'C';                  // residential floors
  if (g.includes('ground')) return 'D';                          // mixed lobby/commercial
  return undefined;
}

function normMaterial(mat: string): DoorMaterial | undefined {
  const m = mat.toUpperCase();
  if (m === 'HM' || m === 'HMI') return 'hollow-metal';
  if (m === 'AL') return 'aluminum';
  if (m === 'SCW' || m === 'MCD') return 'wood';
  return undefined;
}

/**
 * Infer the opening function from schedule-only fields. Returns null for rows that are not
 * architectural hardware sets (overhead doors).
 */
export function inferFunction(row: ScheduleRow): {
  function: OpeningFunction;
  exterior: boolean;
  confidence: InferenceConfidence;
  notes: string;
} | null {
  const mat = row.material.toUpperCase();
  const widthIn = widthToInches(row.width) ?? 36;
  const rated = (row.fireLabelMin ?? 0) > 0;
  const isPair = widthIn >= 60; // ~5'0"+ reads as a double opening
  const g = row.group.toLowerCase();
  const isSuite = g.includes('suite');

  // Overhead coiling/sectional doors are not an architectural hardware set.
  if (mat === 'OHI' || mat === 'OH') return null;

  // Floor-plan room label, when present, wins — HIGH confidence. This is what resolves the
  // suite passage-vs-privacy ambiguity that material+width cannot.
  if (row.room && row.room.trim()) {
    const fr = functionFromRoomLabel(row.room);
    if (fr) {
      const exterior = fr.exterior || mat === 'AL' || mat === 'HMI';
      return { function: fr.function, exterior, confidence: 'high', notes: `room "${row.room.trim()}" → ${fr.function}` };
    }
  }

  // Aluminum storefront = public entrance/vestibule.
  if (mat === 'AL') {
    const exterior = g.includes('ground') || g.includes('parkade');
    return { function: 'entrance-public', exterior, confidence: 'medium', notes: 'AL storefront → public entrance' };
  }

  // Suite doors.
  if (isSuite) {
    if (mat === 'SCW') {
      return { function: 'entrance-staff', exterior: false, confidence: 'high', notes: 'suite SCW entry → apartment entrance (self-closing, rated)' };
    }
    // MCD interior suite door: width disambiguates only weakly. Narrow → likely a bathroom
    // (privacy); otherwise passage. TRUE disambiguation needs the room name from the plan.
    if (widthIn <= 30) {
      return { function: 'restroom-single', exterior: false, confidence: 'low', notes: 'narrow MCD → likely bath (privacy); VERIFY room name' };
    }
    return { function: 'communicating', exterior: false, confidence: 'low', notes: 'MCD interior → passage; VERIFY room name (could be privacy/closet)' };
  }

  // Hollow-metal common-area openings.
  if (mat === 'HMI') {
    return { function: 'exterior-service', exterior: true, confidence: 'medium', notes: 'HMI insulated → exterior service door' };
  }
  if (mat === 'HM') {
    if (isPair && rated) {
      // Rated pair: a 90-min frame-A pair on residential floors reads as a stair-shaft door;
      // a 45-min pair reads as an elevator-lobby/cross-corridor smoke barrier.
      if ((row.fireLabelMin ?? 0) >= 90 || (row.frameType ?? '').toUpperCase() === 'A') {
        return { function: 'stairwell-exit', exterior: false, confidence: 'medium', notes: 'rated HM pair (90min/frame-A) → exit stair' };
      }
      return { function: 'corridor-cross', exterior: false, confidence: 'medium', notes: 'rated HM pair → cross-corridor smoke barrier' };
    }
    if (rated) {
      return { function: 'storeroom', exterior: false, confidence: 'medium', notes: 'rated HM single → service/mechanical (storeroom-locked)' };
    }
    return { function: 'utility-closet', exterior: false, confidence: 'low', notes: 'non-rated HM single → utility/closet; VERIFY' };
  }

  return { function: 'storeroom', exterior: false, confidence: 'low', notes: `unrecognised material "${row.material}" → storeroom default; VERIFY` };
}

/** Convert schedule rows into engine Openings, with an inference trace and a skip list. */
export function rowsToOpenings(rows: ScheduleRow[]): IngestResult {
  const openings: Opening[] = [];
  const skipped: IngestResult['skipped'] = [];
  const inference: IngestResult['inference'] = [];

  for (const row of rows) {
    const inf = inferFunction(row);
    if (!inf) {
      skipped.push({ row, reason: `${row.material} is not an architectural hardware set (overhead door)` });
      continue;
    }
    const widthIn = widthToInches(row.width) ?? 36;
    const opening: Opening = {
      number: row.number,
      function: inf.function,
      config: widthIn >= 60 ? 'pair' : 'single',
      fireRatingMinutes: (row.fireLabelMin ?? 0) as Opening['fireRatingMinutes'],
      barrierFree: inf.function === 'entrance-public', // public entrances on the barrier-free route
      exterior: inf.exterior,
      material: normMaterial(row.material),
      occupancyGroup: groupOccupancy(row.group),
      leafHeightMm: heightToMm(row.height),
      label: `${row.group} ${row.number}`,
    };
    openings.push(opening);
    inference.push({ number: row.number, confidence: inf.confidence, notes: inf.notes });
  }

  return { openings, skipped, inference };
}
