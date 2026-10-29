'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import type { RiderStatus } from '@/lib/constants';
import { approveRider, cancelRiderDeletion, createRider, getRider, listRiders, purgeRider, refundRiderDeposit, rejectRider, returnRiderVehicle, riderKeys, transitionRider, updateRider, type ReturnResult, type UpdateRiderInput } from './api';

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

export function useUpdateRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRiderInput) => updateRider(id, input),
    onSuccess: () => {
      invalidate(qc, id);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      toast.success('Rider details updated');
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

export function usePurgeRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => purgeRider(id),
    onSuccess: (r) => {
      invalidate(qc, id);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
      toast.success(`Account purged — ${r.documentsDeleted ?? 0} document(s) removed`);
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useCancelRiderDeletion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelRiderDeletion(id),
    onSuccess: () => {
      invalidate(qc, id);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      toast.success('Deletion request cancelled — account restored');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

/** Refresh rider + fleet + money views after a return/refund. */
function refreshSettlement(qc: ReturnType<typeof useQueryClient>, id: string) {
  invalidate(qc, id);
  qc.invalidateQueries({ queryKey: ['fleet'] });
  qc.invalidateQueries({ queryKey: ['timeline'] });
  qc.invalidateQueries({ queryKey: ['payments'] });
}

export function useReturnRider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason?: string; vehicleStatus?: 'INACTIVE' | 'REPAIR' }) =>
      returnRiderVehicle(id, input),
    onSuccess: (r: ReturnResult) => {
      refreshSettlement(qc, id);
      toast.success(
        r.assignmentEnded
          ? `Vehicle released (${r.vehicleStatus}) — rider marked Returned`
          : 'Rider marked Returned (no vehicle was assigned)',
      );
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useRefundDeposit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => refundRiderDeposit(id, reason),
    onSuccess: (r) => {
      refreshSettlement(qc, id);
      toast.success(`Deposit refund recorded — ₹${Math.round(r.amountPaise / 100).toLocaleString('en-IN')}`);
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
