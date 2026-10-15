'use client';

import { useQuery } from '@tanstack/react-query';
import type { TimelineFilter } from '@/lib/constants';
import { getTimeline } from './api';

export function useTimeline(riderId: string, filter: TimelineFilter = 'all') {
  return useQuery({
    queryKey: ['timeline', riderId, filter],
    queryFn: () => getTimeline(riderId, filter),
  });
}
