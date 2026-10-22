'use client';

import { PanelChrome } from '@/components/shared/panel-chrome';
import { EmptyState } from '@/components/shared/search';
import { Skeleton } from '@/components/ui/input';
import { AuditCard } from '@/features/audit/components';
import { useAuditLogs } from '@/features/audit/hooks';

export default function AuditPage() {
  const { data, isLoading, isError } = useAuditLogs();
  return (
    <PanelChrome>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
          <p className="pt-1 text-sm text-muted2">Who did what, when — approvals, payments, immobilizations. Read-only.</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load audit log" hint="Check the API URL and retry." />
        ) : !data?.length ? (
          <EmptyState title="No audit entries yet" hint="Actions across the panel will appear here." />
        ) : (
          <AuditCard entries={data} />
        )}
      </div>
    </PanelChrome>
  );
}
