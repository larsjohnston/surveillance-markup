// ─── Architectural Hardware Engine — Core Domain Types ───
//
// DOM-free, zero-dependency. Union types (not `enum`) so the file runs under Node's
// strip-only TypeScript loader and ports cleanly into the SaaS.

/** A door-schedule opening: room use drives most of the spec. */
export type OpeningFunction =
  | 'entrance-public'      // main public entry, often exterior, often exit device
  | 'entrance-staff'       // staff/back entry, locked outside, free egress
  | 'office'               // office/entry lock: locked or unlocked outside, free egress
  | 'storeroom'            // always-locked outside, key retracts latch, free egress
  | 'classroom'            // locked/unlocked outside by key; free egress
  | 'classroom-security'   // lockable from inside (intruder) — flagged, not fully specced in MVP
  | 'restroom-single'      // single-occupant: privacy with emergency release
  | 'restroom-multi'       // multi-occupant: push/pull, no lock
  | 'stairwell-exit'       // egress stair door, usually fire-rated, controlled re-entry
  | 'corridor-cross'       // cross-corridor smoke/fire pair, hold-open on FA
  | 'communicating'        // between two rooms; passage/latch
  | 'mechanical-electrical'// equipment room: storeroom-locked, often fire-rated
  | 'utility-closet'       // small locked closet: storeroom function
  | 'exterior-service'     // exterior service/mechanical door, weatherized, locked
  | 'exit-only';           // exit device, no outside trim (dummy/blank plate outside)

export type DoorConfig = 'single' | 'pair';

export type DoorMaterial = 'hollow-metal' | 'wood' | 'aluminum' | 'glass';

export type Handing = 'LH' | 'RH' | 'LHR' | 'RHR';

/** Latchset construction style. Cylindrical (bored) is the commercial default; mortise is the upgrade. */
export type LockStyle = 'cylindrical' | 'mortise';

/**
 * Architect/AHC pre-assigned hardware intent, injected per opening to OVERRIDE the room-use
 * default. Code overlays (fire, egress, barrier-free) still layer on top — the preset only
 * seeds the base latching choice, it does not bypass safety.
 */
export interface FunctionPreset {
  lockFunction?: LockFunction;
  exitDevice?: boolean;
}

/** Common rated values (minutes). 0 = non-rated. */
export type FireRatingMinutes = 0 | 20 | 45 | 60 | 90 | 120 | 180;

/**
 * NBC major occupancy classification of the floor area the opening serves. Drives the precise
 * panic-hardware scope (NBC 3.4.6.16 ties it to assembly + high-hazard industrial). Omit it
 * and the engine falls back to a conservative raw-occupant-load trigger.
 *   A* Assembly · B* Care/Detention · C Residential · D Business · E Mercantile · F* Industrial
 */
export type OccupancyGroup =
  | 'A1' | 'A2' | 'A3' | 'A4'
  | 'B1' | 'B2' | 'B3'
  | 'C'
  | 'D'
  | 'E'
  | 'F1' | 'F2' | 'F3';

export interface Opening {
  /** Schedule mark, e.g. "101A". Unique within a project. */
  number: string;
  function: OpeningFunction;
  config: DoorConfig;
  fireRatingMinutes: FireRatingMinutes;
  /** On a barrier-free / accessible route, or otherwise required to be accessible. */
  barrierFree: boolean;
  /** Exposed to weather on one side. */
  exterior: boolean;
  /** Occupant load served by the opening (drives panic-hardware threshold). Optional. */
  occupantLoad?: number;
  /** NBC major occupancy of the served floor area; refines the panic-hardware scope. Optional. */
  occupancyGroup?: OccupancyGroup;
  /** Door leaf height (mm) — drives hinge count. Defaults applied if absent. */
  leafHeightMm?: number;
  /** Single-leaf width (mm). Reserved for future plate sizing. */
  leafWidthMm?: number;
  material?: DoorMaterial;
  handing?: Handing;
  /** Electrified / on the access-control system. Engine only FLAGS this (ties to AC module). */
  accessControlled?: boolean;
  /** Latchset style override for this opening (else the project default). */
  lockStyle?: LockStyle;
  /** Pre-assigned hardware intent that overrides the room-use default (code overlays still apply). */
  functionPreset?: FunctionPreset;
  /** Free-text label for the opening / room, carried through to output for context. */
  label?: string;
}

// ─── Manufacturer-agnostic requirement profile (output of `derive`) ───

/** Normalised lock/latch function tokens (loosely ANSI/BHMA F-series intent). */
export type LockFunction =
  | 'passage'        // F01 — no lock, latch only
  | 'privacy'        // F19/F22 — bath/bedroom, emergency release outside
  | 'office'         // F04/F82 — entry/office, push-button or key
  | 'storeroom'      // F07/F86 — always locked outside, key retracts latch
  | 'classroom'      // F05/F84 — outside locked/unlocked by key
  | 'institution'    // F30 — locked both sides, key both sides (flag)
  | 'exit-only-trim' // no outside operating trim
  | 'dummy';         // pull only, no latch

export type ExitDeviceType = 'rim' | 'surface-vertical-rod' | 'mortise' | 'concealed-vertical-rod';

