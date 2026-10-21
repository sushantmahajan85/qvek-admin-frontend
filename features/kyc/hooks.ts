'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getKycOrNull, kycKeys, upsertKyc, type KycInput } from './api';

export function useKyc(riderId: string) {
  return useQuery({ queryKey: kycKeys.one(riderId), queryFn: () => getKycOrNull(riderId) });
}

export function useUpsertKyc(riderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: KycInput) => upsertKyc(riderId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kycKeys.one(riderId) });
      qc.invalidateQueries({ queryKey: ['timeline'] });
      toast.success('KYC saved');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
