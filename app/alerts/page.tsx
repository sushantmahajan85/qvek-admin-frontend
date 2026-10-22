'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { AlertList } from '@/features/alerts/components';
import { useAlerts } from '@/features/alerts/hooks';

export default function AlertsPage() {
  const { data, isLoading, isError } = useAlerts();
  return (
    <PanelChrome>
      <div className="flex max-w-3xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="pt-1 text-sm text-muted2">Payments, geofence, immobilizations and offline events · live every 30s</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load alerts" hint="Check the API URL and retry." />
        ) : !data?.length ? (
          <EmptyState title="No alerts yet" hint="Events from payments and GPS will appear here." />
        ) : (
          <AlertList alerts={data} />
        )}
      </div>
    </PanelChrome>
  );
}
