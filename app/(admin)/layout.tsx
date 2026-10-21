'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { AdminProvider } from '@/components/qvek/admin-provider';
import { Shell } from '@/components/qvek/shell';
import { LiveDataProvider } from '@/features/live/provider';
import { isAuthed, subscribeAuth } from '@/lib/qvek/auth';

/** Authenticated area: redirects to /login without a session, otherwise loads live data and renders the chrome. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribeAuth, isAuthed, () => false);

  useEffect(() => {
    if (!authed) router.replace('/login');
  }, [authed, router]);

  if (!authed) return null;
  return (
    <LiveDataProvider>
      <AdminProvider>
        <Shell>{children}</Shell>
      </AdminProvider>
    </LiveDataProvider>
  );
}
