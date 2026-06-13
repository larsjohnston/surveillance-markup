// ─── Fixture: Westfield Landing door schedule (transcribed subset) ───
//
// Transcribed by hand from the architectural DOOR AND FRAME SCHEDULE image. This is the
// common-area (non-repeating) set plus a few representative suite doors — enough to validate
// the engine against the real priced quote. NOT the full 100+-opening multifamily count
// (suites repeat per floor). Fields left blank on the schedule are omitted.
//
// Door-type legend (the elevation legend) was not provided, so the `type` code is carried but
// not relied on for inference; material + fire label + width + location drive the function.

import type { ScheduleRow } from '../src/ingest/door-schedule.ts';

export const WESTFIELD_COMMON: ScheduleRow[] = [
  // PARKADE
  { number: 'D007', width: `8'-6"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 60, group: 'Parkade' },
  { number: 'D009', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', group: 'Parkade', notes: '1' },
  { number: 'D001', width: `18'-0"`, height: `7'-0"`, type: 12, material: 'OHI', group: 'Parkade' },
  { number: 'D002', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 90, group: 'Parkade' },
  { number: 'D003', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'A', fireLabelMin: 60, group: 'Parkade', notes: '1' },
  { number: 'D004', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'A', fireLabelMin: 60, group: 'Parkade' },
  { number: 'D005', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'A', fireLabelMin: 90, group: 'Parkade' },
  { number: 'D006', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', group: 'Parkade' },
  { number: 'D008', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Parkade' },

  // GROUND FLOOR
  { number: 'D104', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Ground' },
  { number: 'D107', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', group: 'Ground', notes: '1' },
  { number: 'D109', width: `6'-4"`, height: `7'-0"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'Ground', notes: '1,2' },
  { number: 'D119', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Ground' },
  { number: 'D120', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Ground', notes: '1' },
  { number: 'D121', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', group: 'Ground', notes: '1' },
  { number: 'D100', width: `6'-4"`, height: `7'-5"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'Ground', notes: '1,2' },
  { number: 'D101', width: `6'-4"`, height: `7'-0"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'Ground', notes: '1' },
  { number: 'D102', width: `3'-2"`, height: `7'-0"`, type: 4, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Ground', notes: '1' },
  { number: 'D110', width: `6'-4"`, height: `7'-0"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'Ground', notes: '1' },
  { number: 'D111', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'Ground' },
  { number: 'D112', width: `3'-4"`, height: `7'-0"`, type: 2, material: 'HMI', frameType: 'B', group: 'Ground' },
  { number: 'D113', width: `3'-4"`, height: `7'-0"`, type: 2, material: 'HMI', frameType: 'B', group: 'Ground' },
  { number: 'D114', width: `3'-4"`, height: `7'-0"`, type: 2, material: 'HMI', frameType: 'B', group: 'Ground' },
  { number: 'D115', width: `3'-4"`, height: `7'-0"`, type: 2, material: 'HMI', frameType: 'B', group: 'Ground' },
  { number: 'D116', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', group: 'Ground' },
  { number: 'D117', width: `3'-2"`, height: `7'-0"`, type: 2, material: 'HM', frameType: 'B', fireLabelMin: 60, group: 'Ground' },
  { number: 'D118', width: `18'-0"`, height: `7'-0"`, type: 12, material: 'OHI', group: 'Ground' },
  { number: 'D122', width: `6'-0"`, height: `7'-0"`, type: 7, material: 'HM', frameType: 'A', fireLabelMin: 90, group: 'Ground', notes: '1,3' },

  // 2ND FLOOR
  { number: 'D202', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L2' },
  { number: 'D203', width: `6'-4"`, height: `7'-0"`, type: 7, material: 'HM', frameType: 'A', group: 'L2', notes: '1' },
  { number: 'D207', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L2', notes: '1' },
  { number: 'D218', width: `3'-0"`, height: `7'-1"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'L2' },
  { number: 'D219', width: `3'-0"`, height: `7'-1"`, type: 5, material: 'AL', finish: 'CL.AN', group: 'L2' },
  { number: 'D205', width: `6'-4"`, height: `7'-0"`, type: 7, material: 'HM', frameType: 'A', fireLabelMin: 90, group: 'L2', notes: '1,3' },
  { number: 'D206', width: `3'-2"`, height: `7'-0"`, type: 4, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L2', notes: '1' },
  { number: 'D211', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L2' },
  { number: 'D217', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L2' },

  // TYPICAL UPPER FLOOR (3rd shown; 4–6 repeat the same five marks)
  { number: 'D300', width: `6'-4"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L3', notes: '1' },
  { number: 'D303', width: `3'-2"`, height: `7'-0"`, type: 1, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L3' },
  { number: 'D305', width: `6'-4"`, height: `7'-0"`, type: 7, material: 'HM', frameType: 'A', fireLabelMin: 90, group: 'L3', notes: '1,3' },
  { number: 'D311', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L3' },
  { number: 'D317', width: `3'-2"`, height: `7'-0"`, type: 3, material: 'HM', frameType: 'B', fireLabelMin: 45, group: 'L3' },
];

// Representative suite doors (Suite A1&A2 leaf set). These repeat across ~100 units; the engine
// generates ONE set per distinct profile and the BOM multiplies by unit count.
export const WESTFIELD_SUITE_A: ScheduleRow[] = [
  { number: 'A1', width: `3'-2"`, height: `7'-0"`, type: 8, material: 'SCW', frameType: 'B', fireLabelMin: 45, group: 'Suite A' },
  { number: 'B1', width: `3'-0"`, height: `6'-8"`, type: 9, material: 'MCD', frameType: 'C', group: 'Suite A' },
  { number: 'B2', width: `2'-6"`, height: `6'-8"`, type: 9, material: 'MCD', frameType: 'C', group: 'Suite A' },
  { number: 'C3', width: `3'-0"`, height: `6'-8"`, type: 10, material: 'MCD', frameType: 'C', group: 'Suite A' },
  { number: 'C5', width: `4'-0"`, height: `6'-8"`, type: 11, material: 'MCD', frameType: 'C', group: 'Suite A' },
  { number: 'D1', width: `2'-6"`, height: `6'-8"`, type: 9, material: 'MCD', frameType: 'C', group: 'Suite A' },
];
