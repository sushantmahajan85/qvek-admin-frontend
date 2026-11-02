'use client';

import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { setSession, setSessionUser } from '@/lib/auth-session';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { adminLogin, confirmMfa, disableMfa, mfaStatus, setupMfa, verifyMfa, type LoginInput } from './api';

export function useAdminLogin() {
  const router = useRouter();
  const [tempToken, setTempToken] = React.useState<string | null>(null);
  const login = useMutation({
    mutationFn: (input: LoginInput) => adminLogin(input),
    onSuccess: (res, input) => {
      setSessionUser(input.username);
      if (res.mfaRequired) {
        setTempToken(res.tempToken);
      } else {
        setSession(res.accessToken, res.refreshToken);
        toast.success('Signed in', 'Welcome back');
        router.replace('/dashboard');
      }
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
  const mfa = useMutation({
    mutationFn: (code: string) => verifyMfa(tempToken ?? '', code),
    onSuccess: (s) => {
      setSession(s.accessToken, s.refreshToken);
      toast.success('Signed in', 'Welcome back');
      router.replace('/dashboard');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
  const backToCredentials = React.useCallback(() => {
    setTempToken(null);
    login.reset();
    mfa.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { login, mfa, mfaRequired: tempToken !== null, backToCredentials };
}

export function useSetupMfa() {
  return useMutation({
    mutationFn: setupMfa,
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useConfirmMfa() {
  return useMutation({
    mutationFn: confirmMfa,
    onSuccess: () => toast.success('2FA enabled', 'Next sign-in will ask for a code'),
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useDisableMfa() {
  return useMutation({
    mutationFn: disableMfa,
    onSuccess: () => toast.success('2FA disabled'),
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}

export function useMfaStatus(active = true) {
  // Lazy query — only fetched when the Settings page mounts.
  return useQuery({
    queryKey: ['mfa-status'],
    queryFn: mfaStatus,
    enabled: active,
    staleTime: 30_000,
  });
}
