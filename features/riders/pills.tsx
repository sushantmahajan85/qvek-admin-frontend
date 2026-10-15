'use client';

import { cn } from '@/lib/utils';
import { RIDER_STATUS, RIDER_STATUS_LABEL, type RiderStatus } from '@/lib/constants';

export type RiderFilter = 'ALL' | RiderStatus;

export function StatusPills({
  value,
  onChange,
  counts,
}: {
  value: RiderFilter;
  onChange: (v: RiderFilter) => void;
  counts?: Partial<Record<RiderFilter, number>>;
}) {
  const all: RiderFilter[] = ['ALL', ...RIDER_STATUS];
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'rounded-full border border-edge px-3 py-1 text-xs font-medium hover:bg-hover',
            value === s ? 'bg-graphite text-white' : 'bg-card text-muted2',
          )}
        >
          {s === 'ALL' ? 'All' : RIDER_STATUS_LABEL[s]}
          {counts?.[s] != null ? ` · ${counts[s]}` : ''}
        </button>
      ))}
    </div>
  );
}
