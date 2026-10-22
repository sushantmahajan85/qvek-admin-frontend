'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getSupport, getZones, setPricing, setSupport, setZones, type PricingInput, type ZoneConfig } from './api';

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

export function useZones() {
  return useQuery({ queryKey: ['zones'], queryFn: getZones });
}

export function useSetZones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ZoneConfig>) => setZones(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['map'] });
      toast.success('Zones updated — geofence math is live');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useSetPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PricingInput) => setPricing(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support'] });
      toast.success('Pricing updated — applies to new intents immediately');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
