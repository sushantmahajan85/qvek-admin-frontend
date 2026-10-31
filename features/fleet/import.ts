/*
 * Spreadsheet import for the Vehicles page.
 *
 * The file is parsed in the browser (no upload of the raw sheet), validated row
 * by row, and only clean rows are posted to `POST /admin/vehicles/bulk`. The
 * server still re-checks duplicates against the fleet, so this module is a UX
 * layer — never the only guard.
 */
import type { SheetData } from 'write-excel-file/browser';

import { vehicleSchema, type VehicleInput } from './api';

export const IMPORT_LIMIT = 500;

export interface ImportRow extends VehicleInput {
  /** 1-based row number in the sheet, used in error messages. */
  row: number;
}

export interface ImportIssue {
  row: number;
  vehicleNo: string;
  iopId: string;
  message: string;
}

export interface ParsedImport {
  /** Valid rows only — ready to post. */
  rows: ImportRow[];
  /** Rows rejected before the request (same order/row numbers as the sheet). */
  issues: ImportIssue[];
  /** Data rows read from the sheet (excluding the header). */
  total: number;
}

type Field = 'vehicleNo' | 'iopId' | 'chassisNo' | 'motorNo' | 'controllerNo' | 'type';

/** Tolerant header map: "Vehicle No.", "vehicle_number", "VehicleNumber" all match. */
const HEADER_ALIASES: Record<string, Field> = {
  vehicleno: 'vehicleNo',
  vehiclenumber: 'vehicleNo',
  vehiclenum: 'vehicleNo',
  vehicle: 'vehicleNo',
  regno: 'vehicleNo',
  regnumber: 'vehicleNo',
  registrationno: 'vehicleNo',
  registrationnumber: 'vehicleNo',
  iopid: 'iopId',
  iop: 'iopId',
  iot: 'iopId',
  iotid: 'iopId',
  deviceid: 'iopId',
  trackerid: 'iopId',
  gpsid: 'iopId',
  imei: 'iopId',
  chassisno: 'chassisNo',
  chassisnumber: 'chassisNo',
  chassis: 'chassisNo',
  vin: 'chassisNo',
  motorno: 'motorNo',
  motornumber: 'motorNo',
  motor: 'motorNo',
  controllerno: 'controllerNo',
  controllernumber: 'controllerNo',
  controller: 'controllerNo',
  type: 'type',
  model: 'type',
  vehicletype: 'type',
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
}

/** Minimal RFC-4180 CSV reader (quoted fields, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return file.text().then(parseCsv);
  }
  if (!name.endsWith('.xlsx')) {
    throw new Error('Unsupported file. Use an .xlsx workbook or a .csv file (Excel 97 .xls must be saved as .xlsx).');
  }
  return import('read-excel-file/browser').then(async ({ readSheet }) => {
    const toText = (sheet: Array<Array<unknown>>) => sheet.map((row) => row.map((cell) => cellText(cell)));
    try {
      // Our template names the data sheet "Vehicles"; prefer it by name so a
      // reordered workbook (Instructions first) still imports correctly.
      return toText(await readSheet(file, 'Vehicles'));
    } catch {
      return toText(await readSheet(file));
    }
  });
}

/**
 * Parses and validates an XLSX/CSV sheet. Throws only for file-level problems
 * (wrong type, missing columns); row problems come back as `issues`.
 */
export async function parseVehiclesFile(file: File): Promise<ParsedImport> {
  const sheet = await readRows(file);
  if (!sheet.length) throw new Error('The file is empty.');

  // The header may sit below a title row: pick the first row that maps both
  // required columns, scanning up to 10 rows.
  const mapHeader = (row: string[]) => row.map((h) => HEADER_ALIASES[normalizeHeader(h)]);
  let headerIndex = -1;
  let header: Field[] = [];
  for (let i = 0; i < Math.min(sheet.length, 10); i += 1) {
    const mapped = mapHeader(sheet[i]);
    if (mapped.includes('vehicleNo') && mapped.includes('iopId')) {
      headerIndex = i;
      header = mapped;
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error('Could not find the header row. Required columns: "Vehicle No." and "IOP ID".');
  }

  const dataRows = sheet.slice(headerIndex + 1).filter((r) => r.some((c) => c.trim() !== ''));
  if (dataRows.length > IMPORT_LIMIT) {
    throw new Error(`The sheet has ${dataRows.length} rows — the limit is ${IMPORT_LIMIT} per import. Split it and try again.`);
  }

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Map<string, number>();

  dataRows.forEach((cells, i) => {
    const rowNo = headerIndex + i + 2; // +1 header, +1 for 1-based
    const raw: Partial<Record<Field, string>> = {};
    header.forEach((field, col) => {
      if (field && !raw[field]) raw[field] = cellText(cells[col]);
    });
    const candidate = {
      vehicleNo: raw.vehicleNo ?? '',
      iopId: raw.iopId ?? '',
      ...(raw.chassisNo ? { chassisNo: raw.chassisNo } : {}),
      ...(raw.motorNo ? { motorNo: raw.motorNo } : {}),
      ...(raw.controllerNo ? { controllerNo: raw.controllerNo } : {}),
      ...(raw.type ? { type: raw.type } : {}),
    };
    const issue = (message: string) =>
      issues.push({ row: rowNo, vehicleNo: candidate.vehicleNo, iopId: candidate.iopId, message });

    const parsed = vehicleSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const which = String(first?.path[0] ?? '');
      const label = which === 'vehicleNo' ? 'Vehicle No.' : which === 'iopId' ? 'IOP ID' : which;
      issue(`${label} is invalid: ${first?.message ?? 'check the value'}.`);
      return;
    }

    const no = parsed.data.vehicleNo;
    const iop = parsed.data.iopId;
    const chassis = parsed.data.chassisNo;
    const dupKey =
      (seen.has(`no:${no.toLowerCase()}`) && `no:${no.toLowerCase()}`) ||
      (seen.has(`iop:${iop.toLowerCase()}`) && `iop:${iop.toLowerCase()}`) ||
      (chassis && seen.has(`chassis:${chassis.toLowerCase()}`) && `chassis:${chassis.toLowerCase()}`) ||
      null;
    if (dupKey) {
      const firstRow = seen.get(dupKey);
      issue(`Same value as row ${firstRow} in this file — duplicates are skipped.`);
      return;
    }

    seen.set(`no:${no.toLowerCase()}`, rowNo);
    seen.set(`iop:${iop.toLowerCase()}`, rowNo);
    if (chassis) seen.set(`chassis:${chassis.toLowerCase()}`, rowNo);
    rows.push({ ...parsed.data, row: rowNo });
  });

  return { rows, issues, total: dataRows.length };
}

