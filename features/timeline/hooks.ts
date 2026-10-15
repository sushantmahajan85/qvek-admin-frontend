'use client';

import { useQuery } from '@tanstack/react-query';
import { getTimeline } from './api';

export function useTimeline(riderId: string) {
  return useQuery({ queryKey: ['timeline', riderId], queryFn: () => getTimeline(riderId) });
}
