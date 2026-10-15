'use client';

import Link from 'next/link';
import { Check, Copy, MapPin } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TD, TH, THead, TR, RowActions, Table } from '@/components/ui/table';
import { RiderStatusBadge } from '@/features/riders/badge';
import type { FleetRow } from './api';

const TONE: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  ACTIVE: 'green',
  WARNING: 'amber',
  DISARMED: 'red',
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
          <TH>Recovery</TH>
        </TR>
      </THead>
      <tbody>
        {rows.map((r) => (
          <TR key={r.id}>
            <TD className="font-medium tabular-nums">{r.vehicleNo}</TD>
            <TD>
              <Badge tone={TONE[r.status] ?? 'slate'}>{r.status}</Badge>
            </TD>
            <TD>
              {r.rider ? (
                <span className="flex items-center gap-2">
                  <Link className="underline-offset-4 hover:underline" href={`/riders/${r.rider.id}`}>
                    {r.rider.name}
                  </Link>
                  <RiderStatusBadge status={r.rider.status} />
                </span>
              ) : (
                <span className="text-muted2">Unassigned</span>
              )}
            </TD>
            <TD>
              <RecoveryCell row={r} />
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
      Remote disarm / reactivate arrives with Phase 4 backend — statuses above are display-only for now.
    </p>
  );
}
