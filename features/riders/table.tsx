'use client';

import Link from 'next/link';
import { TD, TH, THead, TR, Table } from '@/components/ui/table';
import type { Rider } from './api';
import { RiderStatusBadge } from './badge';

export function RiderTable({ riders }: { riders: Rider[] }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Phone</TH>
          <TH>Status</TH>
          <TH>Paid token</TH>
        </TR>
      </THead>
      <tbody>
        {riders.map((r) => (
          <TR key={r.id}>
            <TD>
              <Link className="font-medium underline-offset-4 hover:underline" href={`/riders/${r.id}`}>
                {r.name}
              </Link>
            </TD>
            <TD className="tabular-nums">{r.phone}</TD>
            <TD>
              <RiderStatusBadge status={r.status} />
            </TD>
            <TD>{r.paidToken ? 'Yes' : 'No'}</TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}
