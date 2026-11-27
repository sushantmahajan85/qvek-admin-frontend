import { readSheet } from 'read-excel-file/node';
import { describe, expect, it } from 'vitest';
import writeXlsxFile from 'write-excel-file/node';
import { buildTemplateSheets, IMPORT_LIMIT, parseCsv, parseVehiclesFile } from './import';

const I1 = '868720065959201';
const I2 = '868720065959202';
const I3 = '356218606624383';
const imei = (n: number) => String(868720065950000 + n).padStart(15, '0');

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
  const hdr =
    'Vehicle No.,IOP ID,Chassis No.,Motor No.,Controller No.,Driver ID,Battery ID';
  const full = (vehicle: string, iop: string, ch: string, mt: string, ct: string, dr: string, ba: string) =>
    `${vehicle},${iop},${ch},${mt},${ct},${dr},${ba}`;

  it('accepts tolerant header names and returns clean rows', async () => {
    const parsed = await parseVehiclesFile(
      csvFile([
        'Vehicle Number,IOT ID,Chassis Number,Motor No.,Controller No.,Driver ID,Battery ID',
        full('QVEK-001', I1, 'CH-1', 'MT-1', 'CT-1', 'DR-1', 'BAT-1'),
        full('QVEK-002', I2, '', '', '', '', ''),
        full('QVEK-003', I3, 'CH-10003', 'MT-10003', 'CT-10003', 'DR-10003', 'BAT-10003'),
      ]),
    );
    expect(parsed.total).toBe(3);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]?.row).toBe(3);
    expect(parsed.rows).toEqual([
      {
        vehicleNo: 'QVEK-001',
        iopId: I1,
        chassisNo: 'CH-1',
        motorNo: 'MT-1',
        controllerNo: 'CT-1',
        driverId: 'DR-1',
        batteryId: 'BAT-1',
        row: 2,
      },
      {
        vehicleNo: 'QVEK-003',
        iopId: I3,
        chassisNo: 'CH-10003',
        motorNo: 'MT-10003',
        controllerNo: 'CT-10003',
        driverId: 'DR-10003',
        batteryId: 'BAT-10003',
        row: 4,
      },
    ]);
  });

  it('finds the header below title rows', async () => {
    const parsed = await parseVehiclesFile(
      csvFile([
        'Qvek fleet upload',
        'Generated 2026-10-31',
        '',
        hdr,
        full('QVEK-1', I1, 'CH-1', 'MT-1', 'CT-1', 'DR-1', 'BAT-1'),
      ]),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].row).toBe(5);
  });

  it('reports invalid cells with the sheet row number', async () => {
    const parsed = await parseVehiclesFile(csvFile(['Vehicle No.,IOP ID', `,${I1}`, 'Q,IOP-2']));
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.issues[0]).toMatchObject({ row: 2 });
    expect(parsed.issues[0].message).toContain('Vehicle No.');
    expect(parsed.issues[1]).toMatchObject({ row: 3 });
    expect(parsed.issues[1].message).toContain('Vehicle No.');
  });

  it('flags in-file duplicates case-insensitively and keeps the first', async () => {
    const parsed = await parseVehiclesFile(
      csvFile([
        hdr,
        full('QVEK-1', I1, 'CH-1', 'MT-1', 'CT-1', 'DR-1', 'BAT-1'),
        full('QVEK-2', I1, 'CH-2', 'MT-2', 'CT-2', 'DR-2', 'BAT-2'),
        full('QVEK-1', I3, 'CH-3', 'MT-3', 'CT-3', 'DR-3', 'BAT-3'),
      ]),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.issues.map((i) => i.row)).toEqual([3, 4]);
    expect(parsed.issues[0].message).toContain('row 2');
    expect(parsed.issues[1].message).toContain('row 2');
  });

  it('refuses a sheet above the import limit', async () => {
    const lines = [hdr];
    for (let i = 0; i < IMPORT_LIMIT + 1; i += 1) {
      lines.push(full(`QVEK-${i}`, imei(i), `CH-${i}`, `MT-${i}`, `CT-${i}`, `DR-${i}`, `BAT-${i}`));
    }
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
    expect(headers).toEqual([
      'Vehicle No.',
      'IOP ID',
      'Chassis No.',
      'Motor No.',
      'Controller No.',
      'Driver ID',
      'Battery ID',
      'Type',
    ]);

    const buffer = await writeXlsxFile(sheets).toBuffer();
    const parsed = await readSheet(buffer);
    expect(parsed[0].map((c) => String(c))).toEqual(headers);

    const file = new File([buffer as unknown as BlobPart], 'qvek-vehicles-template.xlsx');
    const result = await parseVehiclesFile(file);
    expect(result.total).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it('includes a field guide on the Instructions sheet', async () => {
    const instructions = buildTemplateSheets()[1];
    const text = JSON.stringify(instructions.data);
    for (const field of [
      'Vehicle No.',
      'IOP ID',
      'Chassis No.',
      'Motor No.',
      'Controller No.',
      'Driver ID',
      'Battery ID',
      'Type',
    ]) {
      expect(text).toContain(field);
    }
    expect(text).toContain('500');
  });
});