export const TEMPLATE_FILE = 'qvek-vehicles-template.xlsx';

const FIELD_GUIDE: Array<[string, string, string, string]> = [
  ['Vehicle No.', 'Required', 'QVEK-001', 'Fleet registration number shown across the admin'],
  ['IOP ID', 'Required', 'IOP-10001', 'Tracker/IMEI bound to this scooter. Must be unique'],
  ['Chassis No.', 'Optional', 'CH-10001', 'Master record; also unique when present'],
  ['Motor No.', 'Optional', 'MT-10001', 'Kept in component history on replacement'],
  ['Controller No.', 'Optional', 'CT-10001', 'Kept in component history on replacement'],
  ['Type', 'Optional', 'LIGHT_2W', 'Defaults to LIGHT_2W when left blank'],
];

/**
 * Builds the real .xlsx template in the browser: a styled, header-only
 * "Vehicles" sheet (so example rows can never be imported by accident) plus an
 * "Instructions" sheet with the field guide. Generated on demand and lazy-loaded
 * so the writer package stays out of the initial bundle.
 */
export interface TemplateSheet {
  data: SheetData;
  sheet: string;
  columns: Array<{ width: number }>;
  stickyRowsCount: number;
}

/** Pure data for the template — exported so tests can round-trip it. */
export function buildTemplateSheets(): TemplateSheet[] {
  const head = (label: string, required: boolean) => ({
    value: label,
    fontWeight: 'bold' as const,
    textColor: required ? '#FFFFFF' : '#111111',
    backgroundColor: required ? '#111111' : '#E5E7EB',
    align: 'center' as const,
  });

  const note = (value: string) => ({ value, textColor: '#3F3F46' });

  const vehicles: SheetData = [
    [head('Vehicle No.', true), head('IOP ID', true), head('Chassis No.', false), head('Motor No.', false), head('Controller No.', false), head('Type', false)],
  ];

  const instructions: SheetData = [
    [{ value: 'Qvek — vehicle import template', fontWeight: 'bold', fontSize: 16 }],
    [],
    [note('Follow these steps. Only the "Vehicles" sheet is read on upload.')],
    [note('1. Open the "Vehicles" sheet and add one vehicle per row, starting on row 2.')],
    [note('2. Do not rename or move the header row, and do not add columns before it.')],
    [note('3. Keep the file as .xlsx and upload it from Vehicles → Import XLSX.')],
    [note('4. The sheet is validated before saving. Rows with problems are listed and skipped.')],
    [],
    [{ value: 'Fields', fontWeight: 'bold' }],
    [
      { value: 'Column', fontWeight: 'bold', backgroundColor: '#F4F4F5' },
      { value: 'Required', fontWeight: 'bold', backgroundColor: '#F4F4F5' },
      { value: 'Example', fontWeight: 'bold', backgroundColor: '#F4F4F5' },
      { value: 'Notes', fontWeight: 'bold', backgroundColor: '#F4F4F5' },
    ],
    ...FIELD_GUIDE.map(([field, required, example, notes]) => [
      { value: field, fontWeight: 'bold' as const },
      { value: required, align: 'center' as const },
      { value: example, fontFamily: 'Courier New' },
      { value: notes, wrap: true },
    ]),
    [],
    [{ value: 'Rules', fontWeight: 'bold' }],
    [note('• Up to 500 vehicle rows per import. Split larger sheets.')],
    [note('• Vehicle No., IOP ID and Chassis No. must each be unique. Duplicates in the file are flagged.')],
    [note('• Rows that clash with a vehicle already in the fleet are skipped and reported — nothing is overwritten.')],
    [note('• If an IOP ID starts with 0, format that Excel column as Text so the leading zero is kept.')],
    [note('• Deleted vehicles are restored when the same IOP ID / vehicle number is uploaded again.')],
  ];

  return [
    {
      data: vehicles,
      sheet: 'Vehicles',
      columns: [{ width: 18 }, { width: 22 }, { width: 20 }, { width: 18 }, { width: 20 }, { width: 14 }],
      stickyRowsCount: 1,
    },
    {
      data: instructions,
      sheet: 'Instructions',
      columns: [{ width: 24 }, { width: 12 }, { width: 22 }, { width: 72 }],
      stickyRowsCount: 1,
    },
  ];
}

export async function downloadTemplateXlsx(): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(buildTemplateSheets()).toFile(TEMPLATE_FILE);
}
