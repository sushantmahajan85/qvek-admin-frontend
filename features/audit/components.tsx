'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TD, TH, THead, TR, Table } from '@/components/ui/table';
import type { AuditEntry } from './api';

const FILTERS = ['all', 'rider', 'vehicle', 'payment', 'kyc', 'assignment', 'expense', 'rental'];

function detail(e: AuditEntry): string {
  const parts: string[] = [];
  if (e.reason) parts.push(e.reason);
  const after = e.after as Record<string, unknown> | null | undefined;
  if (after?.status) parts.push(`→ ${String(after.status)}`);
  return parts.join(' · ');
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>When</TH>
          <TH>Action</TH>
          <TH>Entity</TH>
          <TH>Detail</TH>
        </TR>
      </THead>
      <tbody>
        {entries.map((e) => (
          <TR key={e.id}>
            <TD className="whitespace-nowrap tabular-nums">{new Date(e.createdAt).toLocaleString('en-IN')}</TD>
            <TD>
              <Badge tone="slate">{e.action.replaceAll('_', ' ')}</Badge>
            </TD>
            <TD className="tabular-nums">
              {e.entity}/{e.entityId.slice(-6)}
            </TD>
            <TD className="max-w-xs truncate">{detail(e) || '—'}</TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}

export function AuditFilters({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={
            value === f
              ? 'rounded-full bg-graphite px-3 py-1 text-xs font-medium text-white'
              : 'rounded-full border border-edge bg-card px-3 py-1 text-xs font-medium text-muted2 hover:bg-hover'
          }
        >
          {f === 'all' ? 'All' : f}
        </button>
      ))}
    </div>
  );
}

export function AuditCard({ entries }: { entries: AuditEntry[] }) {
  const [filter, setFilter] = useState('all');
  const rows = entries.filter((e) => filter === 'all' || e.entity === filter);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <AuditFilters value={filter} onChange={setFilter} />
        <AuditTable entries={rows} />
      </CardContent>
    </Card>
  );
}
