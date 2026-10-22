'use client';

import Link from 'next/link';
import { Check, Copy, MapPin, MoonStar } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TD, TH, THead, TR, RowActions, Table } from '@/components/ui/table';
import { VEHICLE_STATUS_LABEL } from '@/lib/constants';
import { RiderStatusBadge } from '@/features/riders/badge';
import { ControlDialog } from './ops-dialogs';
import type { FleetRow } from './api';

const TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  ACTIVE: 'green',
  IMMOBILIZED: 'red',
  GRACE: 'amber',
  REPAIR: 'amber',
  OFFLINE: 'slate',
};

export function RecoveryCell({ row }: { row: FleetRow }) {
  const [copied, setCopied] = React.useState(false);
  if (!row.recovery?.mapsUrl) return <span className="text-muted2">—</span>;
  return (
    <RowActions>
      <a
        href={row.recovery.mapsUrl}
        target="_blank"
        rel="noreferrer"
        title="Open live location (paste into Recovery agents WhatsApp group)"
        className="rounded-md border border-edge p-1.5 hover:bg-hover"
      >
        <MapPin className="size-4" />
      </a>
      <button
        title="Copy location link"
        className="rounded-md border border-edge p-1.5 hover:bg-hover"
        onClick={async () => {
          await navigator.clipboard.writeText(row.recovery!.mapsUrl!);
          setCopied(true);
          toast.success('Location link copied — paste in Recovery agents group');
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </RowActions>
  );
}

export function FleetTable({ rows }: { rows: FleetRow[] }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Vehicle</TH>
          <TH>Status</TH>
          <TH>Rider</TH>
          <TH>Plan valid till</TH>
          <TH>Last GPS</TH>
          <TH>Recovery</TH>
          <TH>Control</TH>
        </TR>
      </THead>
      <tbody>
        {rows.map((r) => (
          <TR key={r.id}>
            <TD>
              <p className="font-medium tabular-nums">{r.vehicleNo}</p>
              <p className="text-xs text-muted2 tabular-nums">
                {r.chassisNo ? `Chassis ${r.chassisNo}` : 'No chassis on file'}
              </p>
            </TD>
            <TD>
              <span className="flex items-center gap-1.5">
                <Badge tone={TONE[r.status] ?? 'slate'}>{VEHICLE_STATUS_LABEL[r.status] ?? r.status}</Badge>
                {r.idle && (
                  <span title="No movement in 72 hours" className="text-amber-600 dark:text-amber-400">
                    <MoonStar className="size-4" />
                  </span>
                )}
              </span>
            </TD>
            <TD>
              {r.rider ? (
                <span className="flex flex-col gap-1">
                  <Link className="font-medium underline-offset-4 hover:underline" href={`/riders/${r.rider.id}`}>
                    {r.rider.name}
                  </Link>
                  <RiderStatusBadge status={r.rider.status} />
                </span>
              ) : (
                <span className="text-muted2">Unassigned</span>
              )}
            </TD>
            <TD className="tabular-nums">
              {r.rider?.planValidity ? new Date(r.rider.planValidity).toLocaleDateString('en-IN') : '—'}
            </TD>
            <TD className="tabular-nums">
              {r.lastPingAt ? new Date(r.lastPingAt).toLocaleString('en-IN') : '—'}
            </TD>
            <TD>
              <RecoveryCell row={r} />
            </TD>
            <TD>
              <RowActions>
                {r.status === 'IMMOBILIZED' ? (
                  <ControlDialog row={r} mode="reactivate" />
                ) : (
                  <ControlDialog row={r} mode="disarm" />
                )}
              </RowActions>
            </TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}

export function DisarmNote() {
  return (
    <p className="text-xs text-muted2">
      Immobilize cuts the GPS relay after confirmation; Unlock reactivates it. Failures leave state unchanged.
    </p>
  );
}
