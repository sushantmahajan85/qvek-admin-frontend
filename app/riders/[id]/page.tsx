'use client';

import { useParams } from 'next/navigation';
import { PanelChrome } from '@/components/shared/panel-chrome';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/input';
import { RiderStatusBadge } from '@/features/riders/badge';
import { ApproveDialog, StatusDialog } from '@/features/riders/dialogs';
import { useRider } from '@/features/riders/hooks';
import { KycCard, KycForm } from '@/features/kyc/components';
import { useKyc } from '@/features/kyc/hooks';
import { TimelineList } from '@/features/timeline/components';
import { useTimeline } from '@/features/timeline/hooks';

export default function RiderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useRider(id);
  const { data: kyc, isLoading: kycLoading } = useKyc(id);
  const { data: timeline, isLoading: timelineLoading } = useTimeline(id);
  return (
    <PanelChrome>
      {isLoading || !data ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{data.name}</h1>
              <p className="text-sm text-muted2 tabular-nums">{data.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <RiderStatusBadge status={data.status} />
              {data.status === 'PENDING' && <ApproveDialog riderId={data.id} riderName={data.name} />}
              <StatusDialog riderId={data.id} />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div><dt className="text-muted2">Age</dt><dd>{data.age ?? '—'}</dd></div>
                <div><dt className="text-muted2">Platform</dt><dd>{data.platform ?? '—'}</dd></div>
                <div><dt className="text-muted2">Paid token</dt><dd>{data.paidToken ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-muted2">Since</dt><dd>{new Date(data.createdAt).toLocaleDateString('en-IN')}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <KycCard kyc={kyc ?? null} loading={kycLoading} />
          <KycForm riderId={data.id} initial={kyc ?? null} />
          <TimelineList entries={timeline} loading={timelineLoading} />
        </div>
      )}
    </PanelChrome>
  );
}
