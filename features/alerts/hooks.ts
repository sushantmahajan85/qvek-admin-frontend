'use client';

import { useQuery } from '@tanstack/react-query';
import { listAlerts } from './api';

export function useAlerts(limit = 50) {
  return useQuery({ queryKey: ['alerts', limit], queryFn: () => listAlerts(limit), refetchInterval: 60_000 });
}
