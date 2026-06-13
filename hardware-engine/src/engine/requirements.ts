// ─── derive: Opening + Jurisdiction -> RequirementProfile ───
//
// Function defaults first, then code overlays (fire, barrier-free, egress, environment,
// pair-config). Each overlay APPENDS to reasons[] so the output is fully traceable.

import type {
  Opening,
  OpeningFunction,
  RequirementProfile,
  LatchingRequirement,
  LockFunction,
  FunctionPreset,
} from '../types.ts';
import {
  type Jurisdiction,
  hingeCountForHeight,
  isRated,
  needsPanicHardware,
} from '../jurisdiction/nbc-alberta.ts';

interface FunctionDefault {
  lock?: LockFunction;
  exitDevice?: boolean;
  pushPull?: boolean;
  outsideTrim?: 'none' | 'lever' | 'key-lever';
  closer: boolean;
  kickPlate: boolean;
  stopHolder: 'wall' | 'overhead' | 'none';
}

// Function -> base hardware intent (pre-code). Lever operation assumed throughout (catalog
// is lever-only), satisfying barrier-free operability by default.
const FUNCTION_DEFAULTS: Record<OpeningFunction, FunctionDefault> = {
  'entrance-public':       { exitDevice: true, outsideTrim: 'key-lever', closer: true,  kickPlate: true,  stopHolder: 'overhead' },
  'entrance-staff':        { lock: 'storeroom',  closer: true,  kickPlate: true,  stopHolder: 'wall' },
  'office':                { lock: 'office',     closer: false, kickPlate: false, stopHolder: 'wall' },
  'storeroom':             { lock: 'storeroom',  closer: false, kickPlate: false, stopHolder: 'wall' },
  'classroom':             { lock: 'classroom',  closer: false, kickPlate: false, stopHolder: 'wall' },
  'classroom-security':    { lock: 'classroom',  closer: false, kickPlate: false, stopHolder: 'wall' },
  'restroom-single':       { lock: 'privacy',    closer: true,  kickPlate: true,  stopHolder: 'wall' },
  'restroom-multi':        { pushPull: true,     closer: true,  kickPlate: true,  stopHolder: 'wall' },
  'stairwell-exit':        { exitDevice: true, outsideTrim: 'key-lever', closer: true,  kickPlate: false, stopHolder: 'wall' },
  'corridor-cross':        { lock: 'passage',    closer: true,  kickPlate: false, stopHolder: 'overhead' },
  'communicating':         { lock: 'passage',    closer: false, kickPlate: false, stopHolder: 'wall' },
  'mechanical-electrical': { lock: 'storeroom',  closer: true,  kickPlate: false, stopHolder: 'wall' },
  'utility-closet':        { lock: 'storeroom',  closer: false, kickPlate: false, stopHolder: 'wall' },
  'exterior-service':      { lock: 'storeroom',  closer: true,  kickPlate: true,  stopHolder: 'overhead' },
  'exit-only':             { exitDevice: true, outsideTrim: 'none',     closer: true,  kickPlate: false, stopHolder: 'wall' },
};

function baseLatching(def: FunctionDefault, preset?: FunctionPreset): LatchingRequirement {
  // Architect/AHC pre-assigned intent wins over the room-use default (code overlays apply later).
  if (preset?.exitDevice) {
    return {
      kind: 'exit-device',
      device: 'rim',
      outsideTrim: def.outsideTrim ?? 'key-lever',
      fireExit: false,
      reasons: ['pre-assigned: exit device'],
    };
  }
  if (preset?.lockFunction) {
    return { kind: 'lockset', lockFunction: preset.lockFunction, reasons: [`pre-assigned: ${preset.lockFunction} function`] };
  }
  if (def.pushPull) return { kind: 'push-pull', reasons: ['function default: no locking required'] };
  if (def.exitDevice) {
    return {
      kind: 'exit-device',
      device: 'rim',
      outsideTrim: def.outsideTrim ?? 'none',
      fireExit: false,
      reasons: ['function default: exit device'],
    };
  }
  return {
    kind: 'lockset',
    lockFunction: def.lock ?? 'passage',
    reasons: [`function default: ${def.lock ?? 'passage'} function`],
  };
}

