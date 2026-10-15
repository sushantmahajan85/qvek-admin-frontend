'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/input';
import { ApproveDialog } from '@/features/riders/dialogs';
import { useRiders } from '@/features/riders/hooks';

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function StatCard({
  title,
  value,
  hint,
  loading,
}: {
  title: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            {hint && <p className="pt-1 text-xs text-muted2">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ApprovalQueue() {
  const { data, isLoading } = useRiders('');
  const pending = (data ?? []).filter((r) => r.status === 'PENDING');
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!pending.length) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Needs your decision</CardTitle>
          <Link href="/riders" className="flex items-center gap-1 text-sm text-muted2 hover:text-ink">
            All riders <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {pending.slice(0, 5).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted2 tabular-nums">
                  {r.phone} · joined {new Date(r.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <ApproveDialog riderId={r.id} riderName={r.name} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
