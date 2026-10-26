'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { getOps, getSupport, getUiConfig, getZones, setOps, setPricing, setSupport, setUiSection, setZones, type OpsInput, type PricingInput, type UiSectionName, type ZonesInput } from './api';

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

export function useOps() {
  return useQuery({ queryKey: ['ops'], queryFn: getOps, refetchInterval: 60_000 });
}

export function useSetOps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpsInput) => setOps(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops'] });
      toast.success('Operations settings updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useUiConfig() {
  return useQuery({ queryKey: ['ui'], queryFn: getUiConfig, refetchInterval: 60_000 });
}

export function useSetUiSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, value }: { section: UiSectionName; value: unknown }) => setUiSection(section, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ui'] });
      toast.success('App content updated — rider apps pick it up within minutes');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
