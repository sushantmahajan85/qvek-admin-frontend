'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import type { RiderStatus } from '@/lib/constants';
import { approveRider, createRider, getRider, listRiders, rejectRider, riderKeys, transitionRider } from './api';

export function useRiders(q: string) {
  return useQuery({ queryKey: riderKeys.list(q), queryFn: () => listRiders(q) });
}

export function useRider(id: string) {
  return useQuery({ queryKey: riderKeys.one(id), queryFn: () => getRider(id) });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: riderKeys.all });
  qc.invalidateQueries({ queryKey: riderKeys.one(id) });
}

export function useApproveRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paidToken: boolean) => approveRider(id, paidToken),
    onSuccess: () => {
      invalidate(qc, id);
      toast.success('Rider approved — app access unlocked');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useTransitionRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, reason }: { status: RiderStatus; reason: string }) =>
      transitionRider(id, status, reason),
    onSuccess: () => {
      invalidate(qc, id);
      toast.success('Status updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useCreateRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRider,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riderKeys.all });
      toast.success('Rider added — approve after KYC + deposit');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useRejectRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => rejectRider(id, reason),
    onSuccess: () => {
      invalidate(qc, id);
      toast.success('Application rejected');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
