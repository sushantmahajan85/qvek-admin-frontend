import { apiGet, apiPost } from '@/lib/api-client';

export interface AdminPayment {
  id: string;
  kind: string;
  amountPaise: number;
  status: string;
  gatewayOrderId?: string | null;
  createdAt: string;
}

export async function getPayments(riderId: string): Promise<AdminPayment[]> {
  return apiGet<AdminPayment[]>(`/admin/payments?riderId=${encodeURIComponent(riderId)}`);
}

export async function mockCapture(paymentId: string) {
  return apiPost(`/admin/payments/${paymentId}/mock-capture`);
}

export async function verifyPayment(paymentId: string, reason: string) {
  return apiPost(`/admin/payments/${paymentId}/verify`, { reason });
}
