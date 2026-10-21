'use client';

// Simulated (browser-local) admin actions for things the backend has no endpoint for yet.
// See lib/qvek/sim.ts for the overlay these write into.
import { sim } from '@/lib/qvek/sim';
import { D } from '@/lib/qvek/store';
import type { AssetStatus, HistoryItem, LogAction, LogEntry, RecoveryStep, Recovery, Vehicle } from '@/lib/qvek/types';
import { U } from '@/lib/qvek/utils';

const lid = () => U.uid('sim');

function logEntry(v: Vehicle | undefined, action: LogAction, reason: string): LogEntry {
  return { id: lid(), at: D.now(), vehicleId: v?.id ?? null, riderId: v?.riderId ?? null, action, mode: 'manual', reason, by: 'Admin', result: 'simulated' };
}

function history(type: HistoryItem['type'], title: string, detail: string): HistoryItem {
  return { id: lid(), at: D.now(), type, title, detail };
}

/** Immobilize / unlock. Returns false when the vehicle is already in that state. */
export function simControl(v: Vehicle, op: 'immobilize' | 'reactivate', reason: string): boolean {
  const im = op === 'immobilize';
  if (v.immobilized === im) return false;
  sim.update((d) => {
    d.vehicles[v.id] = { ...d.vehicles[v.id], immobilized: im, immobilizedReason: im ? 'manual' : null };
    d.logs.push(logEntry(v, im ? 'immobilize' : 'reactivate', reason));
    (d.history[v.id] ||= []).push(history('control', im ? 'Immobilized by admin' : 'Unlocked by admin', reason));
  });
  return true;
}

/** Vehicle status override (Active / Inactive / Repair_req) — display only until the backend supports it. */
export function simVehicleStatus(v: Vehicle, status: AssetStatus, reason: string) {
  sim.update((d) => {
    d.vehicles[v.id] = { ...d.vehicles[v.id], status };
    d.logs.push(logEntry(v, 'status', `Vehicle status ${v.status} → ${status}${reason ? ` (${reason})` : ''}`));
    (d.history[v.id] ||= []).push(history('status', `Status → ${status}`, reason || 'Set by admin'));
  });
}

export function simRiderEdit(riderId: string, patch: { name?: string; phone?: string; age?: number; platform?: string }, what: string) {
  sim.update((d) => {
    d.riders[riderId] = { ...d.riders[riderId], ...patch };
    (d.riderEdits[riderId] ||= []).push({ at: D.now(), by: 'Admin', what });
  });
}

/** Recovery progress that has no backend state (location shared, agent reached, vehicle unlocked). */
export function simRecoveryStep(rc: Recovery, v: Vehicle | undefined, step: Exclude<RecoveryStep, 'returned'>) {
  sim.update((d) => {
    d.recoverySteps[rc.vehicleId] = { ...d.recoverySteps[rc.vehicleId], [step]: D.now() };
    if (v) {
      const text =
        step === 'unlocked'
          ? 'Recovery — agent on site, unlocked to ride back'
          : step === 'agentCalled'
            ? 'Recovery agent reached vehicle and called admin'
            : 'Recovery location link copied for agents group';
      d.logs.push(logEntry(v, 'recovery', text));
      if (step === 'unlocked') d.vehicles[v.id] = { ...d.vehicles[v.id], immobilized: false, immobilizedReason: null };
    }
  });
}

/** Keeps a finished recovery in the "closed" list after the rider moves to RETURNED on the server. */
export function simCloseRecovery(rc: Recovery, v: Vehicle | undefined) {
  sim.update((d) => {
    d.closedRecoveries.push({ ...rc, steps: { ...rc.steps, returned: D.now() }, closedAt: D.now() });
    if (v) d.logs.push(logEntry(v, 'recovery', 'Vehicle ridden back to facility — recovery closed'));
    delete d.recoverySteps[rc.vehicleId];
  });
}

export function simMarkAlertsRead(ids: string[]) {
  sim.update((d) => {
    ids.forEach((id) => {
      if (!d.alertsRead.includes(id)) d.alertsRead.push(id);
    });
  });
}
