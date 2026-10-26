import { describe, expect, it } from 'vitest';
import { resolveHub } from './map-state';
import type { FleetRow } from '../fleet/api';

const row = (lat: number | null, lng: number | null): FleetRow =>
  ({ id: `${lat},${lng}`, lat, lng }) as FleetRow;

describe('resolveHub', () => {
  it('prefers the configured env hub', () => {
    process.env.NEXT_PUBLIC_HUB_LAT = '12.97';
    process.env.NEXT_PUBLIC_HUB_LNG = '77.59';
    expect(resolveHub([row(28.4, 77.5)])).toEqual({ lat: 12.97, lng: 77.59 });
    delete process.env.NEXT_PUBLIC_HUB_LAT;
    delete process.env.NEXT_PUBLIC_HUB_LNG;
  });

  it('falls back to the median positioned vehicle', () => {
    expect(
      resolveHub([row(28.1, 77.1), row(28.5, 77.5), row(28.3, 77.3)]),
    ).toEqual({ lat: 28.3, lng: 77.3 });
  });

  it('ignores vehicles without a fix and returns null when empty', () => {
    expect(resolveHub([row(null, null), row(28.4, null)])).toBeNull();
    expect(resolveHub([])).toBeNull();
  });
});
