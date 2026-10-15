'use client';

import { Badge } from '@/components/ui/badge';
import { RIDER_STATUS_LABEL, type RiderStatus } from '@/lib/constants';

const TONE: Record<RiderStatus, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  PENDING: 'amber',
  ACTIVE: 'green',
  INACTIVE: 'slate',
  MARKED_FOR_RECOVERY: 'red',
  BLACKLISTED: 'red',
  RETURNED: 'blue',
  REPAIR_REQ: 'amber',
};

export function RiderStatusBadge({ status }: { status: RiderStatus }) {
  return <Badge tone={TONE[status]}>{RIDER_STATUS_LABEL[status]}</Badge>;
}
