import { describe, expect, it } from 'vitest';
import { BUILTIN_KYC_DOCS, kycTileModels } from './kyc-tiles';
import type { Rider } from './types';

const rider = (over: Partial<Pick<Rider, 'kyc' | 'kycInfo'>> = {}): Pick<Rider, 'kyc' | 'kycInfo'> => ({
  kyc: {
    aadhaar: { status: 'missing' },
    pan: { status: 'missing' },
    dl: { status: 'missing' },
  },
  kycInfo: null,
  ...over,
});

describe('KYC tiles', () => {
  it('labels every built-in document even when nothing is uploaded', () => {
    const tiles = kycTileModels(rider(), []);
    expect(tiles.map((t) => t.title)).toEqual(['Aadhaar', 'PAN', 'Driving Licence']);
    expect(tiles.map((t) => t.statusLabel)).toEqual(['Missing', 'Missing', 'Optional']);
  });

  it('shows uploaded files and their status', () => {
    const [aadhaar] = kycTileModels(
      rider({
        kyc: { aadhaar: { status: 'submitted', file: 'aadhaar.jpg' }, pan: { status: 'missing' }, dl: { status: 'missing' } },
        kycInfo: {
          fullName: 'Asha',
          aadhaar: null,
          pan: null,
          dlNo: null,
          verified: false,
          docs: [{ key: 'k/a.jpg', kind: 'aadhaar', name: 'aadhaar.jpg', url: 'https://x/a.jpg' }],
        },
      }),
      [],
    );
    expect(aadhaar).toMatchObject({ status: 'submitted', fileName: 'aadhaar.jpg', fileUrl: 'https://x/a.jpg' });
  });

  it('matches uploaded kind case-insensitively', () => {
    const [aadhaar] = kycTileModels(
      rider({
        kycInfo: {
          fullName: null,
          aadhaar: null,
          pan: null,
          dlNo: null,
          verified: false,
          docs: [{ key: 'k/a.jpg', kind: 'AADHAAR', name: 'a.jpg', url: 'https://x/a.jpg' }],
        },
      }),
      [],
    );
    expect(aadhaar.fileUrl).toBe('https://x/a.jpg');
  });

  it('keeps custom kinds labelled when the configured title is blank', () => {
    const [voter] = kycTileModels(rider(), [{ kind: 'voter', title: '  ', required: true }]);
    expect(voter).toMatchObject({ title: 'voter', known: false, statusLabel: 'Missing' });
  });

  it('falls back to the built-ins when every configured entry is invalid', () => {
    const tiles = kycTileModels(rider(), [{ kind: '', title: '', required: true }]);
    expect(tiles).toHaveLength(BUILTIN_KYC_DOCS.length);
    expect(tiles[0].title).toBe('Aadhaar');
  });
});
