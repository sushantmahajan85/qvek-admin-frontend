'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getSupport, setSupport } from './api';

export function useSupport() {
  return useQuery({ queryKey: ['support'], queryFn: getSupport });
}

export function useSetSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (callNumber: string) => setSupport(callNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support'] });
      toast.success('Support number updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
