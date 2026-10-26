'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getSupport, getZones, setPricing, setSupport, setZones, type PricingInput, type ZonesInput } from './api';

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
    mutationFn: (input: ZonesInput) => setZones(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['admin-map'] });
      toast.success('Service zones updated — device fences redraw within ~15 min');
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
      toast.success('Pricing updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
