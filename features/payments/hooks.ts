'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getPayments, mockCapture, verifyPayment } from './api';

export const mockCaptureEnabled =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_MOCK_CAPTURE === '1';

export function usePayments(riderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payments', riderId],
    queryFn: () => getPayments(riderId),
    enabled,
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) => verifyPayment(paymentId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['riders'] });
      qc.invalidateQueries({ queryKey: ['rider'] });
      toast.success('Payment verified — rental extended');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useMockCapture(riderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => mockCapture(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', riderId] });
      qc.invalidateQueries({ queryKey: ['timeline', riderId] });
      qc.invalidateQueries({ queryKey: ['rider', riderId] });
      toast.success('Test payment captured — rental extended');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
