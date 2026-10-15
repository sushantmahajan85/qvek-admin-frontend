'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import {
  assignVehicle,
  createVehicle,
  getFleet,
  listVehicles,
  type AssignInput,
  type VehicleInput,
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
