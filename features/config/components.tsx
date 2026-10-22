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
import { useSetPricing, useSetSupport, useSetZones, useSupport, useZones } from './hooks';
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
  const { mutate, isPending } = useSetPricing();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ weekly: '', fortnightly: '', fourWeekly: '', deposit: '' });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rupees = (paise: number | null | undefined) =>
    paise == null || paise === 0 ? '' : String(paise / 100);
  const startEdit = () =>
    setForm({
      weekly: rupees(data?.plans?.WEEKLY),
      fortnightly: rupees(data?.plans?.['2-WEEKLY']),
      fourWeekly: rupees(data?.plans?.['4-WEEKLY']),
      deposit: rupees(data?.depositPaise),
    });
  const save = () => {
    const toPaise = (v: string) => (v.trim() === '' ? undefined : Math.round(Number(v) * 100));
    if ([form.weekly, form.fortnightly, form.fourWeekly, form.deposit].some((v) => v.trim() !== '' && !(Number(v) >= 0))) {
      return;
    }
    mutate(
      {
        weeklyPaise: toPaise(form.weekly),
        fortnightlyPaise: toPaise(form.fortnightly),
        fourWeeklyPaise: toPaise(form.fourWeekly),
        depositPaise: toPaise(form.deposit),
      },
      { onSuccess: () => setEditing(false) },
    );
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recharge plans</CardTitle>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => { startEdit(); setEditing(true); }}>
              Edit pricing
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              {PLANS.map((p) => (
                <div key={p} className="rounded-lg border border-edge px-3 py-2">
                  <dt className="text-muted2">{PLAN_LABEL[p]}</dt>
                  <dd className="font-semibold tabular-nums">{formatPaise(data?.plans?.[p] ?? 0)}</dd>
                </div>
              ))}
              <div className="rounded-lg border border-edge px-3 py-2">
                <dt className="text-muted2">Deposit</dt>
                <dd className="font-semibold tabular-nums">{formatPaise(data?.depositPaise ?? 0)}</dd>
              </div>
            </dl>
            <p className="pt-2 text-xs text-muted2">All plans run Tuesday to Tuesday. Prices are server-set.</p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['weekly', 'Weekly (₹)'],
                  ['fortnightly', '2-Weekly (₹)'],
                  ['fourWeekly', '4-Weekly (₹)'],
                  ['deposit', 'Deposit (₹)'],
                ] as Array<[keyof typeof form, string]>
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs text-muted2">{label}</label>
                  <Input
                    inputMode="decimal"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button disabled={isPending} onClick={save}>
                {isPending ? 'Saving…' : 'Save pricing'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted2">Takes effect on the next payment intent. Existing rentals keep their validity.</p>
          </div>
        )}
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

export function ZoneCard() {
  const { data, isLoading } = useZones();
  const { mutate, isPending } = useSetZones();
  const { register, handleSubmit } = useForm({
    values: data
      ? {
          shopLat: data.shopLat ?? undefined,
          shopLng: data.shopLng ?? undefined,
          warningKm: data.warningKm,
          disarmKm: data.disarmKm,
        }
      : undefined,
  });
  if (isLoading) return <Skeleton className="h-44 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop location + geofence zones</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="pb-3 text-sm text-muted2">
          Zones are measured from the shop. Warning alerts at the first radius; scooters immobilize past the second.
        </p>
        <form
          className="grid max-w-lg grid-cols-2 gap-3"
          onSubmit={handleSubmit((v) =>
            mutate({
              ...(v.shopLat != null ? { shopLat: Number(v.shopLat) } : {}),
              ...(v.shopLng != null ? { shopLng: Number(v.shopLng) } : {}),
              ...(v.warningKm != null ? { warningKm: Number(v.warningKm) } : {}),
              ...(v.disarmKm != null ? { disarmKm: Number(v.disarmKm) } : {}),
            }),
          )}
        >
          <Input placeholder="Shop latitude" inputMode="decimal" {...register('shopLat')} />
          <Input placeholder="Shop longitude" inputMode="decimal" {...register('shopLng')} />
          <Input placeholder="Warning radius (km)" inputMode="decimal" {...register('warningKm')} />
          <Input placeholder="Disarm radius (km)" inputMode="decimal" {...register('disarmKm')} />
          <div className="col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save zones'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function MockCaptureNote() {
  return (
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
