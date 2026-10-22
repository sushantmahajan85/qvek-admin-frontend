'use client';

import { useQuery } from '@tanstack/react-query';
import { getAlerts } from './api';

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: () => getAlerts(50), refetchInterval: 30_000 });
}
