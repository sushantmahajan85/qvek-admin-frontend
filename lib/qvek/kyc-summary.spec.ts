import { beforeEach, describe, expect, it } from 'vitest';
import { D, emptyState, store } from './store';
import type { KycStatus, Rider } from './types';

function rider(over: { numbers?: Partial<Record<'aadhaar' | 'pan' | 'dl', KycStatus>>; docs?: string[]; verified?: boolean }): Rider {
  const kyc = { aadhaar: { status: 'missing' }, pan: { status: 'missing' }, dl: { status: 'missing' } } as Record<string, { status: KycStatus }>;
  for (const [kind, status] of Object.entries(over.numbers ?? {})) kyc[kind] = { status: status as KycStatus };
  return {
    kyc,
    kycInfo: over.docs
      ? {
          fullName: null,
          aadhaar: null,
          pan: null,
          dlNo: null,
          verified: !!over.verified,
          docs: over.docs.map((kind) => ({ key: `kyc/${kind}.jpg`, kind, name: `${kind}.jpg`, url: '' })),
        }
      : over.verified
        ? { fullName: null, aadhaar: null, pan: null, dlNo: null, verified: true, docs: [] }
        : undefined,
  } as unknown as Rider;
}

beforeEach(() => {
  const s = emptyState();
  s.config.kycDocs = [
    { kind: 'aadhaar', title: 'Aadhaar', required: true },
    { kind: 'pan', title: 'PAN', required: true },
    { kind: 'dl', title: 'Driving Licence', required: false },
  ];
  store.replace(s);
});

describe('KYC summary (onboarding count)', () => {
  it('counts uploaded FILES even when no masked numbers were submitted', () => {
    // This was the bug: the rider app uploads files only, so the queue showed 0/2.
    const k = D.kycSummary(rider({ docs: ['aadhaar', 'pan'] }));
    expect(k).toMatchObject({ submitted: 2, total: 2, complete: true, allVerified: false });
  });

  it('still counts masked numbers when there are no files', () => {
    const k = D.kycSummary(rider({ numbers: { aadhaar: 'submitted', pan: 'submitted' } }));
    expect(k).toMatchObject({ submitted: 2, total: 2, complete: true });
  });

  it('merges files and numbers per document', () => {
    const k = D.kycSummary(rider({ numbers: { aadhaar: 'submitted' }, docs: ['pan'] }));
    expect(k).toMatchObject({ submitted: 2, complete: true });
  });

  it('marks the set verified only when the KYC record is verified', () => {
    const k = D.kycSummary(rider({ docs: ['aadhaar', 'pan'], verified: true }));
    expect(k).toMatchObject({ verified: 2, allVerified: true });
  });

  it('counts server-driven required kinds (custom documents)', () => {
    const s = emptyState();
    s.config.kycDocs = [
      { kind: 'aadhaar', title: 'Aadhaar', required: true },
      { kind: 'pan', title: 'PAN', required: true },
      { kind: 'rc', title: 'RC book', required: true },
    ];
    store.replace(s);

    expect(D.kycSummary(rider({ docs: ['aadhaar', 'pan'] })).complete).toBe(false);
    expect(D.kycSummary(rider({ docs: ['aadhaar', 'pan', 'rc'] }))).toMatchObject({ submitted: 3, total: 3, complete: true });
  });

  it('reports an optional DL separately', () => {
    expect(D.kycSummary(rider({ docs: ['aadhaar', 'pan'] })).dlSubmitted).toBe(false);
    expect(D.kycSummary(rider({ docs: ['aadhaar', 'pan', 'dl'] })).dlSubmitted).toBe(true);
  });

  it('reports nothing uploaded when the KYC record is empty', () => {
    expect(D.kycSummary(rider({}))).toMatchObject({ submitted: 0, total: 2, complete: false, dlSubmitted: false });
  });
});
