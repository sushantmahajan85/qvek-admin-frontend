'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { useApproveRider, useTransitionRider } from './hooks';
import { RIDER_STATUS, RIDER_STATUS_LABEL, type RiderStatus } from '@/lib/constants';

export function ApproveDialog({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [open, setOpen] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const { mutate, isPending } = useApproveRider(riderId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Approve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Approve {riderName}?</DialogTitle>
        <DialogDescription>
          Confirms manual KYC plus the Rs.3,000 deposit and first week rent collected offline.
        </DialogDescription>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-edge px-3 py-2.5 text-sm hover:bg-hover">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-graphite" />
          Paid token collected
        </label>
        <DialogFooter>
          <Button
            disabled={!paid || isPending}
            onClick={() => mutate(true, { onSuccess: () => setOpen(false) })}
          >
            {isPending ? 'Approving…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TRANSITIONABLE = RIDER_STATUS.filter((s) => s !== 'PENDING');

export function StatusDialog({ riderId }: { riderId: string }) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<RiderStatus>('MARKED_FOR_RECOVERY');
  const [reason, setReason] = React.useState('');
  const { mutate, isPending } = useTransitionRider(riderId);
  const valid = reason.trim().length >= 3;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Change lifecycle status</DialogTitle>
        <DialogDescription>Every transition is audited with your name and reason.</DialogDescription>
        <Select value={status} onChange={(e) => setStatus(e.target.value as RiderStatus)}>
          {TRANSITIONABLE.map((s) => (
            <option key={s} value={s}>
              {RIDER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Textarea
          placeholder="Reason — min 3 chars, stored in audit log"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button
            disabled={!valid || isPending}
            onClick={() => mutate({ status, reason: reason.trim() }, { onSuccess: () => setOpen(false) })}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
