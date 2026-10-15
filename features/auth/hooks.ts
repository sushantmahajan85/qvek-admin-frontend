'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setSession } from '@/lib/auth-session';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { adminLogin, setupMfa, verifyMfa, type LoginInput } from './api';

export function useAdminLogin() {
  const router = useRouter();
  const [tempToken, setTempToken] = React.useState<string | null>(null);
  const login = useMutation({
    mutationFn: (input: LoginInput) => adminLogin(input),
    onSuccess: (res) => {
      if (res.mfaRequired) {
        setTempToken(res.tempToken);
      } else {
        setSession(res.accessToken, res.refreshToken);
        router.replace('/dashboard');
      }
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
  const mfa = useMutation({
    mutationFn: (code: string) => verifyMfa(tempToken ?? '', code),
    onSuccess: (s) => {
      setSession(s.accessToken, s.refreshToken);
      router.replace('/dashboard');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
  return { login, mfa, mfaRequired: tempToken !== null };
}

export function useSetupMfa() {
  return useMutation({
    mutationFn: setupMfa,
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
