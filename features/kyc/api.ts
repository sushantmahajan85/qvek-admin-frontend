import { z } from 'zod';
import { ApiError, apiGet, apiPost } from '@/lib/api-client';

export interface KycDoc {
  key: string;
  url: string;
  expiresInSec: number;
}

export interface KycData {
  id: string;
  riderId: string;
  fullName: string | null;
  aadhaar: string | null;
  pan: string | null;
  dlNo: string | null;
  bankAcct: string | null;
  verified: boolean;
  updatedAt: string;
  docs?: KycDoc[];
}

export const kycKeys = {
  one: (id: string) => ['kyc', id] as const,
};

export async function getKyc(riderId: string): Promise<KycData> {
  return apiGet<KycData>(`/admin/riders/${riderId}/kyc`);
}

/** 
ull when the rider has no KYC on file yet (the API answers 404). */
export async function getKycOrNull(riderId: string): Promise<KycData | null> {
  try {
    return await getKyc(riderId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const kycSchema = z.object({
  fullName: z.string().min(2).max(100).optional().or(z.literal('')),
  aadhaarNo: z.string().regex(/^\d{12}$/, '12 digits').optional().or(z.literal('')),
  panNo: z.string().min(10).max(10).optional().or(z.literal('')),
  dlNo: z.string().min(5).max(20).optional().or(z.literal('')),
  bankAcctNo: z.string().min(6).max(20).optional().or(z.literal('')),
  verified: z.boolean().optional(),
});
export type KycInput = z.infer<typeof kycSchema>;

function clean(input: KycInput): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== '' && v !== undefined));
}

export async function upsertKyc(riderId: string, input: KycInput): Promise<KycData> {
  return apiPost<KycData>(`/admin/riders/${riderId}/kyc`, clean(input));
}
