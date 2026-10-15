'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/input';
import { formatPaise, type TimelineEntry } from './api';

const TONE: Record<string, 'green' | 'amber' | 'blue' | 'slate'> = {
  DEPOSIT: 'blue',
  RENT: 'green',
  ADJUSTMENT: 'amber',
  REFUND: 'slate',
  SETTLEMENT: 'slate',
};

export function TimelineList({ entries, loading }: { entries?: TimelineEntry[]; loading?: boolean }) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  if (!entries?.length)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted2">No money events yet.</p>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial history</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {entries.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="flex items-start justify-between gap-3 border-b border-edge pb-3 last:border-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <Badge tone={TONE[e.kind] ?? 'slate'}>{e.kind}</Badge>
                <p className="text-xs text-muted2">{new Date(e.ts).toLocaleString('en-IN')}</p>
                {e.note && <p className="text-xs text-muted2">{e.note}</p>}
              </div>
              <p className="font-semibold tabular-nums">{formatPaise(e.amountPaise)}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
