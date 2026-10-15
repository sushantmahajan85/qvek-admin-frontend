'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PLAN_LABEL, PLANS } from '@/lib/constants';
import { formatPaise } from './api';
import { useSetSupport, useSupport } from './hooks';
import { useSetupMfa } from '@/features/auth/hooks';

const schema = z.object({ callNumber: z.string().min(10).max(16) });

export function SupportCard() {
  const { data, isLoading } = useSupport();
  const { mutate, isPending } = useSetSupport();
  const { register, handleSubmit } = useForm<{ callNumber: string }>({
    resolver: zodResolver(schema),
    values: data ? { callNumber: data.callNumber ?? '' } : undefined,
  });
  if (isLoading) return <Skeleton className="h-44 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Support contact</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="pb-3 text-sm text-muted2">
          Shown on the rider app&apos;s Contact Admin buttons. Weekly rent: {formatPaise(data?.weeklyRentPaise ?? 0)} (server-set).
        </p>
        <form className="flex max-w-sm flex-col gap-3" onSubmit={handleSubmit((v) => mutate(v.callNumber))}>
          <Input placeholder="+91XXXXXXXXXX" {...register('callNumber')} />
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PlansCard() {
  const { data, isLoading } = useSupport();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recharge plans</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          {PLANS.map((p) => (
            <div key={p} className="rounded-lg border border-edge px-3 py-2">
              <dt className="text-muted2">{PLAN_LABEL[p]}</dt>
              <dd className="font-semibold tabular-nums">{formatPaise(data?.plans?.[p] ?? 0)}</dd>
            </div>
          ))}
        </dl>
        <p className="pt-2 text-xs text-muted2">All plans run Tuesday to Tuesday. Prices are server-set.</p>
      </CardContent>
    </Card>
  );
}

export function MfaSetupCard() {
  const [url, setUrl] = React.useState<string | null>(null);
  const { mutate, isPending } = useSetupMfa();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
      </CardHeader>
      <CardContent>
        {!url ? (
          <>
            <p className="pb-3 text-sm text-muted2">
              Protect this shared login with an authenticator app. Next sign-in asks for a 6-digit code.
            </p>
            <Button disabled={isPending} onClick={() => mutate(undefined, { onSuccess: (d) => setUrl(d.otpauthUrl) })}>
              {isPending ? 'Generating…' : 'Enable 2FA'}
            </Button>
          </>
        ) : (
          <>
            <p className="pb-2 text-sm text-muted2">
              Scan this URL in your authenticator app (or paste it), then sign out and back in to verify:
            </p>
            <code className="block break-all rounded-lg border border-edge bg-hover p-3 text-xs">{url}</code>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MockCaptureNote() {  return (
    <Card>
      <CardHeader>
        <CardTitle>Test payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge tone="amber">DEV ONLY</Badge>
        <p className="pt-2 text-sm text-muted2">
          Set <code>NEXT_PUBLIC_ENABLE_MOCK_CAPTURE=1</code> in <code>.env.local</code> and restart to
          simulate Razorpay captures from rider timelines. Never enabled in production.
        </p>
      </CardContent>
    </Card>
  );
}
