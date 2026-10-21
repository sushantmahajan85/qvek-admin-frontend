'use client';

// Lets UI pieces ask the live-data provider for data it does not load eagerly (a rider's KYC record when
// their drawer opens). The provider reads this set and subscribes to it.
const wantedKyc = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export function requestKyc(riderId: string) {
  if (wantedKyc.has(riderId)) return;
  wantedKyc.add(riderId);
  version += 1;
  listeners.forEach((l) => l());
}

export const kycRequests = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  getVersion: () => version,
  ids: () => Array.from(wantedKyc),
};
