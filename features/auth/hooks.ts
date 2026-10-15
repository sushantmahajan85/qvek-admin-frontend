'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setSession } from '@/lib/auth-session';
import { ApiError } from '@/lib/api-client';
import { errorText } from '@/lib/error-map';
import { adminLogin, type LoginInput } from './api';

export function useAdminLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: LoginInput) => adminLogin(input),
    onSuccess: (s) => {
      setSession(s.accessToken, s.refreshToken);
      router.replace('/dashboard');
    },
    onError: (e) => toast.error(errorText(e instanceof ApiError ? e.code : undefined)),
  });
}
