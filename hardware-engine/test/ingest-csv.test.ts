import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScheduleCsv,
  parseFireLabel,
  functionFromRoomLabel,
  inferFunction,
  rowsToOpenings,
  generateHardwareSets,
  widthToInches,
} from '../src/index.ts';

// Build CSV safely (the inch mark " is the CSV quote char — must be escaped).
const f = (s: string) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
const line = (a: string[]) => a.map(f).join(',');

const HEADER = ['DR. NO', 'WIDTH', 'HEIGHT', 'THICK', 'TYPE', 'MAT', 'FIN', 'TYPE', 'MAT', 'FIN', 'FIRE LABEL', 'HDW CODE', 'ROOM', 'REMARK NOTES'];
const blank = (label: string) => [label, '', '', '', '', '', '', '', '', '', '', '', '', ''];
const drow = (no: string, w: string, h: string, type: string, mat: string, frameT: string, fire: string, room: string) =>
  [no, w, h, `1 3/4"`, type, mat, 'PT', frameT, 'PS', 'PT', fire, '', room, ''];

const CSV = [
  'Some title row that should be ignored',
  line(HEADER),
  line(blank('PARKADE')),
  line(drow('D008', `3'-2"`, `7'-0"`, '1', 'HM', 'B', '45 MIN', 'Electrical')),
  line(drow('D005', `3'-2"`, `7'-0"`, '2', 'HM', 'A', '90 MIN', 'Stair 1')),
  line(blank('SUITE A1 & A2')),
  line(HEADER), // repeated header per section — must be skipped
  line(drow('D1', `2'-6"`, `6'-8"`, '9', 'MCD', 'C', '', 'Ensuite')),
  line(drow('B1', `3'-0"`, `6'-8"`, '9', 'MCD', 'C', '', 'Bedroom 2')),
  line(drow('A1', `3'-2"`, `7'-0"`, '8', 'SCW', 'B', '45 MIN', 'Suite Entry')),
].join('\n');

test('CSV tokenizer + column detection parse a real-shaped schedule', () => {
  const { rows, groups, columnMap } = parseScheduleCsv(CSV);
  assert.deepEqual(groups, ['PARKADE', 'SUITE A1 & A2']);
  assert.equal(rows.length, 5);
  assert.equal(columnMap.frameType !== undefined, true, 'second TYPE column mapped to frame');
  const d008 = rows.find((r) => r.number === 'D008')!;
  assert.equal(d008.width, `3'-2"`);          // inch mark survived quoting
  assert.equal(d008.material, 'HM');
  assert.equal(d008.fireLabelMin, 45);
  assert.equal(d008.group, 'PARKADE');
  assert.equal(d008.room, 'Electrical');
  assert.equal(widthToInches(d008.width), 38);
});

test('fire-label parsing handles MIN suffix and blanks', () => {
  assert.equal(parseFireLabel('60 MIN'), 60);
  assert.equal(parseFireLabel('45MIN'), 45);
  assert.equal(parseFireLabel('—'), undefined);
  assert.equal(parseFireLabel(''), undefined);
});

test('room label maps to function (bath before bedroom; ensuite is privacy)', () => {
  assert.equal(functionFromRoomLabel('Ensuite')?.function, 'restroom-single');
  assert.equal(functionFromRoomLabel('Electrical Room')?.function, 'mechanical-electrical');
  assert.equal(functionFromRoomLabel('Bedroom 2')?.function, 'communicating');
  assert.equal(functionFromRoomLabel('Storage')?.function, 'storeroom');
  assert.equal(functionFromRoomLabel('Stair 1')?.function, 'stairwell-exit');
  assert.equal(functionFromRoomLabel('Suite Entry')?.function, 'entrance-staff');
  assert.equal(functionFromRoomLabel('Living Room'), null, 'no keyword → fall through to heuristic');
});

test('room label resolves the suite passage-vs-privacy ambiguity at HIGH confidence', () => {
  // Same narrow MCD door: heuristic guesses privacy (low confidence). Room label decides.
  const bath = inferFunction({ number: 'D1', width: `2'-6"`, material: 'MCD', group: 'Suite A', room: 'Ensuite' })!;
  assert.equal(bath.function, 'restroom-single');
  assert.equal(bath.confidence, 'high');

  const bed = inferFunction({ number: 'B1', width: `2'-6"`, material: 'MCD', group: 'Suite A', room: 'Bedroom 2' })!;
  assert.equal(bed.function, 'communicating'); // passage, not privacy
  assert.equal(bed.confidence, 'high');
});

test('full chain: CSV -> openings (room-driven) -> hardware sets', () => {
  const { rows } = parseScheduleCsv(CSV);
  const { openings, inference } = rowsToOpenings(rows);
  assert.equal(openings.length, 5);
  // every opening now resolves at high confidence because the schedule carried room labels.
  assert.ok(inference.every((i) => i.confidence === 'high'));
  const result = generateHardwareSets(openings, { catalog: 'lh' });
  assert.ok(result.sets.length >= 1);
  // the Ensuite door is a privacy set.
  const d1 = result.profiles.find((p) => p.opening.number === 'D1')!;
  assert.equal(d1.latching.kind === 'lockset' && d1.latching.lockFunction, 'privacy');
});
