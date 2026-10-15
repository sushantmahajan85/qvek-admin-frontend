'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search name, phone, vehicle…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
  }, [local, onChange]);
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted2" />
      <Input className="pl-9" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-edge py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-sm text-muted2">{hint}</p> : null}
    </div>
  );
}
