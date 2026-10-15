import { z } from 'zod';
import { apiPost } from '@/lib/api-client';

export const loginSchema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(64),
  password: z.string().min(12, 'Min 12 chars').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export async function adminLogin(input: LoginInput): Promise<Session> {
  return apiPost<Session>('/auth/admin/login', input);
}
