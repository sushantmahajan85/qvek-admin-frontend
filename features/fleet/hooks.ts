'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import {
  assignVehicle,
  createVehicle,
  disarmVehicle,
  getFleet,
  getMap,
  listVehicles,
  logExpense,
  reactivateVehicle,
  replaceVehicle,
  updateRecord,
  type AssignInput,
  type ExpenseInput,
  type ReplaceInput,
  type VehicleInput,
  type VehicleRecord,
} from './api';

export function useFleet() {
  return useQuery({ queryKey: ['fleet'], queryFn: getFleet, refetchInterval: 60_000 });
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: listVehicles });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleInput) => createVehicle(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['fleet'] });
      toast.success('Vehicle added');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useAssignVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignInput) => assignVehicle(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['riders'] });
      toast.success('Vehicle assigned — rental starts through next Tuesday');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useUpdateRecord(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleRecord) => updateRecord(vehicleId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle record updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useReplaceVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReplaceInput) => replaceVehicle(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle swapped — rental continues uninterrupted');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useMap() {
  return useQuery({ queryKey: ['map'], queryFn: getMap, refetchInterval: 30_000 });
}

export function useControlVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode, reason }: { id: string; mode: 'disarm' | 'reactivate'; reason: string }) =>
      mode === 'disarm' ? disarmVehicle(id, reason) : reactivateVehicle(id, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['map'] });
      toast.success(v.mode === 'disarm' ? 'Vehicle immobilized' : 'Vehicle reactivated');
    },
    onError: (e) =>
      toast.error(
        errorText(
          e instanceof ApiError ? e.code : undefined,
          e instanceof ApiError && e.code === 'IOP_UNREACHABLE'
            ? 'Relay unreachable — state unchanged'
            : undefined,
        ),
      ),
  });
}
export function useLogExpense(riderId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => logExpense(input),
    onSuccess: () => {
      if (riderId) {
        qc.invalidateQueries({ queryKey: ['timeline', riderId] });
      }
      toast.success('Expense logged — visible under Service Logs');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
