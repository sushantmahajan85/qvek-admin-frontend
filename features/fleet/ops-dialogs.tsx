'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { useControlVehicle, useLogExpense, useReplaceVehicle, useUpdateRecord } from './hooks';
import type { FleetRow } from './api';

export function ControlDialog({
  row,
  mode,
}: {
  row: FleetRow;
  mode: 'disarm' | 'reactivate';
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const { mutate, isPending } = useControlVehicle();
  const valid = reason.trim().length >= 3;
  const disarm = mode === 'disarm';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={disarm ? 'destructive' : 'default'} size="sm">
          {disarm ? 'Immobilize' : 'Unlock'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {disarm ? 'Immobilize' : 'Unlock'} {row.vehicleNo}?
        </DialogTitle>
        <DialogDescription>
          {disarm
            ? 'Cuts the scooter relay via GPS. The rider is notified.'
            : 'Reactivates the scooter relay via GPS.'}{' '}
          Relay confirms first — on failure nothing changes.
        </DialogDescription>
        <Textarea
          placeholder="Reason — min 3 chars, stored in audit log"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant={disarm ? 'destructive' : 'default'}
            disabled={!valid || isPending}
            onClick={() =>
              mutate(
                { id: row.id, mode, reason: reason.trim() },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {isPending ? 'Sending…' : disarm ? 'Immobilize' : 'Unlock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordDialog({ row }: { row: FleetRow }) {
  const [open, setOpen] = React.useState(false);
  const { mutate, isPending } = useUpdateRecord(row.id);
  const [form, setForm] = React.useState({
    chassisNo: row.chassisNo ?? '',
    motorNo: row.motorNo ?? '',
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit record</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Vehicle record — {row.vehicleNo}</DialogTitle>
        <DialogDescription>Chassis No. is the master record. Replaced numbers stay in history.</DialogDescription>
        <Input
          placeholder="Chassis No."
          value={form.chassisNo}
          onChange={(e) => setForm({ ...form, chassisNo: e.target.value })}
        />
        <Input
          placeholder="Motor No."
          value={form.motorNo}
          onChange={(e) => setForm({ ...form, motorNo: e.target.value })}
        />
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() =>
              mutate(
                Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')),
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReplaceDialog({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [open, setOpen] = React.useState(false);
  const { mutate, isPending } = useReplaceVehicle();
  const [form, setForm] = React.useState({ newVehicleId: '', reason: '', odometerOldKm: '', odometerNewKm: '' });
  const valid = form.newVehicleId !== '' && form.reason.trim().length >= 3;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Replace vehicle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Replace vehicle — {riderName}</DialogTitle>
        <DialogDescription>Swap for breakdown or repair. Rental continues uninterrupted.</DialogDescription>
        <Input
          placeholder="New vehicle id"
          value={form.newVehicleId}
          onChange={(e) => setForm({ ...form, newVehicleId: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Old odo (km)"
            inputMode="numeric"
            value={form.odometerOldKm}
            onChange={(e) => setForm({ ...form, odometerOldKm: e.target.value })}
          />
          <Input
            placeholder="New odo (km)"
            inputMode="numeric"
            value={form.odometerNewKm}
            onChange={(e) => setForm({ ...form, odometerNewKm: e.target.value })}
          />
        </div>
        <Textarea
          placeholder="Reason — min 3 chars, stored in audit log"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <DialogFooter>
          <Button
            disabled={!valid || isPending}
            onClick={() =>
              mutate(
                {
                  riderId,
                  newVehicleId: form.newVehicleId.trim(),
                  reason: form.reason.trim(),
                  ...(form.odometerOldKm ? { odometerOldKm: Number(form.odometerOldKm) } : {}),
                  ...(form.odometerNewKm ? { odometerNewKm: Number(form.odometerNewKm) } : {}),
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {isPending ? 'Swapping…' : 'Swap'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EXPENSE_KINDS = ['DEPOSIT_PENDING', 'REPAIR', 'SERVICING'] as const;

export function ExpenseDialog({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [open, setOpen] = React.useState(false);
  const { mutate, isPending } = useLogExpense(riderId);
  const [kind, setKind] = React.useState<(typeof EXPENSE_KINDS)[number]>('REPAIR');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const valid = Number(amount) > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Log expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Log expense — {riderName}</DialogTitle>
        <DialogDescription>Appears in the financial history under Service Logs.</DialogDescription>
        <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          {EXPENSE_KINDS.map((k) => (
            <option key={k} value={k}>{k.replace('_', ' ')}</option>
          ))}
        </Select>
        <Input
          placeholder="Amount in ₹"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Textarea placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <DialogFooter>
          <Button
            disabled={!valid || isPending}
            onClick={() =>
              mutate(
                {
                  riderId,
                  kind,
                  amountPaise: Math.round(Number(amount) * 100),
                  ...(note.trim() ? { note: note.trim() } : {}),
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
