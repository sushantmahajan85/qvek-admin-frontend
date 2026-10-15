'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PLAN_LABEL, TIMELINE_FILTERS, TIMELINE_FILTER_LABEL, type PlanId, type TimelineFilter } from '@/lib/constants';
import { formatPaise, type TimelineEntry } from './api';

const TONE: Record<string, 'green' | 'amber' | 'blue' | 'slate'> = {
  DEPOSIT: 'blue',
  RENT: 'green',
  ADJUSTMENT: 'amber',
  REFUND: 'slate',
  SETTLEMENT: 'slate',
  SERVICE: 'amber',
};

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  Success: 'green',
  Pending: 'amber',
  Failed: 'red',
};

export function TimelineFilters({
  value,
  onChange,
}: {
  value: TimelineFilter;
  onChange: (v: TimelineFilter) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {TIMELINE_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            'rounded-full border border-edge px-3 py-1 text-xs font-medium hover:bg-hover',
            value === f ? 'bg-graphite text-white' : 'bg-card text-muted2',
          )}
        >
          {TIMELINE_FILTER_LABEL[f]}
        </button>
      ))}
    </div>
  );
}

export function TimelineList({
  entries,
  loading,
  filter,
  onFilter,
}: {
  entries?: TimelineEntry[];
  loading?: boolean;
  filter: TimelineFilter;
  onFilter: (v: TimelineFilter) => void;
}) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Financial history</CardTitle>
          <TimelineFilters value={filter} onChange={onFilter} />
        </div>
      </CardHeader>
      <CardContent>
        {!entries?.length ? (
          <p className="text-sm text-muted2">No money events yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="flex items-start justify-between gap-3 border-b border-edge pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <Badge tone={TONE[e.kind] ?? 'slate'}>{e.kind}</Badge>
                    <Badge tone={STATUS_TONE[e.status] ?? 'slate'}>{e.status}</Badge>
                  </span>
                  <p className="text-xs text-muted2">
                    {new Date(e.ts).toLocaleString('en-IN')}
                    {e.plan ? ` · ${(PLAN_LABEL as Record<string, string>)[e.plan] ?? e.plan}` : ''}
                    {e.period ? ` · ${new Date(e.period.from).toLocaleDateString('en-IN')} → ${new Date(e.period.to).toLocaleDateString('en-IN')}` : ''}
                  </p>
                  {e.note && <p className="text-xs text-muted2">{e.note}</p>}
                </div>
                <p className="font-semibold tabular-nums">{formatPaise(e.amountPaise)}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
