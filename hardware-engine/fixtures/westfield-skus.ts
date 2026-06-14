// ─── Fixture: Westfield Landing — real catalog numbers (NO PRICES) ───
//
// The catalog numbers observed on the Westfield Landing supplier quote, grouped by the engine
// concept each maps to. This is the SKU crosswalk the "LH" catalog line consumes (E4b).
//
// SUPPLIER PRICING IS DELIBERATELY NOT COMMITTED. Cost/list live only in the integrator's
// private price book (the platform pricing service / a local uncommitted file) and are loaded
// at runtime. SKUs (public catalog numbers) are fine to keep; supplier costs are not.

export const WESTFIELD_LH_SKUS = {
  lockset: {
    passage: 'LH3001-LOGAN',
    passageFireLatch: 'LH3001-LOGAN x UL 20 Min Latch',
    privacy: 'LH3022-LOGAN',
    storeroom: 'LH5007-L',
  },
  closer: {
    standard: 'LH816-REG',
    heavy: 'LH8016-REG',
    faHoldOpen: '351-EHT',
  },
  hinge: {
    nrp: 'LH179BB 4.5" x 4" - NRP',
    electric: 'LH191BB 4.5" x 4" - QC8',
  },
  exitDevice: {
    fireExitOnly: 'LH8810F x EXIT ONLY',
    exitOnly: '12-8710F x EXIT ONLY',
    electric: 'AD8410 x Exit Only',
  },
  flushBolt: {
    auto: 'LHFB610M',
  },
  gasketing: {
    perimeterSmoke: 'S88BL',
  },
  threshold: {
    saddle: '171A',
    thermalBreak: '273x 3 AFG',
    exteriorSeal: '312CR',
  },
  stopHolder: {
    wall: '409',
    overhead: '1-336',
  },
  // Belongs to the access-control module — engine only flags these.
  accessControl: {
    electricStrike: '1500C',
    doorPositionSwitch: 'DPS-W',
    deadlock: '2190-311-101',
    viewer: 'GSH199',
  },
} as const;
