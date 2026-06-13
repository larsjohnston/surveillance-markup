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

/** Common rated values (minutes). 0 = non-rated. */
export type FireRatingMinutes = 0 | 20 | 45 | 60 | 90 | 120 | 180;

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
  /** Door leaf height (mm) — drives hinge count. Defaults applied if absent. */
  leafHeightMm?: number;
  /** Single-leaf width (mm). Reserved for future plate sizing. */
  leafWidthMm?: number;
  material?: DoorMaterial;
  handing?: Handing;
  /** Electrified / on the access-control system. Engine only FLAGS this (ties to AC module). */
  accessControlled?: boolean;
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
