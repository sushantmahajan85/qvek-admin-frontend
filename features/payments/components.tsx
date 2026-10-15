'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/input';
import { formatPaise } from '@/features/config/api';
import { mockCaptureEnabled, useMockCapture, usePayments } from './hooks';

export function TestingPayments({ riderId }: { riderId: string }) {
  const { data, isLoading } = usePayments(riderId, mockCaptureEnabled);
  const { mutate, isPending } = useMockCapture(riderId);
  if (!mockCaptureEnabled) return null;
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const pending = (data ?? []).filter((p) => p.status === 'PENDING');
  if (!pending.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test payments (dev only)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium tabular-nums">
                  {formatPaise(p.amountPaise)} · {p.kind}
                </p>
                <p className="text-xs text-muted2 tabular-nums">{p.gatewayOrderId}</p>
              </div>
              <Button size="sm" disabled={isPending} onClick={() => mutate(p.id)}>
                Simulate capture
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
