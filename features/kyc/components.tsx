'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/input';
import { FileText } from 'lucide-react';
import { kycSchema, type KycData, type KycInput } from './api';
import { useUpsertKyc } from './hooks';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted2">{label}</dt>
      <dd className="tabular-nums">{value ?? '—'}</dd>
    </div>
  );
}

export function KycCard({ kyc, loading }: { kyc?: KycData | null; loading?: boolean }) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  if (!kyc)
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted2">No KYC on file yet — fill the form below.</p>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KYC</CardTitle>
          <Badge tone={kyc.verified ? 'green' : 'amber'}>{kyc.verified ? 'Verified' : 'Unverified'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <Field label="Full name" value={kyc.fullName} />
          <Field label="Aadhaar" value={kyc.aadhaar} />
          <Field label="PAN" value={kyc.pan} />
          <Field label="Driving licence" value={kyc.dlNo} />
          <Field label="Bank a/c" value={kyc.bankAcct} />
        </dl>
        {kyc.docs?.length ? (
          <div className="mt-3 flex flex-col gap-1">
            {kyc.docs.map((d) => (
              <a
                key={d.key}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
              >
                <FileText className="size-4" /> {d.key.split('/').pop()}
              </a>
            ))}
            <p className="text-xs text-muted2">Links expire in 5 minutes and are never cached.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const FIELDS: Array<{ name: keyof KycInput; label: string; placeholder: string }> = [
  { name: 'fullName', label: 'Full name', placeholder: 'As per Aadhaar' },
  { name: 'aadhaarNo', label: 'Aadhaar number', placeholder: '12 digits' },
  { name: 'panNo', label: 'PAN', placeholder: '10 chars' },
  { name: 'dlNo', label: 'Driving licence', placeholder: 'DL number' },
  { name: 'bankAcctNo', label: 'Bank account', placeholder: 'Account number' },
];

export function KycForm({ riderId, initial }: { riderId: string; initial?: KycData | null }) {
  const { mutate, isPending } = useUpsertKyc(riderId);
  const { register, handleSubmit, formState } = useForm<KycInput>({
    resolver: zodResolver(kycSchema),
    defaultValues: { fullName: initial?.fullName ?? '', verified: initial?.verified ?? false },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Update KYC</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit((v) => mutate(v))}>
          {FIELDS.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs text-muted2">{f.label}</label>
              <Input placeholder={f.placeholder} {...register(f.name)} />
              {formState.errors[f.name] && (
                <p className="text-xs text-red-500">{String(formState.errors[f.name]?.message)}</p>
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('verified')} /> Mark verified
          </label>
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save KYC'}
            </Button>
          </div>
        </form>
        <p className="pt-2 text-xs text-muted2">Only last-4 digits are stored — full numbers never persist.</p>
      </CardContent>
    </Card>
  );
}