export function deriveRequirements(opening: Opening, j: Jurisdiction): RequirementProfile {
  const def = FUNCTION_DEFAULTS[opening.function];
  const rated = isRated(opening);
  const heightMm = opening.leafHeightMm ?? j.defaultLeafHeightMm;
  const advisories: string[] = [];

  let latching = baseLatching(def, opening.functionPreset);

  const closer = {
    required: def.closer,
    holdOpenAllowed: !rated,
    faReleased: false,
    barrierFreeAdjust: false,
    reasons: def.closer ? ['function default: door control'] : [] as string[],
  };

  const hinges = {
    count: hingeCountForHeight(j, heightMm),
    nonRemovablePin: false,
    bearing: false,
    reasons: [`hinge count for ${heightMm}mm leaf`],
  };

  const protection = {
    kickPlate: def.kickPlate,
    reasons: def.kickPlate ? ['function default: high-traffic protection'] : [] as string[],
  };

  const stopHolder = {
    type: def.stopHolder,
    reasons: def.stopHolder !== 'none' ? ['function default'] : [] as string[],
  };

  const seals = {
    weatherstrip: false,
    sweep: false,
    threshold: false,
    smokeGasketing: false,
    reasons: [] as string[],
  };

  const pair = {
    applies: opening.config === 'pair',
    flushBolts: false,
    autoFlushBolts: false,
    coordinator: false,
    astragal: false,
    reasons: [] as string[],
  };

  // ── Overlay: pair configuration ──
  if (pair.applies) {
    pair.flushBolts = true;
    pair.coordinator = true;
    pair.astragal = true;
    pair.reasons.push('pair opening: bolt inactive leaf, coordinate closing, seal meeting stiles');
  }

  // ── Overlay: fire / smoke rating ──
  if (rated) {
    closer.required = true;
    closer.holdOpenAllowed = false;
    if (closer.reasons.length === 0) closer.reasons.push('NBC: fire door must be self-closing');
    else closer.reasons.push('NBC: fire door self-closing required');

    // Positive latching: a fire door cannot be push/pull (no latch).
    if (latching.kind === 'push-pull') {
      latching = { kind: 'lockset', lockFunction: 'passage', reasons: ['NBC: fire door requires positive latching (upgraded from push/pull)'] };
    } else if (latching.kind === 'exit-device') {
      latching = { ...latching, fireExit: true, reasons: [...latching.reasons, 'NBC: fire exit hardware (no mechanical dogging)'] };
    } else {
      latching = { ...latching, reasons: [...latching.reasons, 'NBC: positive latching required'] };
    }

    seals.smokeGasketing = opening.fireRatingMinutes >= j.smokeGasketingMinRating;
    if (seals.smokeGasketing) seals.reasons.push('NBC/CAN-ULC: smoke gasketing on rated opening');

    hinges.bearing = true;
    hinges.reasons.push('rated opening: ball-bearing, steel, listed hinges');

    // A door designed to be held open (cross-corridor) must release on the fire alarm.
    if (opening.function === 'corridor-cross') {
      closer.faReleased = true;
      closer.reasons.push('NBC: hold-open permitted only if released by fire-alarm system');
    } else if (stopHolder.type === 'overhead') {
      // No mechanical hold-open on a rated door; demote a holder to a plain stop.
      stopHolder.reasons.push('rated opening: mechanical hold-open not permitted (stop only)');
    }

    if (pair.applies) {
      pair.autoFlushBolts = true;
      pair.reasons.push('NBC: rated pair requires auto/constant-latching flush bolts + fire-pin coordinator');
    }
  }

  // ── Overlay: barrier-free / accessibility ──
  if (opening.barrierFree) {
    closer.required = true;
    closer.barrierFreeAdjust = true;
    const maxForce = opening.exterior ? j.barrierFreeMaxOpeningForceExteriorN : j.barrierFreeMaxOpeningForceInteriorN;
    closer.reasons.push(`NBC 3.8.3.6: max ${maxForce} N opening force, >= ${j.barrierFreeMinSweepSeconds}s closing period`);
    if (latching.kind === 'lockset') {
      latching.reasons.push('barrier-free: lever operation (no knob)');
    }
  }

  // ── Overlay: egress -> panic / fire-exit hardware (NBC 3.4.6.16, occupancy-aware) ──
  const panic = needsPanicHardware(j, {
    occupantLoad: opening.occupantLoad,
    occupancyGroup: opening.occupancyGroup,
    function: opening.function,
  });
  if (panic.required) {
    if (latching.kind === 'lockset') {
      const outsideTrim = opening.function === 'exit-only' ? 'none' : 'key-lever';
      latching = { kind: 'exit-device', device: 'rim', outsideTrim, fireExit: rated, reasons: [panic.reason] };
    } else if (latching.kind === 'push-pull') {
      latching = { kind: 'exit-device', device: 'rim', outsideTrim: 'none', fireExit: rated, reasons: [panic.reason] };
    } else {
      latching.reasons.push(panic.reason);
    }
  }

  // ── Overlay: exterior environment ──
  if (opening.exterior) {
    seals.weatherstrip = true;
    seals.sweep = true;
    seals.threshold = true;
    seals.reasons.push('exterior: perimeter weatherstrip, door sweep, threshold');
    hinges.nonRemovablePin = true;
    hinges.bearing = true;
    hinges.reasons.push('exterior: non-removable-pin, sealed-bearing hinges');
    closer.required = true;
    if (!closer.reasons.some((r) => r.includes('exterior'))) closer.reasons.push('exterior: door control');
  }

  // ── Silencers: hollow-metal frame, non-gasketed ──
  const gasketed = seals.weatherstrip || seals.smokeGasketing;
  const silencers = (opening.material === 'hollow-metal' || opening.material === undefined) && !gasketed;

  // ── Advisories (non-component) ──
  if (opening.function === 'classroom-security') {
    advisories.push('classroom-security: verify lockdown method (intruder function / lockset choice) — not fully specced in MVP');
  }
  if (opening.accessControlled) {
    advisories.push('access-controlled opening: coordinate electrified hardware, power transfer, and request-to-exit with the access-control module (out of engine scope)');
  }

  return { opening, latching, closer, hinges, protection, stopHolder, seals, pair, silencers, advisories };
}
