// ─── Schedule CSV importer: CSV text -> ScheduleRow[] ───
//
// Parses a door/frame schedule exported to CSV. Handles the real-world quirks of these sheets:
// quoted fields (the inch mark " is the CSV quote char), repeated header rows per section,
// section/band rows (PARKADE, GROUND FLOOR, SUITE A1 & A2…) that set the group for the rows
// beneath them, the DOUBLE TYPE/MAT/FIN columns (door data then frame data), and em-dash / "-"
// fire-label blanks. Zero-dependency, RFC4180-ish tokenizer.

import type { ScheduleRow } from './door-schedule.ts';

/** Tokenize CSV into rows of string cells. Handles quotes and "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export interface ColumnMap {
  number: number;
  width: number;
  height?: number;
  type?: number;
  material: number;
  finish?: number;
  frameType?: number;
  fireLabel?: number;
  room?: number;
  notes?: number;
}

/** Detect the column map from a header row. Duplicate TYPE/MAT/FIN: 1st = door, 2nd = frame. */
export function detectColumns(header: string[]): ColumnMap | null {
  const map: Partial<ColumnMap> = {};
  let typeSeen = 0;
  let matSeen = 0;
  let finSeen = 0;
  header.forEach((raw, i) => {
    const h = raw.toUpperCase().replace(/\s+/g, ' ').trim();
    if (/(DR\.?\s*NO|^NO\.?$|MARK|DOOR\s*(NO|#))/.test(h) && map.number === undefined) map.number = i;
    else if (/WIDTH/.test(h)) map.width = i;
    else if (/HEIGHT/.test(h)) map.height = i;
    else if (/TYPE/.test(h)) { if (typeSeen++ === 0) map.type = i; else if (map.frameType === undefined) map.frameType = i; }
    else if (/MAT/.test(h)) { if (matSeen++ === 0) map.material = i; }
    else if (/FIN/.test(h)) { if (finSeen++ === 0) map.finish = i; }
    else if (/FIRE/.test(h)) map.fireLabel = i;
    else if (/(ROOM|LOCATION|DESCRIPTION)/.test(h)) map.room = i;
    else if (/(REMARK|NOTE)/.test(h)) map.notes = i;
  });
  if (map.number === undefined || map.width === undefined || map.material === undefined) return null;
  return map as ColumnMap;
}

function isHeaderRow(cells: string[]): boolean {
  const joined = cells.join(' ').toUpperCase();
  return /WIDTH/.test(joined) && /HEIGHT/.test(joined);
}

/** Parse a fire-label cell: "60 MIN" / "45MIN" -> 60/45; "—" / "-" / "" -> undefined. */
export function parseFireLabel(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
}

export interface ParseScheduleOptions {
  /** Override auto-detection. */
  columnMap?: ColumnMap;
  /** Treat a row with a value only in the number column (and no width) as a section/band. */
  detectBands?: boolean;
}

export interface ParseScheduleResult {
  rows: ScheduleRow[];
  columnMap: ColumnMap;
  /** Section bands encountered, in order. */
  groups: string[];
}

/** Parse door-schedule CSV text into ScheduleRow[]. */
export function parseScheduleCsv(text: string, options: ParseScheduleOptions = {}): ParseScheduleResult {
  const raw = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  const detectBands = options.detectBands ?? true;

  let cols = options.columnMap ?? null;
  const groups: string[] = [];
  const out: ScheduleRow[] = [];
  let currentGroup = '';

  for (const cells of raw) {
    if (!cols) {
      if (isHeaderRow(cells)) cols = detectColumns(cells);
      continue; // skip everything until we have a header
    }
    if (isHeaderRow(cells)) continue; // repeated header per section

    const get = (idx: number | undefined): string => (idx === undefined ? '' : (cells[idx] ?? '').trim());
    const number = get(cols.number);
    const width = get(cols.width);

    // Section/band row: a label in the number column with no width.
    if (detectBands && number && !width) {
      currentGroup = number.replace(/\s+/g, ' ').trim();
      groups.push(currentGroup);
      continue;
    }
    if (!number || !width) continue; // not a real opening row

    const row: ScheduleRow = {
      number,
      width,
      height: get(cols.height) || undefined,
      type: get(cols.type) || undefined,
      material: get(cols.material),
      finish: get(cols.finish) || undefined,
      frameType: get(cols.frameType) || undefined,
      fireLabelMin: parseFireLabel(get(cols.fireLabel)),
      room: get(cols.room) || undefined,
      notes: get(cols.notes) || undefined,
      group: currentGroup || 'Unspecified',
    };
    out.push(row);
  }

  if (!cols) throw new Error('no header row found (need columns including WIDTH and HEIGHT)');
  return { rows: out, columnMap: cols, groups };
}
