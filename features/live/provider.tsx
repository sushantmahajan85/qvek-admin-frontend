'use client';

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { useSupport } from '@/features/config/hooks';
import { useAdminMap, useExpenses, useFleet, useReplacements } from '@/features/fleet/hooks';
import { getKycOrNull, kycKeys } from '@/features/kyc/api';
import { useRiders } from '@/features/riders/hooks';
import { getTimeline } from '@/features/timeline/api';
import { sim } from '@/lib/qvek/sim';
import { store } from '@/lib/qvek/store';
import { StoreVersionContext } from '@/lib/qvek/use-store';
import { getSessionUser } from '@/lib/auth-session';
import { kycRequests } from './requests';
import { buildState } from './map-state';

const REFRESH_MS = 60_000;

/**
 * Loads everything the admin UI needs from the API (fleet, riders, per-rider money timelines, KYC for the
 * review queue, replacements, expenses, support config), maps it into the UI's read model and publishes it.
 * The routes render only once the three core queries have data.
 */
export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const fleet = useFleet();
  const riders = useRiders('');
  const replacements = useReplacements();
  const expenses = useExpenses();
  const support = useSupport();
  const adminMap = useAdminMap();

  const simVersion = React.useSyncExternalStore(sim.subscribe, () => sim.version, () => 0);
  const kycVersion = React.useSyncExternalStore(kycRequests.subscribe, kycRequests.getVersion, () => 0);

  const riderList = React.useMemo(() => riders.data ?? [], [riders.data]);

  // One money timeline per rider (the API has no cross-rider endpoint) — feeds finance + plan validity.
  const timelineQs = useQueries({
    queries: riderList.map((r) => ({
      queryKey: ['timeline', r.id, 'all'],
      queryFn: () => getTimeline(r.id, 'all'),
      staleTime: REFRESH_MS,
    })),
  });

  // KYC for the review queue + any rider whose drawer was opened.
  const kycIds = React.useMemo(() => {
    const ids = new Set(riderList.filter((r) => r.status === 'PENDING').map((r) => r.id));
    kycRequests.ids().forEach((id) => ids.add(id));
    return Array.from(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderList, kycVersion]);
  const kycQs = useQueries({
    queries: kycIds.map((id) => ({
      queryKey: kycKeys.one(id),
      queryFn: () => getKycOrNull(id),
      staleTime: REFRESH_MS,
      retry: false,
    })),
  });

  const fingerprint = [
    fleet.dataUpdatedAt,
    riders.dataUpdatedAt,
    replacements.dataUpdatedAt,
    expenses.dataUpdatedAt,
    support.dataUpdatedAt,
    adminMap.dataUpdatedAt,
    simVersion,
    timelineQs.map((q) => q.dataUpdatedAt).join(','),
    kycQs.map((q) => q.dataUpdatedAt).join(','),
  ].join('|');

  const state = React.useMemo(() => {
    const timelines: Record<string, NonNullable<(typeof timelineQs)[number]['data']> | undefined> = {};
    riderList.forEach((r, i) => {
      timelines[r.id] = timelineQs[i]?.data;
    });
    const kyc: Record<string, Awaited<ReturnType<typeof getKycOrNull>> | undefined> = {};
    kycIds.forEach((id, i) => {
      if (kycQs[i]?.isSuccess) kyc[id] = kycQs[i].data;
    });
    const fleetRows = fleet.data ?? [];
    // Configured hub only (backend shop). Null = unset: UI shows distances
    // as unknown instead of measuring from a phantom hub.
    const hub = adminMap.data?.shop ?? null;
    return buildState({
      fleet: fleetRows,
      riders: riderList,
      timelines,
      kyc,
      replacements: replacements.data ?? [],
      expenses: expenses.data ?? [],
      support: support.data,
      username: getSessionUser() ?? 'admin',
      hub,
      now: Date.now(),
      sim: sim.data,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  // Install the snapshot during render (idempotent) so every consumer below reads a consistent model.
  store.replace(state);

  const ready = fleet.isSuccess && riders.isSuccess;
  const failed = (fleet.isError || riders.isError) && !ready;

  if (failed) {
    return (
      <div className="content" style={{ maxWidth: 520, margin: '12vh auto' }}>
        <div className="card">
          <div className="empty">
            <b>Could not reach the Qvek API</b>
            <p>Check that the backend is running and NEXT_PUBLIC_API_URL points at it, then retry.</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                fleet.refetch();
                riders.refetch();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="content" style={{ maxWidth: 520, margin: '12vh auto' }}>
        <div className="card">
          <div className="empty">
            <span className="spinner" />
            <b>Loading fleet data…</b>
          </div>
        </div>
      </div>
    );
  }

  return <StoreVersionContext.Provider value={store.version}>{children}</StoreVersionContext.Provider>;
}
