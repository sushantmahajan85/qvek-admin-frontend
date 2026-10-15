'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAssignVehicle, useCreateVehicle } from './hooks';
import { assignSchema, vehicleSchema, type AssignInput, type VehicleInput } from './api';
import { useRiders } from '@/features/riders/hooks';
import { useVehicles } from './hooks';

export function VehicleDialog() {
  const [open, setOpen] = React.useState(false);
  const { mutate, isPending } = useCreateVehicle();
  const { register, handleSubmit, reset } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add vehicle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add vehicle</DialogTitle>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => mutate(v, { onSuccess: () => { setOpen(false); reset(); } }))}
        >
          <Input placeholder="Vehicle number (e.g. QVEK-003)" {...register('vehicleNo')} />
          <Input placeholder="IOP device id" {...register('iopId')} />
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignDialog() {
  const [open, setOpen] = React.useState(false);
  const { mutate, isPending } = useAssignVehicle();
  const { data: riders } = useRiders('');
  const { data: vehicles } = useVehicles();
  const { register, handleSubmit } = useForm<AssignInput>({ resolver: zodResolver(assignSchema) });
  const activeRiders = (riders ?? []).filter((r) => r.status === 'ACTIVE');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Assign vehicle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Assign vehicle</DialogTitle>
        <DialogDescription>One active vehicle per rider. Rental starts through next Tuesday.</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => mutate(v, { onSuccess: () => setOpen(false) }))}
        >
          <Select {...register('riderId')} defaultValue="" placeholder="Select ACTIVE rider…">
            {activeRiders.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {r.phone}</option>
            ))}
          </Select>
          <Select {...register('vehicleId')} defaultValue="" placeholder="Select vehicle…">
            {(vehicles ?? []).map((v) => (
              <option key={v.id} value={v.id}>{v.vehicleNo}</option>
            ))}
          </Select>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
