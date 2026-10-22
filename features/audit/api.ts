import { apiGet } from '@/lib/api-client';

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
}

export async function getAuditLogs(filter?: { entity?: string; entityId?: string }): Promise<AuditEntry[]> {
  const q = new URLSearchParams();
  if (filter?.entity) q.set('entity', filter.entity);
  if (filter?.entityId) q.set('entityId', filter.entityId);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiGet<AuditEntry[]>(`/admin/audit-logs${suffix}`);
}
