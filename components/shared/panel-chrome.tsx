'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth-session';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Truck, Bike, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { QvekBrand, QvekMark } from './brand';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/riders', label: 'Riders', icon: Users },
  { href: '/fleet', label: 'Fleet', icon: Truck },
  { href: '/vehicles', label: 'Vehicles', icon: Bike },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function PanelChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-edge bg-card p-4 md:flex">
        <div className="px-2 pb-4">
          <QvekBrand />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <a
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted2 hover:bg-hover hover:text-ink',
                  active && 'bg-hover font-medium text-ink',
                )}
              >
                <n.icon className="size-4" /> {n.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              clearSession();
              qc.clear();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-edge bg-card px-4 py-2.5 md:px-6">
          <span className="flex items-center gap-2 md:hidden">
            <QvekMark size={22} />
            <span className="text-sm font-semibold">Qvek admin</span>
          </span>
          <p className="hidden text-sm text-muted2 md:block">Tuesday-to-Tuesday billing cycle</p>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
