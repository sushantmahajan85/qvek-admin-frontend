'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AlertItem } from './api';

const TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  PAYMENT_RECEIVED: 'green',
  RENTAL_EXPIRING: 'amber',
  GRACE_ENDING: 'amber',
  VEHICLE_DISARMED: 'red',
  VEHICLE_REACTIVATED: 'green',
  GEOFENCE_WARNING: 'amber',
  VEHICLE_OFFLINE: 'slate',
  RECOVERY: 'red',
};

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 border-b border-edge pb-3 last:border-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <Badge tone={TONE[a.kind] ?? 'slate'}>{a.kind.replaceAll('_', ' ')}</Badge>
                <span className="text-xs text-muted2">{new Date(a.createdAt).toLocaleString('en-IN')}</span>
              </span>
              <p className="text-sm font-medium">{a.title}</p>
              {a.riderId && (
                <Link href={`/riders/${a.riderId}`} className="text-xs text-blue-600 underline-offset-4 hover:underline dark:text-blue-400">
                  Open rider
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
