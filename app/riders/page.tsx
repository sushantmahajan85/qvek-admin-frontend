'use client';

import * as React from 'react';
import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState, SearchInput } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { StatusPills, type RiderFilter } from '@/features/riders/pills';
import { CreateDialog } from '@/features/riders/dialogs';
import { RiderTable } from '@/features/riders/table';
import { useRiders } from '@/features/riders/hooks';

export default function RidersPage() {
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<RiderFilter>('ALL');
  const { data, isLoading, isError } = useRiders(q);
  const filtered = (data ?? []).filter((r) => status === 'ALL' || r.status === status);
  const counts = React.useMemo(() => {
    const c: Partial<Record<RiderFilter, number>> = { ALL: data?.length ?? 0 };
    for (const r of data ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [data]);
  return (
    <PanelChrome>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Riders</h1>
            <p className="text-sm text-muted2">
              {filtered.length} rider{filtered.length === 1 ? '' : 's'} · approve KYC, manage lifecycle
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} />
            <CreateDialog />
          </div>
        </div>
        <StatusPills value={status} onChange={setStatus} counts={counts} />
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load riders" hint="Check the API URL and retry." />
        ) : !filtered.length ? (
          <EmptyState title="No riders found" hint="Try a different search or status filter." />
        ) : (
          <RiderTable riders={filtered} />
        )}
      </div>
    </PanelChrome>
  );
}
