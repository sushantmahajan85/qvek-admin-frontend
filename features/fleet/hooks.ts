'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import {
  assignVehicle,
  createVehicle,
  getFleet,
  listExpenses,
  listReplacements,
  listVehicles,
  logExpense,
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

export function useReplacements() {
  return useQuery({ queryKey: ['replacements'], queryFn: listReplacements, refetchInterval: 60_000 });
}

export function useExpenses() {
  return useQuery({ queryKey: ['expenses'], queryFn: listExpenses, refetchInterval: 60_000 });
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
      qc.invalidateQueries({ queryKey: ['rider'] });
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
      qc.invalidateQueries({ queryKey: ['replacements'] });
      toast.success('Vehicle swapped — rental continues uninterrupted');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useLogExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => logExpense(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
      toast.success('Expense logged — visible under Service Logs');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
