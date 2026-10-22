'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from './api';

export function useAuditLogs(entity?: string) {
  return useQuery({
    queryKey: ['audit', entity ?? 'all'],
    queryFn: () => getAuditLogs(entity ? { entity } : undefined),
    refetchInterval: 60_000,
  });
}
