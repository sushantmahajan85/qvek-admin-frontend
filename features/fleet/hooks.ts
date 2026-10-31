'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import {
  assignVehicle,
  bulkCreateVehicles,
  createVehicle,
  disarmVehicle,
  getAdminMap,
  getFleet,
  getFleetHealth,
  getReconcile,
  getVehicleLive,
  getVehicleOdometer,
  getVehicleTrack,
  listAuditLogs,
  listExpenses,
  listReplacements,
  listVehicles,
  logExpense,
  pollFleetNow,
  reactivateVehicle,
  renewVehicleSim,
  replaceVehicle,
  updateRecord,
  type AssignInput,
  type BulkVehiclesResult,
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

export function useBulkCreateVehicles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: VehicleInput[]) => bulkCreateVehicles(rows),
    onSuccess: (d: BulkVehiclesResult) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['admin-map'] });
      qc.invalidateQueries({ queryKey: ['fleet-health'] });
      const done = d.created + d.restored;
      toast.success(`${done} vehicle${done === 1 ? '' : 's'} imported${d.skipped ? ` — ${d.skipped} skipped` : ''}`);
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
      toast.success('Vehicle assigned — rental starts immediately');
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

// ---- Phase D: GPS fleet ops ----

export function useFleetHealth() {
  return useQuery({ queryKey: ['fleet-health'], queryFn: getFleetHealth, refetchInterval: 60_000 });
}

export function useVehicleLive(vehicleId: string, enabled = true) {
  return useQuery({
    queryKey: ['vehicle-live', vehicleId],
    queryFn: () => getVehicleLive(vehicleId),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useVehicleTrack(vehicleId: string, from: string, to: string, enabled = false) {
  return useQuery({
    queryKey: ['vehicle-track', vehicleId, from, to],
    queryFn: () => getVehicleTrack(vehicleId, from, to),
    enabled,
  });
}

export function useVehicleOdometer(vehicleId: string, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['vehicle-odometer', vehicleId, from, to],
    queryFn: () => getVehicleOdometer(vehicleId, from, to),
    enabled,
  });
}

export function useSimRenew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => renewVehicleSim(vehicleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-health'] });
      toast.success('SIM renewal sent to vendor');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useReconcile(enabled = false) {
  return useQuery({ queryKey: ['fleet-reconcile'], queryFn: getReconcile, enabled });
}

export function useAdminMap() {
  return useQuery({ queryKey: ['admin-map'], queryFn: getAdminMap, refetchInterval: 60_000 });
}

export function useDisarmVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => disarmVehicle(id, reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['admin-map'] });
      qc.invalidateQueries({ queryKey: ['vehicle-live', v.id] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Immobilize command sent — relay confirmed');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useReactivateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reactivateVehicle(id, reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['admin-map'] });
      qc.invalidateQueries({ queryKey: ['vehicle-live', v.id] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Unlock command sent — relay confirmed');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function usePollFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pollFleetNow(),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['admin-map'] });
      qc.invalidateQueries({ queryKey: ['fleet-health'] });
      toast.success(`Polled ${d.polled} trackers — ${d.updated} updated`);
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useAuditLogs(entity?: string, limit = 50) {
  return useQuery({
    queryKey: ['audit-logs', entity ?? 'all', limit],
    queryFn: () => listAuditLogs(entity, limit),
  });
}