export type LatchingRequirement =
  | { kind: 'lockset'; lockFunction: LockFunction; reasons: string[] }
  | { kind: 'exit-device'; device: ExitDeviceType; outsideTrim: 'none' | 'lever' | 'key-lever'; fireExit: boolean; reasons: string[] }
  | { kind: 'push-pull'; reasons: string[] };

export interface CloserRequirement {
  required: boolean;
  /** Mechanical hold-open is permitted (false on fire/smoke openings). */
  holdOpenAllowed: boolean;
  /** Closer must be released by the fire-alarm system (electromagnetic hold-open). */
  faReleased: boolean;
  /** Bounded opening force / timed sweep+latch required (barrier-free). */
  barrierFreeAdjust: boolean;
  reasons: string[];
}

export interface HingeRequirement {
  count: number;
  nonRemovablePin: boolean;   // exterior / out-swinging secure side
  bearing: boolean;           // closer present or heavy/exterior
  reasons: string[];
}

export interface ProtectionRequirement {
  kickPlate: boolean;
  reasons: string[];
}

export interface StopHolderRequirement {
  /** 'wall' | 'overhead' | 'none'. Overhead when wall stop impractical or hold-open wanted. */
  type: 'wall' | 'overhead' | 'none';
  reasons: string[];
}

export interface SealsRequirement {
  weatherstrip: boolean;   // exterior perimeter gasketing
  sweep: boolean;          // door bottom sweep (exterior)
  threshold: boolean;      // exterior threshold
  smokeGasketing: boolean; // fire/smoke openings
  reasons: string[];
}

export interface PairHardwareRequirement {
  applies: boolean;        // config === 'pair'
  flushBolts: boolean;     // inactive leaf bolting
  autoFlushBolts: boolean; // fire-rated pair forces auto/constant-latching bolts
  coordinator: boolean;    // ensures inactive leaf closes first
  astragal: boolean;       // overlapping/meeting-stile seal
  reasons: string[];
}

export interface RequirementProfile {
  opening: Opening;
  latching: LatchingRequirement;
  closer: CloserRequirement;
  hinges: HingeRequirement;
  protection: ProtectionRequirement;
  stopHolder: StopHolderRequirement;
  seals: SealsRequirement;
  pair: PairHardwareRequirement;
  silencers: boolean;      // hollow-metal frame, non-gasketed
  /** Engine-level advisories that aren't a single component (e.g. AC handoff). */
  advisories: string[];
}

// ─── Resolved hardware (output of `resolve`) ───

export type HardwareCategory =
  | 'hinges'
  | 'lockset'
  | 'exit-device'
  | 'exit-trim'
  | 'closer'
  | 'protection-plate'
  | 'stop-holder'
  | 'flush-bolt'
  | 'coordinator'
  | 'astragal'
  | 'gasketing'
  | 'door-sweep'
  | 'threshold'
  | 'silencer';

export interface HardwareItem {
  category: HardwareCategory;
  /** Manufacturer catalog number — DRAFT/illustrative until reconciled to the price book. */
  sku: string;
  description: string;
  /** BHMA finish code, e.g. 626 (satin chrome), 630 (satin stainless), 689 (aluminum). */
  finishBhma: string;
  qty: number;
  /** Product line within the manufacturer family (Schlage, Von Duprin, LCN, Ives, …). */
  line: string;
  reasons: string[];
  /** True while the catalog datum is unverified. Always true in the MVP. */
  draft: boolean;
}

export interface HardwareSet {
  id: string;             // "HW-1", "HW-2" …
  openingNumbers: string[];
  items: HardwareItem[];
  /** Stable hash of the resolved item list — identical signatures collapse into one set. */
  signature: string;
}

export interface GenerateResult {
  sets: HardwareSet[];
  /** opening number -> set id */
  openingToSet: Record<string, string>;
  /** Per-opening derived requirement profiles, for inspection / UI editing. */
  profiles: RequirementProfile[];
}

// ─── Pricing join (E3) ───
//
// The engine stays pure: it consumes an injected price book (sku -> cost/list). Real data
// comes from the platform pricing service (pricing_items; unit_cost server-only) — this layer
// just joins and rolls up. Unpriced items are FLAGGED, never silently zeroed.

export interface PriceEntry {
  /** Supplier/replacement cost (margin basis). */
  cost?: number;
  /** List / MSRP (discount basis). */
  list?: number;
}

export type PriceBook = Record<string, PriceEntry>;

/** Sell derivation. discount = off list (platform default); markup = on cost. */
export interface PricingRule {
  mode: 'markup' | 'discount';
  /** Percent. markup 40 => cost x1.40; discount 25 => list x0.75. */
  value: number;
}

export interface PricedItem extends HardwareItem {
  unitCost: number | null;
  unitList: number | null;
  unitSell: number | null;
  extCost: number | null;   // unitCost x qty
  extSell: number | null;   // unitSell x qty
  /** True when a customer sell price could be derived. */
  priced: boolean;
}

export interface PricedSet {
  id: string;
  openingNumbers: string[];
  signature: string;
  items: PricedItem[];
  setCost: number;          // sum of known extCost
  setSell: number;          // sum of known extSell
  unpricedCount: number;    // items with priced === false
}

export interface PricedResult {
  sets: PricedSet[];
  openingToSet: Record<string, string>;
  grandCost: number;
  grandSell: number;
  unpricedCount: number;
}
