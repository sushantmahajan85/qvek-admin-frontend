import { describe, expect, it } from 'vitest';
import type { KycData } from '@/features/kyc/api';
import type { SimData } from '@/lib/qvek/sim';
import { buildState, mapKyc, type LiveInputs } from './map-state';

const base: KycData = {
  id: 'k1',
  riderId: 'r1',
  fullName: 'Asha',
  aadhaar: null,
  pan: null,
  dlNo: null,
  bankAcct: null,
  verified: false,
  updatedAt: '2026-10-31T06:00:00.000Z',
};

const doc = (kind: string, name: string) => ({
  key: `riders/r1/kyc/${kind}-123.jpg`,
  kind,
  name,
  url: 'https://signed.example/x',
  expiresInSec: 300,
});

describe('mapKyc', () => {
  it('maps uploaded files to submitted docs (no masked numbers needed)', () => {
    const out = mapKyc('PENDING', { ...base, docs: [doc('aadhaar', 'aadhaar.jpg'), doc('pan', 'pan.jpg')] });

    expect(out.kyc.aadhaar).toMatchObject({ status: 'submitted', file: 'aadhaar.jpg' });
    expect(out.kyc.pan).toMatchObject({ status: 'submitted', file: 'pan.jpg' });
    expect(out.kyc.dl.status).toBe('missing');
    expect(out.loaded).toBe(true);
    expect(out.info?.docs).toHaveLength(2);
  });

  it('marks file-backed docs verified when the record is verified', () => {
    const out = mapKyc('PENDING', { ...base, verified: true, docs: [doc('aadhaar', 'a.jpg')] });
    expect(out.kyc.aadhaar.status).toBe('verified');
    expect(out.kyc.pan.status).toBe('missing');
  });

  it('falls back to the masked number when no file exists', () => {
    const out = mapKyc('PENDING', { ...base, aadhaar: 'XXXX XXXX 1234' });
    expect(out.kyc.aadhaar.status).toBe('submitted');
    expect(out.kyc.aadhaar.file).toContain('1234');
  });

  it('accepts the dl kind and keeps custom kinds in info.docs', () => {
    const out = mapKyc('PENDING', { ...base, docs: [doc('dl', 'dl.jpg'), doc('rc', 'rc.pdf')] });
    expect(out.kyc.dl).toMatchObject({ status: 'submitted', file: 'dl.jpg' });
    expect(out.info?.docs.map((d) => d.kind)).toEqual(['dl', 'rc']);
  });

  it('returns all-missing when the API has no KYC row', () => {
    const out = mapKyc('PENDING', null);
    expect(out.loaded).toBe(true);
    expect(out.info).toBeNull();
    expect(out.kyc.aadhaar.status).toBe('missing');
  });
});

const emptySim: SimData = {
  vehicles: {},
  riders: {},
  riderEdits: {},
  logs: [],
  history: {},
  recoverySteps: {},
  closedRecoveries: [],
  alertsRead: [],
};

function build(over: Partial<LiveInputs>) {
  return buildState({
    fleet: [],
    riders: [],
    timelines: {},
    kyc: {},
    replacements: [],
    expenses: [],
    support: undefined,
    ops: undefined,
    ui: undefined,
    username: 'admin',
    hub: null,
    now: Date.now(),
    sim: emptySim,
    ...over,
  });
}

const apiRider = (over: Record<string, unknown> = {}) =>
  ({
    id: 'r1',
    name: 'Asha',
    phone: '+919876543210',
    status: 'ACTIVE',
    paidToken: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...over,
  }) as never;

describe('expenses and deposit accounting', () => {
  it('maps who pays an expense', () => {
    const state = build({
      expenses: [
        { id: 'e1', kind: 'REPAIR', amountPaise: 50000, paidBy: 'RIDER_DEPOSIT', createdAt: '2026-10-31T00:00:00.000Z' },
        { id: 'e2', kind: 'REPAIR', amountPaise: 10000, paidBy: 'RIDER', createdAt: '2026-10-31T00:00:00.000Z' },
        { id: 'e3', kind: 'SERVICING', amountPaise: 20000, createdAt: '2026-10-31T00:00:00.000Z' },
      ],
    });
    expect(state.expenses.map((e) => e.paidBy)).toEqual(['deposit', 'rider', 'company']);
  });

  it('tracks how much of the deposit was used by expenses', () => {
    const state = build({
      riders: [apiRider()],
      timelines: {
        r1: [
          { ts: '2026-10-01T00:00:00.000Z', kind: 'DEPOSIT', amountPaise: 300000, status: 'Success', note: null },
          { ts: '2026-10-20T00:00:00.000Z', kind: 'DEPOSIT_DEDUCTION', amountPaise: 50000, status: 'Success', note: null },
        ],
      },
    });
    expect(state.riders[0].deposit).toMatchObject({ status: 'received', amount: 3000, used: 500 });
  });

  it('leaves the deposit untouched when nothing was deducted', () => {
    const state = build({
      riders: [apiRider()],
      timelines: {
        r1: [{ ts: '2026-10-01T00:00:00.000Z', kind: 'DEPOSIT', amountPaise: 300000, status: 'Success', note: null }],
      },
    });
    expect(state.riders[0].deposit).toMatchObject({ amount: 3000, used: 0 });
  });
});
