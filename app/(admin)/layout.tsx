'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AdminProvider } from '@/components/qvek/admin-provider';
import { Shell } from '@/components/qvek/shell';
import { LiveDataProvider } from '@/features/live/provider';
import { isAuthed, subscribeAuth } from '@/lib/qvek/auth';

/** Authenticated area: redirects to /login without a session, otherwise loads live data and renders the chrome. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribeAuth, isAuthed, () => false);
  // Wait for client mount before judging the session: during hydration
  // `authed` reads false and an eager redirect bounces reloads to /login,
  // which middleware then forwards to /dashboard (losing the page).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !authed) router.replace('/login');
  }, [ready, authed, router]);

  if (!ready || !authed) return null;
  return (
    <LiveDataProvider>
      <AdminProvider>
        <Shell>{children}</Shell>
      </AdminProvider>
    </LiveDataProvider>
  );
}
