'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { TD, TH, THead, TR, Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssignDialog, VehicleDialog } from '@/features/fleet/dialogs';
import { RecordDialog } from '@/features/fleet/ops-dialogs';
import { useVehicles } from '@/features/fleet/hooks';

export default function VehiclesPage() {
  const { data, isLoading, isError } = useVehicles();
  return (
    <PanelChrome>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Vehicles</h1>
          <div className="flex gap-2">
            <VehicleDialog />
            <AssignDialog />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load vehicles" hint="Check the API URL and retry." />
        ) : !data?.length ? (
          <EmptyState title="No vehicles yet" hint="Add your first scooter to get started." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>Chassis</TH>
                <TH>IOP id</TH>
                <TH>Status</TH>
                <TH>Record</TH>
              </TR>
            </THead>
            <tbody>
              {data.map((v) => (
                <TR key={v.id}>
                  <TD className="font-medium tabular-nums">{v.vehicleNo}</TD>
                  <TD className="tabular-nums">{v.chassisNo ?? '—'}</TD>
                  <TD className="tabular-nums">{v.iopId}</TD>
                  <TD>
                    <Badge tone={v.status === 'ACTIVE' ? 'green' : 'slate'}>{v.status}</Badge>
                  </TD>
                  <TD>
                    <RecordDialog row={{ ...v, lat: null, lng: null, lastPingAt: null, assignment: null, rider: null, recovery: null }} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </PanelChrome>
  );
}
