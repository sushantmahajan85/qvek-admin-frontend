'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { toast } from '@/lib/toast';
import {
  getAudience,
  getBroadcasts,
  getTemplates,
  resetTemplate,
  saveTemplate,
  sendBroadcast,
  type SaveTemplateInput,
  type SendBroadcastInput,
} from './api';

export function useNotificationTemplates() {
  return useQuery({ queryKey: ['notification-templates'], queryFn: getTemplates });
}

export function useSaveNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, input }: { kind: string; input: SaveTemplateInput }) => saveTemplate(kind, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Notification updated');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useResetNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: string) => resetTemplate(kind),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Notification reset to default');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useNotificationAudience() {
  return useQuery({ queryKey: ['notification-audience'], queryFn: getAudience, refetchInterval: 60_000 });
}

export function useBroadcasts(limit = 50) {
  return useQuery({ queryKey: ['broadcasts', limit], queryFn: () => getBroadcasts(limit) });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendBroadcastInput) => sendBroadcast(input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      qc.invalidateQueries({ queryKey: ['notification-audience'] });
      toast.success(
        res.replay
          ? 'Already sent — duplicate suppressed'
          : `Sent to ${res.sent} device${res.sent === 1 ? '' : 's'}${res.failed ? ` · ${res.failed} failed` : ''}`,
      );
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
