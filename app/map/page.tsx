'use client';

import dynamic from 'next/dynamic';
import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { MapLegend } from '@/features/fleet/map-view';
import { useMap } from '@/features/fleet/hooks';

const FleetMap = dynamic(
  () => import('@/features/fleet/map-view').then((m) => m.FleetMap),
  { ssr: false, loading: () => <Skeleton className="h-[60vh] w-full" /> },
);

export default function MapPage() {
  const { data, isLoading, isError } = useMap();
  const tracked = data?.vehicles.filter((v) => v.lat != null).length ?? 0;
  return (
    <PanelChrome>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live map</h1>
          <p className="pt-1 text-sm text-muted2">
            {tracked} of {data?.vehicles.length ?? 0} scooters reporting position · refreshes every 30s
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-[60vh] w-full" />
        ) : isError || !data ? (
          <EmptyState title="Could not load map" hint="Check the API URL and retry." />
        ) : (
          <>
            <FleetMap data={data} />
            <MapLegend />
            {!data.shop && (
              <p className="text-xs text-muted2">
                Shop location not set — zone rings appear after configuring it in Settings.
              </p>
            )}
          </>
        )}
      </div>
    </PanelChrome>
  );
}
