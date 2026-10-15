'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { DisarmNote, FleetTable } from '@/features/fleet/table';
import { AssignDialog, VehicleDialog } from '@/features/fleet/dialogs';
import { useFleet } from '@/features/fleet/hooks';

export default function FleetPage() {
  const { data, isLoading, isError } = useFleet();
  return (
    <PanelChrome>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Fleet</h1>
          <div className="flex gap-2">
            <VehicleDialog />
            <AssignDialog />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load fleet" hint="Check the API URL and retry." />
        ) : !data?.length ? (
          <EmptyState title="No vehicles yet" hint="Add your first scooter to get started." />
        ) : (
          <FleetTable rows={data} />
        )}
        <DisarmNote />
      </div>
    </PanelChrome>
  );
}
