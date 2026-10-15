import { z } from 'zod';
import { apiPost } from '@/lib/api-client';

export const loginSchema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(64),
  password: z.string().min(12, 'Min 12 chars').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type LoginResult =
  | { mfaRequired: false; accessToken: string; refreshToken: string }
  | { mfaRequired: true; tempToken: string };

export async function adminLogin(input: LoginInput): Promise<LoginResult> {
  return apiPost<LoginResult>('/auth/admin/login', input);
}

export async function verifyMfa(tempToken: string, code: string) {
  return apiPost<{ accessToken: string; refreshToken: string }>('/auth/admin/mfa/verify', {
    tempToken,
    code,
  });
}

export async function setupMfa(): Promise<{ otpauthUrl: string }> {
  return apiPost<{ otpauthUrl: string }>('/auth/admin/mfa/setup');
}
