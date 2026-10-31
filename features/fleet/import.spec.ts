import { readSheet } from 'read-excel-file/node';
import { describe, expect, it } from 'vitest';
import writeXlsxFile from 'write-excel-file/node';
import { buildTemplateSheets, IMPORT_LIMIT, parseCsv, parseVehiclesFile } from './import';

function csvFile(lines: string[]): File {
  return new File([lines.join('\n')], 'vehicles.csv', { type: 'text/csv' });
}

describe('parseCsv', () => {
  it('handles quoted values, escaped quotes and CRLF', () => {
    const rows = parseCsv('a,"b,c","say ""hi"""\r\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b,c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseVehiclesFile', () => {
  it('accepts tolerant header names and returns clean rows', async () => {
    const parsed = await parseVehiclesFile(
      csvFile([
        'Vehicle Number,IOT ID,Chassis Number,Motor No.,Controller No.',
        'QVEK-001,IOP-10001,CH-1,MT-1,CT-1',
        'QVEK-002,IOP-10002,,,',
      ]),
    );
    expect(parsed.total).toBe(2);
    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      { vehicleNo: 'QVEK-001', iopId: 'IOP-10001', chassisNo: 'CH-1', motorNo: 'MT-1', controllerNo: 'CT-1', row: 2 },
      { vehicleNo: 'QVEK-002', iopId: 'IOP-10002', row: 3 },
    ]);
  });

  it('finds the header below title rows', async () => {
    const parsed = await parseVehiclesFile(
      csvFile(['Qvek fleet upload', 'Generated 2026-10-31', '', 'Vehicle No.,IOP ID', 'QVEK-1,IOP-1']),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].row).toBe(5);
  });

  it('reports invalid cells with the sheet row number', async () => {
    const parsed = await parseVehiclesFile(
      csvFile(['Vehicle No.,IOP ID', ',IOP-1', 'Q,IOP-2']),
    );
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.issues[0]).toMatchObject({ row: 2 });
    expect(parsed.issues[0].message).toContain('Vehicle No.');
    expect(parsed.issues[1]).toMatchObject({ row: 3 });
    expect(parsed.issues[1].message).toContain('Vehicle No.');
  });

  it('flags in-file duplicates case-insensitively and keeps the first', async () => {
    const parsed = await parseVehiclesFile(
      csvFile(['Vehicle No.,IOP ID', 'QVEK-1,IOP-1', 'QVEK-2,IOP-1', 'QVEK-1,IOP-3']),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.issues.map((i) => i.row)).toEqual([3, 4]);
    expect(parsed.issues[0].message).toContain('row 2');
    expect(parsed.issues[1].message).toContain('row 2');
  });

  it('refuses a sheet above the import limit', async () => {
    const lines = ['Vehicle No.,IOP ID'];
    for (let i = 0; i < IMPORT_LIMIT + 1; i += 1) lines.push(`QVEK-${i},IOP-${i}`);
    await expect(parseVehiclesFile(csvFile(lines))).rejects.toThrow(/limit is 500/);
  });

  it('fails clearly when the required columns are missing', async () => {
    await expect(parseVehiclesFile(csvFile(['Name,Phone', 'A,9999999999']))).rejects.toThrow(/header/i);
  });

  it('rejects unsupported extensions', async () => {
    const file = new File(['x'], 'vehicles.xls');
    await expect(parseVehiclesFile(file)).rejects.toThrow(/xlsx/i);
  });
});

describe('downloadable template', () => {
  it('has the exact required headers and they survive the xlsx round-trip', async () => {
    const sheets = buildTemplateSheets();
    const headers = (sheets[0].data[0] as Array<{ value?: unknown }>).map((c) => c.value);
    expect(headers).toEqual(['Vehicle No.', 'IOP ID', 'Chassis No.', 'Motor No.', 'Controller No.', 'Type']);

    const buffer = await writeXlsxFile(sheets).toBuffer();
    const parsed = await readSheet(buffer);
    expect(parsed[0].map((c) => String(c))).toEqual(headers);

    // The generated file is accepted by the importer (header found, no rows yet).
    const file = new File([buffer as unknown as BlobPart], 'qvek-vehicles-template.xlsx');
    const result = await parseVehiclesFile(file);
    expect(result.total).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it('includes a field guide on the Instructions sheet', async () => {
    const instructions = buildTemplateSheets()[1];
    const text = JSON.stringify(instructions.data);
    for (const field of ['Vehicle No.', 'IOP ID', 'Chassis No.', 'Motor No.', 'Controller No.', 'Type']) {
      expect(text).toContain(field);
    }
    expect(text).toContain('500');
  });
});
